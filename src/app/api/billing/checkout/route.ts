export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase-server'
import { stripe, isStripeEnabled, createCheckoutSession, getOrCreateCustomer } from '@/lib/stripe'
import { z } from 'zod'

const checkoutSchema = z.object({
  plan: z.enum(['pro', 'team']).default('pro'),
})

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}))
  const parsed = checkoutSchema.safeParse(body)
  const planId = parsed.success ? parsed.data.plan : 'pro'

  try {
    const adminClient = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', session.user.id)
      .single()

    let customerId = sub?.stripe_customer_id

    if (!customerId) {
      customerId = await getOrCreateCustomer(session.user.id, session.user.email ?? '')
      await adminClient.from('subscriptions').upsert({
        user_id: session.user.id,
        stripe_customer_id: customerId,
        plan: 'free_trial',
        status: 'trialing',
      }, { onConflict: 'user_id' })
    }

    const url = await createCheckoutSession({
      customerId,
      userId: session.user.id,
      planId,
      returnUrl: appUrl,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
