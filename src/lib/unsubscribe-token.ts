const SECRET = process.env.UNSUBSCRIBE_SECRET
if (!SECRET) {
  throw new Error(
    'UNSUBSCRIBE_SECRET env var is not set. Generate one with: openssl rand -base64 32'
  )
}

async function hmac(message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Buffer.from(sig).toString('base64url')
}

// Tokens expire after 90 days — prevents indefinite replay of old unsubscribe links
const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000

export async function signUnsubscribeToken(email: string, userId: string): Promise<string> {
  // Embed expiry in the signed payload so forged tokens with wrong expiry are rejected
  const expiresAt = Date.now() + TOKEN_TTL_MS
  return hmac(`${email}:${userId}:${expiresAt}`) + '.' + expiresAt
}

export async function verifyUnsubscribeToken(
  email: string,
  userId: string,
  token: string
): Promise<boolean> {
  const dotIdx = token.lastIndexOf('.')
  if (dotIdx === -1) return false

  const sig = token.slice(0, dotIdx)
  const expiresAt = parseInt(token.slice(dotIdx + 1), 10)

  if (isNaN(expiresAt) || Date.now() > expiresAt) return false

  const expected = await hmac(`${email}:${userId}:${expiresAt}`)
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  }
  return diff === 0
}

export function buildUnsubscribeUrl(
  appUrl: string,
  email: string,
  userId: string,
  token: string
): string {
  const params = new URLSearchParams({ email, uid: userId, token })
  return `${appUrl}/unsubscribe?${params.toString()}`
}
