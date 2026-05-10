/**
 * Server-Sent Events stream for instant chat replies.
 *
 * Client opens an EventSource to /api/chat/stream?threadId=...
 * Server polls Discord every 1.2s and pushes any new messages as SSE events.
 * Also triggers auto-response if Sameera doesn't reply within 45s.
 */

import {
  checkAutoResponse,
  onSameeraReply,
  sendAutoResponse,
} from '@/lib/chat/auto-response'
import { fetchReplies, isDiscordConfigured } from '@/lib/chat/discord'
import { getVisitorId, isBlocked } from '@/lib/chat/visitor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const POLL_INTERVAL_MS = 1200
const MAX_DURATION_MS = 50_000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const threadId = searchParams.get('threadId')

  if (!(threadId && isDiscordConfigured())) {
    return new Response('Not configured', { status: 503 })
  }

  const visitorId = getVisitorId(request)
  if (isBlocked(visitorId)) {
    return new Response('Blocked', { status: 403 })
  }

  const lastEventId =
    request.headers.get('last-event-id') ?? searchParams.get('after')
  let cursor: string | null = lastEventId

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const startedAt = Date.now()
      let closed = false

      const send = (event: string, data: unknown, id?: string) => {
        if (closed) return
        let payload = ''
        if (id) payload += `id: ${id}\n`
        payload += `event: ${event}\n`
        payload += `data: ${JSON.stringify(data)}\n\n`
        try {
          controller.enqueue(encoder.encode(payload))
        } catch {
          closed = true
        }
      }

      send('hello', { threadId, ts: Date.now() })

      const heartbeat = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(': hb\n\n'))
        } catch {
          closed = true
        }
      }, 15_000)

      const tick = async () => {
        if (closed) return
        if (Date.now() - startedAt > MAX_DURATION_MS) {
          send('reconnect', { reason: 'max-duration' })
          cleanup()
          return
        }
        try {
          const { messages, hasHumanReply } = await fetchReplies(
            threadId,
            cursor
          )

          if (hasHumanReply) {
            onSameeraReply(threadId)
          }

          if (messages.length > 0) {
            for (const m of messages) {
              send('message', m, m.id)
              cursor = m.id
            }
          }

          // Check if auto-response should fire (45s no reply from Sameera).
          const autoMsg = checkAutoResponse(threadId, hasHumanReply)
          if (autoMsg) {
            const sent = await sendAutoResponse(threadId, autoMsg)
            if (sent) {
              // The next poll tick will pick it up as a regular message from
              // the bot and deliver it to the visitor.
            }
          }
        } catch {
          // Swallow transient errors; next tick retries.
        }
      }

      const poll = setInterval(tick, POLL_INTERVAL_MS)
      void tick()

      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(poll)
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }

      request.signal.addEventListener('abort', cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
