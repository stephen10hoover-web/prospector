export interface EmailResult {
  email: string
  confidence: number // 0-100
  source: 'hunter' | 'pattern' | 'manual'
}

function extractDomain(url: string): string | null {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`
    const hostname = new URL(normalized).hostname
    return hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

async function findViaHunter(domain: string): Promise<EmailResult | null> {
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) return null

  try {
    const url = new URL('https://api.hunter.io/v2/domain-search')
    url.searchParams.set('domain', domain)
    url.searchParams.set('api_key', apiKey)
    url.searchParams.set('limit', '5')
    url.searchParams.set('type', 'personal')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url.toString(), { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) return null

    const data = await res.json()
    const emails: Array<{ value: string; confidence: number }> = data?.data?.emails ?? []

    if (emails.length === 0) return null

    const best = emails.sort((a, b) => b.confidence - a.confidence)[0]
    if (!best || best.confidence < 30) return null

    return {
      email: best.value,
      confidence: best.confidence,
      source: 'hunter',
    }
  } catch {
    return null
  }
}

export async function findBusinessEmail(
  websiteUrl: string | null
): Promise<EmailResult | null> {
  if (!websiteUrl) return null

  const domain = extractDomain(websiteUrl)
  if (!domain) return null

  const result = await findViaHunter(domain)
  return result
}
