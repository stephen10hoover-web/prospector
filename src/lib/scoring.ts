import type { Business } from '@/types'

export const HIGH_TICKET_CATEGORIES = [
  'roofing',
  'roofers',
  'med spa',
  'med spas',
  'medspa',
  'medspas',
  'contractor',
  'contractors',
  'general contractor',
  'hvac',
  'plumber',
  'plumbing',
  'electrician',
  'electrical',
  'remodeling',
  'renovation',
  'landscaping',
  'landscape',
  'pest control',
  'dental',
  'dentist',
  'orthodontist',
  'chiropractor',
  'attorney',
  'law firm',
  'financial advisor',
]

export const CATEGORY_BONUSES = [
  'salon',
  'hair salon',
  'barber',
  'gym',
  'fitness',
  'restaurant',
  'cafe',
  'coffee',
  'auto repair',
  'mechanic',
  'real estate',
  'massage',
  'spa',
  'yoga',
  'pilates',
  'photography',
  'florist',
  'bakery',
  'cleaning',
  'daycare',
  'preschool',
]

const FRANCHISE_SIGNALS = [
  'mcdonald',
  'subway',
  'starbucks',
  'dunkin',
  'domino',
  'pizza hut',
  'kfc',
  'burger king',
  'wendy',
  'taco bell',
  'chick-fil-a',
  'sonic',
  'popeyes',
  'panda express',
  'jiffy lube',
  'midas',
  'anytime fitness',
  'planet fitness',
  'great clips',
  'supercuts',
  'sport clips',
  'the ups store',
  'h&r block',
  'liberty tax',
  'servpro',
]

export function calculateLeadScore(business: Partial<Business>): number {
  let score = 0

  const name = (business.name ?? '').toLowerCase()
  const category = (business.category ?? '').toLowerCase()

  const isFranchise = FRANCHISE_SIGNALS.some(
    (signal) => name.includes(signal)
  )
  if (isFranchise) {
    return 5
  }

  if (!business.has_website) {
    score += 50
  } else {
    const wqs = business.website_quality_score ?? 0
    if (wqs < 30) {
      score += 30
    } else if (wqs < 60) {
      score += 15
    }
  }

  const reviewCount = business.review_count ?? 0
  if (reviewCount > 100) {
    score += 20
  } else if (reviewCount > 50) {
    score += 10
  }

  const rating = business.rating ?? 0
  if (rating > 4.5) {
    score += 15
  } else if (rating > 4.0) {
    score += 8
  }

  const isHighTicket = HIGH_TICKET_CATEGORIES.some((cat) =>
    category.includes(cat)
  )
  if (isHighTicket) {
    score += 20
  } else {
    const hasCategoryBonus = CATEGORY_BONUSES.some((cat) =>
      category.includes(cat)
    )
    if (hasCategoryBonus) {
      score += 10
    }
  }

  return Math.min(100, Math.max(0, score))
}
