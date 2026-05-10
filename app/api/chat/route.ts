import { NextResponse } from 'next/server'
import { onVisitorMessage } from '@/lib/chat/auto-response'
import {
  createThread,
  getServerVisitorMeta,
  isDiscordConfigured,
  postToThread,
  type VisitorInfo,
} from '@/lib/chat/discord'
import { sanitizeMessage } from '@/lib/chat/sanitize'
import { getVisitorId, isBlocked } from '@/lib/chat/visitor'
import { getClientIP, rateLimit } from '@/lib/utils/rate-limit'

const CHAT_RATE = { limit: 10, windowSeconds: 60 }

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: unknown
      threadId?: string
      visitorInfo?: VisitorInfo
    }

    const result = sanitizeMessage(body.message)
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 400 })
    }

    if (!isDiscordConfigured()) {
      return NextResponse.json(
        { error: 'Chat not configured' },
        { status: 503 }
      )
    }

    const visitorId = getVisitorId(request)
    const ip = getClientIP(request)

    if (isBlocked(visitorId)) {
      return NextResponse.json(
        { error: 'You have been blocked from this chat.' },
        { status: 403 }
      )
    }

    const limitResult = rateLimit(`chat:${visitorId}`, CHAT_RATE)
    if (!limitResult.success) {
      return NextResponse.json(
        { error: `Slow down - try again in ${limitResult.resetIn}s.` },
        {
          status: 429,
          headers: { 'Retry-After': String(limitResult.resetIn) },
        }
      )
    }

    let currentThreadId = body.threadId

    // Only enrich on first message (creating thread). Avoids hitting ip-api on
    // every message - the thread embed only renders once anyway.
    const clientInfo: VisitorInfo = body.visitorInfo ?? {}
    let info: VisitorInfo = clientInfo
    if (!currentThreadId) {
      const serverMeta = await getServerVisitorMeta(request, ip)
      info = { ...clientInfo, ...serverMeta }
      currentThreadId = (await createThread(visitorId, ip, info)) ?? undefined
      if (!currentThreadId) {
        return NextResponse.json(
          { error: 'Failed to create thread' },
          { status: 502 }
        )
      }
    }

    let ok = await postToThread(currentThreadId, visitorId, result.cleaned)

    // If the thread was deleted/expired, create a fresh one and retry.
    if (!ok && body.threadId) {
      const serverMeta = await getServerVisitorMeta(request, ip)
      info = { ...clientInfo, ...serverMeta }
      currentThreadId = (await createThread(visitorId, ip, info)) ?? undefined
      if (currentThreadId) {
        ok = await postToThread(currentThreadId, visitorId, result.cleaned)
      }
    }

    if (!ok) {
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 502 }
      )
    }

    // Track for auto-response timer.
    if (currentThreadId) {
      onVisitorMessage(currentThreadId)
    }

    return NextResponse.json({ threadId: currentThreadId })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')
    const afterId = searchParams.get('after')

    if (!(threadId && isDiscordConfigured())) {
      return NextResponse.json({ messages: [] })
    }

    const visitorId = getVisitorId(request)
    if (isBlocked(visitorId)) {
      return NextResponse.json({ messages: [] })
    }

    const { messages } = await (
      await import('@/lib/chat/discord')
    ).fetchReplies(threadId, afterId)
    return NextResponse.json({ messages })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}
