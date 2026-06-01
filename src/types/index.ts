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
  phone_source: 'google_maps' | 'manual' | 'import' | null
  phone_confidence: number | null
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
  pipeline_stage: string
  ai_score_reasoning: string | null
  import_job_id: string | null
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

export type { PlanId } from '@/lib/plans'

export interface Subscription {
  plan: import('@/lib/plans').PlanId
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'expired'
  current_period_end: string | null
  stripe_customer_id: string | null
  trial_days_remaining: number | null
  trial_expires_at: string | null
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
  open_count: number
  first_opened_at: string | null
  created_at: string
}

export interface AuditSection {
  title: string
  score: number
  status: 'good' | 'warning' | 'critical'
  findings: string[]
}

export interface AuditContent {
  overview: string
  overallScore: number
  sections: AuditSection[]
  recommendations: string[]
}

export interface AuditReport {
  content: AuditContent
  share_token: string
  generated_at: string
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

export interface Sequence {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
}

export interface SequenceStep {
  id: string
  sequence_id: string
  step_number: number
  delay_days: number
  subject: string
  body: string
  subject_b: string | null
  body_b: string | null
}

export interface SequenceEnrollment {
  id: string
  sequence_id: string
  business_id: string
  user_id: string
  current_step: number
  ab_variant: 'A' | 'B'
  status: 'active' | 'paused' | 'completed' | 'replied' | 'bounced' | 'cancelled'
  enrolled_at: string
  next_send_at: string
  completed_at: string | null
}

export interface UserProfile {
  email: string | null
  sending_email: string | null
  display_name: string | null
  physical_address: string | null
  booking_link: string | null
  workspace_id: string | null
}

export interface InboundMessage {
  id: string
  business_id: string
  user_id: string
  from_email: string
  from_name: string | null
  subject: string | null
  body: string
  message_id: string | null
  received_at: string
  read: boolean
}

export type LeadActivityType =
  | 'note_added'
  | 'note_updated'
  | 'note_deleted'
  | 'email_sent'
  | 'email_opened'
  | 'reply_received'
  | 'stage_changed'
  | 'status_changed'
  | 'call_logged'
  | 'task_completed'
  | 'imported'
  | 'proposal_sent'
  | 'proposal_viewed'
  | 'sequence_enrolled'
  | 'sequence_replied'
  | 'sequence_completed'

export interface LeadNote {
  id: string
  business_id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
}

export interface LeadActivity {
  id: string
  business_id: string
  user_id: string
  type: LeadActivityType
  metadata: Record<string, unknown>
  created_at: string
}

export interface ImportJob {
  id: string
  user_id: string
  filename: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_rows: number
  imported_rows: number
  skipped_rows: number
  error_message: string | null
  search_id: string | null
  created_at: string
  completed_at: string | null
}

export interface Proposal {
  id: string
  business_id: string
  user_id: string
  title: string
  content: ProposalContent
  share_token: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined'
  viewed_at: string | null
  view_count: number
  created_at: string
  updated_at: string
}

export interface ProposalContent {
  intro: string
  services: ProposalService[]
  packages: ProposalPackage[]
  about: string
  next_steps: string
}

export interface ProposalService {
  name: string
  description: string
  included: boolean
}

export interface ProposalPackage {
  name: string
  price: number
  billing: 'one_time' | 'monthly' | 'quarterly'
  features: string[]
  recommended: boolean
}

export interface ProposalTemplate {
  id: string
  user_id: string
  name: string
  content: ProposalContent
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  owner_id: string
  slug: string
  created_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  invited_by: string | null
  joined_at: string
}

export interface WorkspaceInvite {
  id: string
  workspace_id: string
  invited_by: string
  email: string
  role: 'admin' | 'member'
  token: string
  created_at: string
  expires_at: string
  accepted_at: string | null
}

export interface OutboundWebhook {
  id: string
  user_id: string
  url: string
  secret: string | null
  events: string[]
  active: boolean
  created_at: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  event: string
  payload: Record<string, unknown>
  status_code: number
  response_body: string | null
  success: boolean
  delivered_at: string
}

export interface EmailSuppression {
  id: string
  email: string
  user_id: string | null
  reason: 'unsubscribe' | 'bounce' | 'complaint' | 'manual' | string | null
  added_by: string | null
  created_at: string
}

export interface DomainSuppression {
  id: string
  domain: string
  reason: string | null
  created_at: string
}

export interface AbTestResult {
  variant: 'A' | 'B'
  sent: number
  opened: number
  replied: number
  openRate: number
  replyRate: number
}
