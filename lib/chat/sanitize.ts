/**
 * Input sanitization for the chat system.
 *
 * Guards against:
 * - XSS in rendered output
 * - Discord mention exploits (@everyone, @here, role/user mentions)
 * - Excessively long or empty input
 * - Control characters used for spoofing
 *
 * Emojis are explicitly allowed.
 */

const DISCORD_MENTION_RE = /@(?<mention>everyone|here)/gi
const DISCORD_ROLE_RE = /<@[&!]?\d+>/g
const HTML_TAG_RE = /<\/?[a-z][^>]*>/gi
const REPEATED_NEWLINE_RE = /\n{4,}/g
const REPEATED_SPACE_RE = / {10,}/g

// Zero-width and control character code points to strip.
// Built as a Set to avoid invisible-character-in-regex issues.
const STRIP_CODEPOINTS = new Set([
  0x00,
  0x01,
  0x02,
  0x03,
  0x04,
  0x05,
  0x06,
  0x07,
  0x08, // C0 controls
  0x0b,
  0x0c,
  0x0e,
  0x0f,
  0x10,
  0x11,
  0x12,
  0x13,
  0x14,
  0x15,
  0x16,
  0x17,
  0x18,
  0x19,
  0x1a,
  0x1b,
  0x1c,
  0x1d,
  0x1e,
  0x1f,
  0x7f, // DEL
  0x200b, // zero-width space
  0x200c, // zero-width non-joiner
  0x200d, // zero-width joiner
  0x200e, // LTR mark
  0x200f, // RTL mark
  0x202a, // LTR embedding
  0x202b, // RTL embedding
  0x202c, // pop directional
  0x202d, // LTR override
  0x202e, // RTL override
  0x2060, // word joiner
  0x2061,
  0x2062,
  0x2063,
  0x2064, // invisible operators
  0xfeff, // byte order mark / zero-width no-break space
])

function stripInvisible(text: string): string {
  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0)
    if (cp !== undefined && !STRIP_CODEPOINTS.has(cp)) {
      out += ch
    }
  }
  return out
}

export interface SanitizeResult {
  ok: boolean
  cleaned: string
  reason?: string
}

export function sanitizeMessage(raw: unknown): SanitizeResult {
  if (typeof raw !== 'string') {
    return { ok: false, cleaned: '', reason: 'Message must be text.' }
  }

  let text = stripInvisible(raw)

  text = text.trim()
  if (text.length === 0) {
    return { ok: false, cleaned: '', reason: 'Message is empty.' }
  }
  if (text.length > 1000) {
    return {
      ok: false,
      cleaned: '',
      reason: 'Message too long (max 1000 characters).',
    }
  }

  text = text.replace(DISCORD_MENTION_RE, '`@$<mention>`')
  text = text.replace(DISCORD_ROLE_RE, '[mention]')
  text = text.replace(HTML_TAG_RE, '')
  text = text.replace(REPEATED_NEWLINE_RE, '\n\n\n')
  text = text.replace(REPEATED_SPACE_RE, '    ')

  return { ok: true, cleaned: text }
}
