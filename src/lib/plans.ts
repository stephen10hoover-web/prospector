// Central plan configuration — single source of truth for all limits.
// Add new plans here; everything else derives from this.

export type PlanId = 'free_trial' | 'pro' | 'team'

export const TRIAL_DAYS = 7

export interface PlanLimits {
  mileLimit: number
  searchLimit: number
  emailLimit: number
  generationLimit: number
  /** Whether limits reset weekly or monthly */
  period: 'week' | 'month'
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free_trial: {
    mileLimit: 20,
    searchLimit: 2,
    emailLimit: 10,
    generationLimit: 10,
    period: 'week',
  },
  pro: {
    mileLimit: 35,
    searchLimit: 40,
    emailLimit: 240,
    generationLimit: 240,
    period: 'month',
  },
  team: {
    mileLimit: 50,
    searchLimit: 168,
    emailLimit: 840,
    generationLimit: 840,
    period: 'month',
  },
}

export interface PlanMeta {
  id: PlanId
  name: string
  price: number | null
  priceLabel: string
  tagline: string
  recommended?: boolean
}

export const PLAN_META: Record<PlanId, PlanMeta> = {
  free_trial: {
    id: 'free_trial',
    name: 'Free Trial',
    price: null,
    priceLabel: 'Free',
    tagline: '7-day trial, no credit card required',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 24.99,
    priceLabel: '$24.99/mo',
    tagline: 'For individual freelancers',
    recommended: true,
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 79.99,
    priceLabel: '$79.99/mo',
    tagline: 'For growing agencies',
  },
}

export function isPaidPlan(planId: PlanId): boolean {
  return planId === 'pro' || planId === 'team'
}

export function planDisplayName(planId: PlanId): string {
  return PLAN_META[planId].name
}
