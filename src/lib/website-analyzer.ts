import type { WebsiteAnalysis } from '@/types'

const MAX_HTML_BYTES = 500_000 // 500 KB — prevents memory DoS from huge pages

// SSRF guard: block private/loopback addresses and non-http(s) schemes
function isSsrfBlockedUrl(rawUrl: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return true
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true

  const host = parsed.hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '')

  // Loopback / localhost
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return true

  // IPv4 private ranges
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (a === 10) return true                          // 10.0.0.0/8
    if (a === 127) return true                         // 127.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true   // 172.16.0.0/12
    if (a === 192 && b === 168) return true            // 192.168.0.0/16
    if (a === 169 && b === 254) return true            // 169.254.0.0/16 (link-local)
    if (a === 100 && b >= 64 && b <= 127) return true  // 100.64.0.0/10 (CGNAT)
    if (a === 0) return true                           // 0.0.0.0/8
    if (a >= 240) return true                          // 240.0.0.0/4 (reserved)
  }

  return false
}

const FRAMEWORK_SIGNATURES: Record<string, string[]> = {
  WordPress: ['wp-content', 'wp-includes', 'wordpress'],
  Wix: ['wix.com', '_wix_', 'wixsite.com', 'X-Wix-Published-Version'],
  Squarespace: ['squarespace.com', 'static.squarespace.com', 'squarespace-cdn'],
  Shopify: ['cdn.shopify.com', 'myshopify.com', 'Shopify.theme'],
  Webflow: ['webflow.com', 'assets.website-files.com'],
  GoDaddy: ['godaddy.com', 'secureserver.net'],
  Weebly: ['weebly.com', 'editmysite.com'],
}

function detectFramework(html: string, headers: Headers): string | null {
  const lowerHtml = html.toLowerCase()

  for (const [framework, signals] of Object.entries(FRAMEWORK_SIGNATURES)) {
    if (signals.some((signal) => lowerHtml.includes(signal.toLowerCase()))) {
      return framework
    }
    const powered = headers.get('x-powered-by') ?? ''
    if (signals.some((signal) => powered.toLowerCase().includes(signal.toLowerCase()))) {
      return framework
    }
  }

  return null
}

function checkMobileReady(html: string): boolean {
  return (
    html.toLowerCase().includes('viewport') &&
    html.toLowerCase().includes('width=device-width')
  )
}

function checkContactForm(html: string): boolean {
  const lowerHtml = html.toLowerCase()
  return (
    lowerHtml.includes('<form') &&
    (lowerHtml.includes('contact') ||
      lowerHtml.includes('email') ||
      lowerHtml.includes('message') ||
      lowerHtml.includes('name'))
  )
}

function generateIssues(params: {
  ssl: boolean
  mobile: boolean
  hasContactForm: boolean
  framework: string | null
  html: string
}): string[] {
  const issues: string[] = []
  const lowerHtml = params.html.toLowerCase()

  if (!params.ssl) {
    issues.push('No SSL certificate (HTTP not HTTPS) — major trust and SEO issue')
  }
  if (!params.mobile) {
    issues.push('Not mobile-friendly — missing viewport meta tag')
  }
  if (!params.hasContactForm) {
    issues.push('No contact form detected — visitors have no easy way to reach you')
  }
  if (!lowerHtml.includes('<h1')) {
    issues.push('Missing H1 heading — hurts SEO')
  }
  if (!lowerHtml.includes('og:') && !lowerHtml.includes('twitter:')) {
    issues.push('No social media meta tags (Open Graph) — poor social sharing')
  }
  if (lowerHtml.includes('under construction') || lowerHtml.includes('coming soon')) {
    issues.push('Website appears to be under construction')
  }
  if (params.framework === 'Wix' || params.framework === 'Weebly') {
    issues.push(`Built on ${params.framework} — limited SEO capabilities and performance`)
  }

  return issues
}

function calculateQualityScore(params: {
  ssl: boolean
  mobile: boolean
  hasContactForm: boolean
  issues: string[]
  html: string
}): number {
  let score = 100
  const lowerHtml = params.html.toLowerCase()

  if (!params.ssl) score -= 25
  if (!params.mobile) score -= 20
  if (!params.hasContactForm) score -= 15
  if (!lowerHtml.includes('<h1')) score -= 10
  if (!lowerHtml.includes('og:')) score -= 5
  if (lowerHtml.includes('under construction') || lowerHtml.includes('coming soon')) score -= 30

  score -= Math.min(15, params.issues.filter((i) => !['ssl', 'mobile', 'contact'].some((k) => i.toLowerCase().includes(k))).length * 5)

  return Math.min(100, Math.max(0, score))
}

export async function analyzeWebsite(url: string | null): Promise<WebsiteAnalysis> {
  if (!url) {
    return {
      hasWebsite: false,
      qualityScore: 0,
      issues: ['No website found — huge opportunity to build online presence'],
      ssl: false,
      mobile: false,
      hasContactForm: false,
      domainAge: null,
      framework: null,
      summary: 'No website detected. This business has no online presence.',
    }
  }

  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

  // SSRF protection — reject private/loopback destinations
  if (isSsrfBlockedUrl(normalizedUrl)) {
    return {
      hasWebsite: false,
      qualityScore: 0,
      issues: ['Invalid or unreachable website URL'],
      ssl: false,
      mobile: false,
      hasContactForm: false,
      domainAge: null,
      framework: null,
      summary: 'Website URL is invalid or not publicly accessible.',
    }
  }

  const ssl = normalizedUrl.startsWith('https://')

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Prospector/1.0; +https://prospector.app)',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        hasWebsite: true,
        qualityScore: 10,
        issues: [`Website returned error status ${response.status}`],
        ssl,
        mobile: false,
        hasContactForm: false,
        domainAge: null,
        framework: null,
        summary: `Website exists but returned HTTP ${response.status}. May be down or misconfigured.`,
      }
    }

    // Cap payload to prevent memory DoS from huge pages
    const rawText = await response.text()
    const html = rawText.length > MAX_HTML_BYTES ? rawText.slice(0, MAX_HTML_BYTES) : rawText
    const headers = response.headers

    const mobile = checkMobileReady(html)
    const hasContactForm = checkContactForm(html)
    const framework = detectFramework(html, headers)
    const issues = generateIssues({ ssl, mobile, hasContactForm, framework, html })
    const qualityScore = calculateQualityScore({ ssl, mobile, hasContactForm, issues, html })

    const summary = issues.length === 0
      ? 'Website appears to be in good shape with no major issues detected.'
      : `Website has ${issues.length} issue${issues.length === 1 ? '' : 's'} detected: ${issues.slice(0, 2).join('; ')}${issues.length > 2 ? ` and ${issues.length - 2} more` : ''}.`

    return {
      hasWebsite: true,
      qualityScore,
      issues,
      ssl,
      mobile,
      hasContactForm,
      domainAge: null,
      framework,
      summary,
    }
  } catch (error) {
    const isTimeout =
      error instanceof Error && (error.name === 'AbortError' || error.message.includes('abort'))

    return {
      hasWebsite: true,
      qualityScore: 15,
      issues: [
        isTimeout
          ? 'Website is very slow to load (timeout) — major UX and SEO issue'
          : 'Website could not be reached — may be down or misconfigured',
      ],
      ssl,
      mobile: false,
      hasContactForm: false,
      domainAge: null,
      framework: null,
      summary: isTimeout
        ? 'Website timed out during analysis — indicates serious performance issues.'
        : 'Website could not be reached. It may be offline or have connectivity issues.',
    }
  }
}
