/**
 * Account deletion — shared logic used by both the self-serve
 * /api/account DELETE route and the admin console DELETE action.
 *
 * Deletes all user data in referential order, cancels active Stripe
 * subscriptions, and finally removes the Supabase Auth user.
 */

import { createAdminClient } from './supabase-server'
import { stripe, isStripeEnabled } from './stripe'
import { logAuditEvent } from './audit'

export interface DeleteAccountOptions {
  userId: string
  /** Who triggered the deletion — 'user' or admin email */
  deletedBy: string
}

export async function deleteUserAccount({ userId, deletedBy }: DeleteAccountOptions): Promise<void> {
  const admin = createAdminClient()

  // Cancel active Stripe subscription before wiping the DB record
  if (isStripeEnabled() && stripe) {
    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single()

    if (sub?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id)
      } catch (stripeErr) {
        console.error('[account-deletion] Stripe cancel failed (continuing):', stripeErr)
      }
    }
  }

  // Fetch IDs needed for child-record deletes
  const [{ data: bizRows }, { data: seqRows }, { data: hookRows }, { data: wsRows }] =
    await Promise.all([
      admin.from('businesses').select('id').eq('user_id', userId),
      admin.from('sequences').select('id').eq('user_id', userId),
      admin.from('outbound_webhooks').select('id').eq('user_id', userId),
      admin.from('workspaces').select('id').eq('created_by', userId),
    ])

  const bizIds = (bizRows ?? []).map((r) => r.id as string)
  const seqIds = (seqRows ?? []).map((r) => r.id as string)
  const hookIds = (hookRows ?? []).map((r) => r.id as string)
  const wsIds = (wsRows ?? []).map((r) => r.id as string)

  // Child records of businesses
  if (bizIds.length > 0) {
    await admin.from('lead_notes').delete().in('lead_id', bizIds)
    await admin.from('lead_activities').delete().in('lead_id', bizIds)
    await admin.from('proposals').delete().in('business_id', bizIds)
    await admin.from('inbound_messages').delete().in('business_id', bizIds)
  }

  // Child records of sequences
  if (seqIds.length > 0) {
    await admin.from('sequence_enrollments').delete().in('sequence_id', seqIds)
    await admin.from('sequence_steps').delete().in('sequence_id', seqIds)
  }

  // Child records of outbound_webhooks
  if (hookIds.length > 0) {
    await admin.from('webhook_deliveries').delete().in('webhook_id', hookIds)
  }

  // Workspaces owned by this user
  if (wsIds.length > 0) {
    await admin.from('workspace_invites').delete().in('workspace_id', wsIds)
    await admin.from('workspace_members').delete().in('workspace_id', wsIds)
  }
  // Remove this user from workspaces they joined
  await admin.from('workspace_members').delete().eq('user_id', userId)

  // Top-level user-owned records
  await admin.from('outreach_logs').delete().eq('user_id', userId)
  await admin.from('email_suppressions').delete().eq('user_id', userId)
  await admin.from('domain_suppressions').delete().eq('added_by', userId)
  await admin.from('audit_reports').delete().eq('user_id', userId)
  await admin.from('import_jobs').delete().eq('user_id', userId)
  await admin.from('sequences').delete().eq('user_id', userId)
  await admin.from('outbound_webhooks').delete().eq('user_id', userId)
  await admin.from('workspaces').delete().eq('created_by', userId)
  await admin.from('businesses').delete().eq('user_id', userId)
  await admin.from('searches').delete().eq('user_id', userId)
  await admin.from('user_profiles').delete().eq('id', userId)
  await admin.from('profiles').delete().eq('id', userId)
  await admin.from('subscriptions').delete().eq('user_id', userId)
  // consent_logs and processed_webhook_events retained per policy

  // Delete the auth user last
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw error

  // Audit the deletion
  await logAuditEvent({
    actorEmail: deletedBy,
    action: 'user.account.deleted',
    resourceType: 'user',
    resourceId: userId,
    metadata: { deleted_by: deletedBy },
    severity: deletedBy === 'user' ? 'info' : 'warning',
  })
}
