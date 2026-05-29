import Stripe from 'stripe'
import type { PlanId } from './plans'

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export function isStripeEnabled(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    (process.env.STRIPE_PRO_PRICE_ID || process.env.STRIPE_TEAM_PRICE_ID)
  )
}

export function getPriceIdForPlan(planId: 'pro' | 'team'): string {
  if (planId === 'pro') {
    if (!process.env.STRIPE_PRO_PRICE_ID) throw new Error('STRIPE_PRO_PRICE_ID not configured')
    return process.env.STRIPE_PRO_PRICE_ID
  }
  if (!process.env.STRIPE_TEAM_PRICE_ID) throw new Error('STRIPE_TEAM_PRICE_ID not configured')
  return process.env.STRIPE_TEAM_PRICE_ID
}

/** Resolve which plan a Stripe price ID maps to. Falls back to 'pro' if unknown. */
export function getPlanIdFromPriceId(priceId: string): PlanId {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return 'team'
  return 'pro'
}

export async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  if (!stripe) throw new Error('Stripe not configured')
  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })
  return customer.id
}

export async function createCheckoutSession(params: {
  customerId: string
  userId: string
  planId: 'pro' | 'team'
  returnUrl: string
}): Promise<string> {
  if (!stripe) throw new Error('Stripe not configured')

  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: getPriceIdForPlan(params.planId), quantity: 1 }],
    success_url: `${params.returnUrl}/settings?upgraded=1`,
    cancel_url: `${params.returnUrl}/settings`,
    metadata: { userId: params.userId, planId: params.planId },
  })

  return session.url!
}

export async function createPortalSession(customerId: string, returnUrl: string): Promise<string> {
  if (!stripe) throw new Error('Stripe not configured')
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${returnUrl}/settings`,
  })
  return session.url
}
