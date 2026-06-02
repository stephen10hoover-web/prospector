export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { stripe, getPlanIdFromPriceId } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-server'
import { invalidateSubscriptionCache } from '@/lib/usage'
import {
  sendUpgradeConfirmation,
  sendSubscriptionCanceled,
  sendSubscriptionReactivated,
  sendDowngradeConfirmation,
  sendPaymentFailed1,
} from '@/lib/email-notifications'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Atomic idempotency guard: claim this event before any processing.
  // The UNIQUE constraint on event_id means only one concurrent delivery can
  // insert successfully — eliminating the TOCTOU race of a SELECT-then-INSERT
  // pattern. If the insert fails with a unique violation (23505), another delivery
  // already claimed it, so we acknowledge and exit.
  const { error: claimError } = await adminClient
    .from('processed_webhook_events')
    .insert({ event_id: event.id, event_type: event.type })

  if (claimError) {
    if (claimError.code === '23505') {
      // Already claimed by another delivery — acknowledge without re-processing
      return NextResponse.json({ received: true })
    }
    // Unexpected DB error — let Stripe retry rather than silently drop the event
    console.error('Webhook idempotency claim failed:', claimError)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.metadata?.userId
        // planId from metadata is a hint; we always verify against the actual
        // price ID on the subscription (Finding 3 — never trust metadata alone
        // for billing tier assignment).
        const metadataPlanId = (session.metadata?.planId as 'pro' | 'team') ?? 'pro'
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        if (!userId || !subscriptionId) break

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = subscription as any
        const periodEnd   = sub.current_period_end   as number | undefined
        const periodStart = sub.current_period_start as number | undefined

        // Derive plan from the authoritative price ID on the subscription object
        const priceId = sub.items?.data?.[0]?.price?.id as string | undefined
        const resolvedPlan = priceId ? getPlanIdFromPriceId(priceId) : metadataPlanId

        await adminClient.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: resolvedPlan,
          status: subscription.status as string,
          current_period_end:   periodEnd   ? new Date(periodEnd   * 1000).toISOString() : null,
          current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          trial_started_at: null, // paid plan — clear trial marker
        }, { onConflict: 'user_id' })
        // Bust the subscription cache so the next request sees the new plan immediately
        invalidateSubscriptionCache(userId)

        // Send upgrade confirmation (fire-and-forget — don't block webhook ack)
        const { data: authUser } = await adminClient.auth.admin.getUserById(userId)
        if (authUser.user?.email) {
          sendUpgradeConfirmation(userId, authUser.user.email, resolvedPlan as 'pro' | 'team').catch(() => null)
        }
        break
      }

      // customer.subscription.created fires when a subscription is first created
      // via the API (e.g. after a checkout). It carries the same shape as .updated.
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = event.data.object as any
        const customerId = subscription.customer as string

        const { data: sub } = await adminClient
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!sub) break

        // Determine plan from price ID on the subscription
        const priceId = subscription.items?.data?.[0]?.price?.id as string | undefined
        const plan = event.type === 'customer.subscription.deleted'
          ? 'free_trial'
          : (priceId ? getPlanIdFromPriceId(priceId) : 'pro')

        const status = event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : subscription.status

        const prevAttr = event.data.previous_attributes as Record<string, unknown> | undefined

        await adminClient.from('subscriptions').update({
          plan,
          status,
          current_period_end:   new Date(subscription.current_period_end   * 1000).toISOString(),
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          // Preserve cancellation intent; always false on deletion (already canceled)
          cancel_at_period_end: event.type === 'customer.subscription.deleted'
            ? false
            : (subscription.cancel_at_period_end ?? false),
        }).eq('stripe_customer_id', customerId)
        // Bust the subscription cache so the next request sees the updated plan
        invalidateSubscriptionCache(sub.user_id)

        // Fire-and-forget notification emails
        const { data: authUser2 } = await adminClient.auth.admin.getUserById(sub.user_id)
        const userEmail = authUser2.user?.email
        if (userEmail) {
          if (event.type === 'customer.subscription.deleted') {
            const periodEnd = new Date(subscription.current_period_end * 1000)
            sendSubscriptionCanceled(sub.user_id, userEmail, periodEnd).catch(() => null)
          } else if (event.type === 'customer.subscription.updated') {
            // Reactivation: cancel_at_period_end flipped from true → false
            if (prevAttr?.cancel_at_period_end === true && subscription.cancel_at_period_end === false) {
              sendSubscriptionReactivated(sub.user_id, userEmail).catch(() => null)
            }
            // Plan change: price ID changed
            const prevItems = prevAttr?.items as { data?: { price?: { id?: string } }[] } | undefined
            const prevPriceId = prevItems?.data?.[0]?.price?.id
            if (prevPriceId && priceId && prevPriceId !== priceId) {
              const prevPlan = getPlanIdFromPriceId(prevPriceId)
              const planRank: Record<string, number> = { free_trial: 0, pro: 1, team: 2 }
              if ((planRank[plan] ?? 0) > (planRank[prevPlan] ?? 0)) {
                sendUpgradeConfirmation(sub.user_id, userEmail, plan as 'pro' | 'team').catch(() => null)
              } else {
                sendDowngradeConfirmation(sub.user_id, userEmail, plan as 'pro' | 'free_trial').catch(() => null)
              }
            }
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        // Fires on every successful charge — initial and renewals.
        // On renewal, reset the usage bucket for the new billing period so
        // limits start fresh. Using ON CONFLICT DO NOTHING makes this safe
        // to process more than once (idempotent at the DB level too).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any
        const customerId = invoice.customer as string

        const { data: sub } = await adminClient
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!sub?.user_id) break

        const periodStart = invoice.period_start as number | undefined
        const periodEnd   = invoice.period_end   as number | undefined

        await adminClient.from('subscriptions').update({
          status: 'active',
          ...(periodStart ? { current_period_start: new Date(periodStart * 1000).toISOString() } : {}),
          ...(periodEnd   ? { current_period_end:   new Date(periodEnd   * 1000).toISOString() } : {}),
        }).eq('stripe_customer_id', customerId)

        // Seed a fresh usage row for the new billing month.
        // ON CONFLICT DO NOTHING keeps this idempotent — if the row already
        // exists (e.g. user signed up mid-month) we leave their counts alone.
        if (periodStart) {
          const d = new Date(periodStart * 1000)
          const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          await adminClient.from('usage').insert({
            user_id: sub.user_id,
            month: newMonth,
            searches_count: 0,
            emails_sent_count: 0,
          }).then(null, () => null) // suppress duplicate-key errors gracefully
        }
        break
      }

      case 'invoice.payment_failed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any
        // Mark past_due — getUserPlanStatus treats this as expired (access revoked).
        // This is intentional: past_due correctly restricts access until payment succeeds.
        await adminClient.from('subscriptions').update({
          status: 'past_due',
        }).eq('stripe_customer_id', invoice.customer)

        // Send payment failed email (first occurrence only — cron handles day-3 resend)
        const { data: subForPayment } = await adminClient
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', invoice.customer)
          .single()
        if (subForPayment?.user_id) {
          const { data: authUser3 } = await adminClient.auth.admin.getUserById(subForPayment.user_id)
          if (authUser3.user?.email) {
            sendPaymentFailed1(subForPayment.user_id, authUser3.user.email).catch(() => null)
          }
          // Bust cache so past_due status propagates immediately
          invalidateSubscriptionCache(subForPayment.user_id)
        }
        break
      }
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    // Delete the idempotency claim so Stripe can retry and the event is not permanently lost.
    await adminClient
      .from('processed_webhook_events')
      .delete()
      .eq('event_id', event.id)
      .then(null, () => null) // best-effort cleanup
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
