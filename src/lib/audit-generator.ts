import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from './supabase-server'

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

export async function generateAuditReport(businessId: string, userId: string): Promise<AuditContent> {
  const supabase = createAdminClient()

  const { data: biz } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .eq('user_id', userId)
    .single()

  if (!biz) throw new Error('Business not found')

  const client = new Anthropic()

  function sp(val: string | null | undefined, max = 200): string {
    if (!val) return 'N/A'
    return val.replace(/[\x00-\x1F\x7F]/g, ' ').slice(0, max).trim()
  }

  const issues = (biz.website_issues ?? [])
    .slice(0, 10)
    .map((i: string) => sp(i, 150))
    .join(', ') || 'None'

  const prompt = `You are a professional web presence analyst. Generate a detailed audit report for this local business.

Business Details:
- Name: ${sp(biz.name, 100)}
- Category: ${sp(biz.category, 80)}
- Location: ${sp(biz.city, 80)}, ${sp(biz.state, 50)}
- Has Website: ${biz.has_website ? 'Yes' : 'No'}
- Website Quality Score: ${biz.website_quality_score}/100
- Issues Found: ${issues}
- Google Rating: ${biz.rating} (${biz.review_count} reviews)
- Lead Score: ${biz.lead_score}/100

Return a JSON object (no markdown, just raw JSON) with this exact structure:
{
  "overview": "2-3 sentence executive summary of the business's digital presence",
  "overallScore": <number 0-100>,
  "sections": [
    {
      "title": "Website Presence",
      "score": <0-100>,
      "status": "good|warning|critical",
      "findings": ["finding 1", "finding 2", "finding 3"]
    },
    {
      "title": "Online Reputation",
      "score": <0-100>,
      "status": "good|warning|critical",
      "findings": ["finding 1", "finding 2"]
    },
    {
      "title": "Digital Marketing",
      "score": <0-100>,
      "status": "good|warning|critical",
      "findings": ["finding 1", "finding 2"]
    },
    {
      "title": "Lead Opportunity",
      "score": <0-100>,
      "status": "good|warning|critical",
      "findings": ["finding 1", "finding 2"]
    }
  ],
  "recommendations": ["Top recommendation 1", "Recommendation 2", "Recommendation 3", "Recommendation 4", "Recommendation 5"]
}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  // Strip markdown code fences if present
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  const content: AuditContent = JSON.parse(jsonText)
  return content
}

export async function getOrCreateAudit(
  businessId: string,
  userId: string
): Promise<{ content: AuditContent; shareToken: string; generatedAt: string; isNew: boolean }> {
  const supabase = createAdminClient()

  // Check for existing report
  const { data: existing } = await supabase
    .from('audit_reports')
    .select('content, share_token, generated_at')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return {
      content: existing.content as AuditContent,
      shareToken: existing.share_token,
      generatedAt: existing.generated_at,
      isNew: false,
    }
  }

  // Generate new report
  const content = await generateAuditReport(businessId, userId)

  const { data: inserted } = await supabase
    .from('audit_reports')
    .upsert({ business_id: businessId, user_id: userId, content }, { onConflict: 'business_id,user_id' })
    .select('share_token, generated_at')
    .single()

  return {
    content,
    shareToken: inserted?.share_token ?? '',
    generatedAt: inserted?.generated_at ?? new Date().toISOString(),
    isNew: true,
  }
}
