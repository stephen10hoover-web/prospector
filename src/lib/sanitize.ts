/**
 * Strips characters that could be used for email header injection:
 * carriage returns, line feeds, and null bytes.
 * Must be called on every email subject line before sending.
 */
export function sanitizeSubject(subject: string): string {
  return subject.replace(/[\r\n\x00]/g, '').trim()
}
