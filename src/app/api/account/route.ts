export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { stripe, isStripeEnabled } from '@/lib/stripe'

export async function DELETE() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = user.id
  const admin = createAdminClient()

  try {
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
          console.error('[account] Stripe cancel failed (continuing):', stripeErr)
        }
      }
    }

    // Fetch IDs needed for child-record deletes (Supabase JS doesn't support subqueries in .in())
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

    // Delete child records of businesses (referential order)
    if (bizIds.length > 0) {
      await admin.from('lead_notes').delete().in('lead_id', bizIds)
      await admin.from('lead_activities').delete().in('lead_id', bizIds)
      await admin.from('proposals').delete().in('business_id', bizIds)
      await admin.from('inbound_messages').delete().in('business_id', bizIds)
    }

    // Delete child records of sequences
    if (seqIds.length > 0) {
      await admin.from('sequence_enrollments').delete().in('sequence_id', seqIds)
      await admin.from('sequence_steps').delete().in('sequence_id', seqIds)
    }

    // Delete child records of outbound_webhooks
    if (hookIds.length > 0) {
      await admin.from('webhook_deliveries').delete().in('webhook_id', hookIds)
    }

    // Delete workspaces owned by this user (cascade members/invites via FK or explicit)
    if (wsIds.length > 0) {
      await admin.from('workspace_invites').delete().in('workspace_id', wsIds)
      await admin.from('workspace_members').delete().in('workspace_id', wsIds)
    }
    // Also remove this user from other workspaces they joined
    await admin.from('workspace_members').delete().eq('user_id', userId)

    // Delete top-level user-owned tables
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
    // consent_logs and processed_webhook_events are retained per privacy/billing policy

    // Delete the auth user last
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account] deletion error:', err)
    return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 })
  }
}
