export interface SpamCheckResult {
  score: number // 0–100, higher = worse
  level: 'safe' | 'warning' | 'danger'
  issues: string[]
}

const SPAM_PHRASES = [
  'click here', 'act now', 'limited time', 'free offer', 'guaranteed',
  'no risk', 'winner', 'you have been selected', 'congratulations',
  'make money', 'earn extra', 'cash bonus', 'best price', 'incredible deal',
  'buy now', 'order now', 'call now', 'urgent', 'don\'t delete',
  'dear friend', 'million dollars', '100% free', 'absolutely free',
  'as seen on', 'double your', 'extra income', 'fast cash',
]

const SPAM_SUBJECT_PHRASES = [
  'RE:', 'FWD:', 'fw:', 'IMPORTANT', 'URGENT', '!!!', '???',
]

export function checkSpamScore(subject: string, body: string): SpamCheckResult {
  const issues: string[] = []
  let score = 0

  const lowerSubject = subject.toLowerCase()
  const lowerBody = body.toLowerCase()
  const combined = lowerSubject + ' ' + lowerBody

  // Subject line checks
  if (subject.length > 60) {
    issues.push('Subject line is too long (keep under 60 characters)')
    score += 8
  }
  if (subject === subject.toUpperCase() && subject.length > 4) {
    issues.push('Subject is ALL CAPS — major spam trigger')
    score += 20
  }
  const subjectExclamations = (subject.match(/!/g) ?? []).length
  if (subjectExclamations >= 2) {
    issues.push(`Subject has ${subjectExclamations} exclamation marks — reduce to 0-1`)
    score += subjectExclamations * 8
  }
  for (const phrase of SPAM_SUBJECT_PHRASES) {
    if (lowerSubject.includes(phrase.toLowerCase())) {
      issues.push(`Subject contains spam trigger: "${phrase}"`)
      score += 10
    }
  }

  // Body checks
  const bodyExclamations = (body.match(/!/g) ?? []).length
  if (bodyExclamations > 3) {
    issues.push(`Body has ${bodyExclamations} exclamation marks — keep under 3`)
    score += Math.min(15, (bodyExclamations - 3) * 3)
  }

  const capsWords = (body.match(/\b[A-Z]{4,}\b/g) ?? []).filter(
    (w) => !['HTML', 'URL', 'CTA', 'SEO', 'ROI', 'CTR'].includes(w)
  )
  if (capsWords.length > 2) {
    issues.push(`Body has ${capsWords.length} ALL-CAPS words — reduce them`)
    score += capsWords.length * 4
  }

  const linkCount = (body.match(/https?:\/\//g) ?? []).length
  if (linkCount > 3) {
    issues.push(`Body contains ${linkCount} links — keep to 1-2 max`)
    score += (linkCount - 3) * 6
  }

  for (const phrase of SPAM_PHRASES) {
    if (combined.includes(phrase)) {
      issues.push(`Contains spam phrase: "${phrase}"`)
      score += 12
    }
  }

  // Dollar signs
  const dollarCount = (combined.match(/\$/g) ?? []).length
  if (dollarCount > 1) {
    issues.push(`Contains ${dollarCount} dollar signs — reduce to 0-1`)
    score += dollarCount * 5
  }

  // Body too short or too long
  const wordCount = body.split(/\s+/).filter(Boolean).length
  if (wordCount < 20) {
    issues.push('Body is very short — add more context')
    score += 5
  }
  if (wordCount > 300) {
    issues.push('Body is very long (over 300 words) — trim for better deliverability')
    score += 8
  }

  const finalScore = Math.min(100, score)
  const level: SpamCheckResult['level'] =
    finalScore >= 50 ? 'danger' : finalScore >= 20 ? 'warning' : 'safe'

  return { score: finalScore, level, issues }
}
