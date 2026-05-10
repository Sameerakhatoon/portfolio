/**
 * Auto-response system.
 *
 * If Sameera doesn't reply within AUTO_DELAY_MS after the visitor's first message,
 * the bot sends a friendly response asking for more context and contact info.
 *
 * Tracks per-thread state in memory. Fine for dev + single-server Vercel deploys.
 */

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

const AUTO_DELAY_MS = 45_000 // 45 seconds

interface ThreadState {
  lastVisitorMsgAt: number
  autoSent: boolean
}

const threads = new Map<string, ThreadState>()

const AUTO_MESSAGES = [
  `Hey! Thanks for reaching out 🐱\n\nSameera's a bit busy right now, but she'll get back to you soon!\n\nIn the meantime, could you share:\n• **What brings you here?** (hiring, collaboration, freelance, just saying hi)\n• **Your email or LinkedIn** so she can follow up\n\nShe usually responds within a few hours!`,
]

export function onVisitorMessage(threadId: string) {
  const state = threads.get(threadId)
  if (!state) {
    threads.set(threadId, { lastVisitorMsgAt: Date.now(), autoSent: false })
  } else {
    state.lastVisitorMsgAt = Date.now()
    // DO NOT reset autoSent on subsequent visitor messages.
    // Previously this was set to false, causing the bot to re-fire its
    // "Sameera's busy" message every 45s after the visitor acknowledged it
    // — an infinite "unavailable" loop. Once the bot has spoken, it stays
    // quiet until checkAutoResponse explicitly re-arms it (which today
    // never happens; the bot fires once per thread, period).
  }
}

export function onSameeraReply(threadId: string) {
  const state = threads.get(threadId)
  if (state) {
    state.autoSent = true
  }
}

/**
 * Called from the SSE poll loop. Returns the message to send if auto-response
 * should fire, or null if not.
 */
export function checkAutoResponse(
  threadId: string,
  hasHumanReply: boolean
): string | null {
  const state = threads.get(threadId)
  if (!state) return null
  if (state.autoSent) return null
  if (hasHumanReply) {
    state.autoSent = true
    return null
  }

  const elapsed = Date.now() - state.lastVisitorMsgAt
  if (elapsed >= AUTO_DELAY_MS) {
    state.autoSent = true
    return AUTO_MESSAGES[0]!
  }
  return null
}

/**
 * Post the auto-response via Bot API (not webhook, so it shows as bot name).
 */
export async function sendAutoResponse(
  threadId: string,
  content: string
): Promise<boolean> {
  if (!BOT_TOKEN) return false
  const res = await fetch(
    `https://discord.com/api/v10/channels/${threadId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${BOT_TOKEN}`,
      },
      body: JSON.stringify({ content }),
    }
  )
  return res.ok
}

// Cleanup old entries periodically.
setInterval(() => {
  const cutoff = Date.now() - 3600_000
  for (const [id, state] of threads) {
    if (state.lastVisitorMsgAt < cutoff) threads.delete(id)
  }
}, 300_000)
