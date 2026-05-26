export type OutreachStatus =
  | 'not_contacted'
  | 'generated'
  | 'sent'
  | 'replied'
  | 'interested'
  | 'closed'
  | 'not_interested'

export interface Business {
  id: string
  search_id: string
  user_id: string
  name: string
  category: string
  address: string
  city: string
  state: string
  phone: string | null
  email: string | null
  email_source: 'hunter' | 'pattern' | 'manual' | null
  email_confidence: number | null
  website_url: string | null
  google_maps_url: string | null
  review_count: number
  rating: number
  has_website: boolean
  website_quality_score: number
  website_issues: string[]
  lead_score: number
  outreach_status: OutreachStatus
  ai_score_reasoning: string | null
  created_at: string
  updated_at: string
}

export interface Search {
  id: string
  user_id: string
  category: string
  location: string
  radius: number
  result_count: number
  status: 'processing' | 'completed' | 'failed'
  created_at: string
}

export interface Subscription {
  plan: 'free' | 'pro'
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  current_period_end: string | null
  stripe_customer_id: string | null
}

export interface UsageStats {
  searches_count: number
  emails_sent_count: number
}

export interface OutreachLog {
  id: string
  business_id: string
  user_id: string
  type: 'email' | 'generated'
  subject: string | null
  body: string | null
  sent_to: string | null
  status: 'generated' | 'sent' | 'failed'
  created_at: string
}

export interface AiGeneration {
  id: string
  business_id: string
  user_id: string
  type: 'outreach_email' | 'lead_score'
  input: Record<string, unknown>
  output: Record<string, unknown>
  model: string
  created_at: string
}

export interface OutreachEmail {
  subject: string
  body: string
  talkingPoints: string[]
}

export interface WebsiteAnalysis {
  hasWebsite: boolean
  qualityScore: number
  issues: string[]
  ssl: boolean
  mobile: boolean
  hasContactForm: boolean
  domainAge: string | null
  framework: string | null
  summary: string
}

export interface RawBusiness {
  name: string
  category: string
  address: string
  city: string
  state: string
  phone: string | null
  website_url: string | null
  google_maps_url: string | null
  review_count: number
  rating: number
}

export interface DashboardStats {
  totalLeads: number
  emailsSent: number
  replies: number
  avgLeadScore: number
}
