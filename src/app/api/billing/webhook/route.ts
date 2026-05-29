export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { stripe, getPlanIdFromPriceId } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-server'
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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.metadata?.userId
        const planId = (session.metadata?.planId as 'pro' | 'team') ?? 'pro'
        const subscriptionId = session.subscription as string
        const customerId = session.customer as string

        if (!userId || !subscriptionId) break

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const periodEnd = (subscription as any).current_period_end as number | undefined

        await adminClient.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: planId,
          status: subscription.status as string,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          trial_started_at: null, // paid plan — clear trial marker
        }, { onConflict: 'user_id' })
        break
      }

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

        await adminClient.from('subscriptions').update({
          plan,
          status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }).eq('stripe_customer_id', customerId)
        break
      }

      case 'invoice.payment_failed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any
        await adminClient.from('subscriptions').update({
          status: 'past_due',
        }).eq('stripe_customer_id', invoice.customer)
        break
      }
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    // Return 200 so Stripe doesn't retry — error is logged internally
  }

  return NextResponse.json({ received: true })
}
