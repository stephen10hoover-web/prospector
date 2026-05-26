import Stripe from 'stripe'

export const FREE_LIMITS = {
  searches: 5,
  emails: 20,
  outreachGenerations: 20,
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export function isStripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID)
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
  userEmail: string
  returnUrl: string
}): Promise<string> {
  if (!stripe) throw new Error('Stripe not configured')

  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${params.returnUrl}/settings?upgraded=1`,
    cancel_url: `${params.returnUrl}/settings`,
    metadata: { userId: params.userId },
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
