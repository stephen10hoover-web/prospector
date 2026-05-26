export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { stripe, isStripeEnabled, createCheckoutSession, getOrCreateCustomer } from '@/lib/stripe'

export async function POST(_request: NextRequest) {
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  }

  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const adminClient = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Get or create subscription record to find existing customer
    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', session.user.id)
      .single()

    let customerId = sub?.stripe_customer_id

    if (!customerId) {
      customerId = await getOrCreateCustomer(session.user.id, session.user.email ?? '')
      // Upsert subscription row with customer ID
      await adminClient.from('subscriptions').upsert({
        user_id: session.user.id,
        stripe_customer_id: customerId,
        plan: 'free',
        status: 'active',
      }, { onConflict: 'user_id' })
    }

    const url = await createCheckoutSession({
      customerId,
      userId: session.user.id,
      userEmail: session.user.email ?? '',
      returnUrl: appUrl,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
