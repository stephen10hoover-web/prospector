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

  const supabase = await createServerClient()
  const {
    data: { user },
    } = await supabase.auth.getUser()

  if (!user) {
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
      .eq('user_id', user!.id)
      .single()

    let customerId = sub?.stripe_customer_id

    if (!customerId) {
      customerId = await getOrCreateCustomer(user!.id, user.email ?? '')
      // Upsert subscription row with customer ID
      await adminClient.from('subscriptions').upsert({
        user_id: user!.id,
        stripe_customer_id: customerId,
        plan: 'free_trial',
        status: 'trialing',
      }, { onConflict: 'user_id' })
    }

    const url = await createCheckoutSession({
      customerId,
      userId: user!.id,
      userEmail: user.email ?? '',
      planId,
      returnUrl: appUrl,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout user' }, { status: 500 })
  }
}
