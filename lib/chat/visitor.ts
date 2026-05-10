/**
 * Visitor identity for chat.
 *
 * Each visitor gets a stable random ID stored in their browser localStorage.
 * Used for: thread naming, rate limiting, blocklist.
 *
 * Falls back to IP-derived ID if the header is missing (older clients).
 */
import { getClientIP } from '@/lib/utils/rate-limit'

const VISITOR_HEADER = 'x-visitor-id'

/**
 * Resolve a visitor ID from the request.
 * Priority: client-supplied header → IP-derived fallback.
 */
export function getVisitorId(request: Request): string {
  const fromHeader = request.headers.get(VISITOR_HEADER)
  if (fromHeader && /^v_[a-z0-9]{8,32}$/.test(fromHeader)) {
    return fromHeader
  }
  const ip = getClientIP(request)
  return `ip_${ip.replace(/[^a-z0-9]/gi, '-').slice(0, 24)}`
}

/**
 * Parse the BLOCKED_VISITOR_IDS env var (comma-separated list).
 * Each entry is matched exactly against a visitor ID.
 */
export function isBlocked(visitorId: string): boolean {
  const list = process.env.BLOCKED_VISITOR_IDS ?? ''
  if (!list) return false
  return list
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(visitorId)
}

export const VISITOR_HEADER_NAME = VISITOR_HEADER
