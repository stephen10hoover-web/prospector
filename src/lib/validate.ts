/**
 * Shared validation helpers used across API routes.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Returns true if the value is a valid UUID v4-style string.
 * Use this to validate route params like params.id before passing to DB queries.
 */
export function isUUID(value: string): boolean {
  return UUID_RE.test(value)
}
