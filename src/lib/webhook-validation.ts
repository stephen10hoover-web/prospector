// SSRF protection for user-supplied webhook URLs.
// Blocks non-HTTPS URLs and all private/loopback/link-local IP ranges.

const PRIVATE_IPV4_PATTERNS = [
  /^127\./,                          // loopback
  /^10\./,                           // RFC-1918 class A
  /^172\.(1[6-9]|2\d|3[01])\./,     // RFC-1918 class B
  /^192\.168\./,                     // RFC-1918 class C
  /^169\.254\./,                     // link-local / AWS metadata
  /^0\./,                            // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9]\d|1([01]\d|2[0-7]))\./,  // shared address (RFC 6598)
  /^192\.0\.2\./,                    // TEST-NET-1
  /^198\.51\.100\./,                 // TEST-NET-2
  /^203\.0\.113\./,                  // TEST-NET-3
  /^240\./,                          // reserved
]

const PRIVATE_IPV6_PATTERNS = [
  /^::1$/i,                          // loopback
  /^fc[0-9a-f]{2}:/i,               // unique local (fc00::/7)
  /^fd[0-9a-f]{2}:/i,               // unique local (fd00::/7)
  /^fe[89ab][0-9a-f]:/i,            // link-local (fe80::/10)
  /^::ffff:/i,                       // IPv4-mapped — re-check the embedded IPv4
]

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data',
])

/** Returns an error string if the URL is unsafe, or null if it is safe. */
export function validateWebhookUrl(rawUrl: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return 'Invalid URL'
  }

  if (parsed.protocol !== 'https:') {
    return 'Webhook URLs must use HTTPS'
  }

  const hostname = parsed.hostname.toLowerCase()

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return 'Webhook URL hostname is not allowed'
  }

  // Block bare IP addresses in private ranges
  if (PRIVATE_IPV4_PATTERNS.some((re) => re.test(hostname))) {
    return 'Webhook URL points to a private IP address'
  }
  if (PRIVATE_IPV6_PATTERNS.some((re) => re.test(hostname))) {
    return 'Webhook URL points to a private IP address'
  }

  return null
}
