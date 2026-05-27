import Anthropic from '@anthropic-ai/sdk'
import type { Business, OutreachEmail } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Strip control characters and truncate to prevent prompt injection via business data
function sanitize(value: string | null | undefined, maxLen: number): string {
  if (!value) return ''
  return value.replace(/[\x00-\x1F\x7F]/g, ' ').slice(0, maxLen).trim()
}

const OUTREACH_SYSTEM_PROMPT = `You are an expert cold email specialist who writes highly personalized, conversion-focused outreach emails for digital marketing and web development agencies.

Your emails have these characteristics:
- Short, punchy subject lines (under 8 words)
- Opening line that demonstrates you researched the business specifically
- One clear problem you've identified (not a list of problems)
- One specific solution tied to a measurable outcome
- Social proof or credibility indicator
- Single, frictionless call-to-action
- Conversational but professional tone
- Under 180 words total body length

You identify opportunities based on:
- No website or poor website quality
- Low review count despite good ratings (untapped online reputation)
- High-ticket services with poor digital presence
- Businesses in competitive local markets

Always return valid JSON matching exactly this schema:
{
  "subject": "string",
  "body": "string",
  "talkingPoints": ["string", "string", "string"]
}

The talkingPoints array should contain 3 specific insights about why this business is a good opportunity.`

export async function generateOutreachEmail(business: Business): Promise<OutreachEmail> {
  const name = sanitize(business.name, 100)
  const category = sanitize(business.category, 80)
  const city = sanitize(business.city, 80)
  const state = sanitize(business.state, 50)

  const websiteStatus = business.has_website
    ? `has a website with a quality score of ${business.website_quality_score}/100`
    : 'has NO website'

  const websiteIssues =
    business.website_issues && business.website_issues.length > 0
      ? `Website issues detected: ${business.website_issues.map((i) => sanitize(i, 120)).join(', ')}.`
      : ''

  const userMessage = `Generate a cold outreach email for this business:

Business Name: ${name}
Category: ${category}
City: ${city}, ${state}
Google Rating: ${business.rating} stars
Number of Reviews: ${business.review_count}
Website Status: ${websiteStatus}
${websiteIssues}
Lead Score: ${business.lead_score}/100

Write a personalized email that addresses their specific situation. Return only the JSON object.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: OUTREACH_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  try {
    // Strip markdown code fences if present
    let raw = textContent.text.trim()
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    // Extract the outermost JSON object
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON found in response')
    const parsed = JSON.parse(raw.slice(start, end + 1)) as OutreachEmail

    if (!parsed.subject || !parsed.body) throw new Error('Missing required fields')

    return {
      subject: String(parsed.subject),
      body: String(parsed.body),
      talkingPoints: Array.isArray(parsed.talkingPoints) ? parsed.talkingPoints.map(String) : [],
    }
  } catch {
    // Last resort — return whatever text Claude gave us as the body
    return {
      subject: 'Quick question about your online presence',
      body: textContent.text,
      talkingPoints: [],
    }
  }
}

export async function qualifyLead(
  business: Partial<Business>
): Promise<{ score: number; reasoning: string }> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: [
      {
        type: 'text',
        text: `You are a lead qualification expert for a digital marketing agency. Score local businesses as potential clients on a scale of 0-100. Higher scores mean better opportunities (businesses that need and can afford digital marketing services). Return JSON: {"score": number, "reasoning": "string (1-2 sentences)"}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Qualify this lead:
Name: ${sanitize(business.name, 100)}
Category: ${sanitize(business.category, 80)}
City: ${sanitize(business.city, 80)}, ${sanitize(business.state, 50)}
Rating: ${business.rating} (${business.review_count} reviews)
Has Website: ${business.has_website}
Website Quality: ${business.website_quality_score}/100

Return only valid JSON.`,
      },
    ],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    return { score: 50, reasoning: 'Unable to qualify lead at this time.' }
  }

  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON')
    const parsed = JSON.parse(jsonMatch[0])
    return {
      score: Math.min(100, Math.max(0, parseInt(parsed.score) || 50)),
      reasoning: parsed.reasoning ?? '',
    }
  } catch {
    return { score: 50, reasoning: 'Unable to qualify lead at this time.' }
  }
}
