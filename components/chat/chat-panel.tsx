'use client'

import cn from 'clsx'
import { useEffect, useRef, useState } from 'react'
import s from './chat-panel.module.css'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

const THREAD_STORAGE_KEY = 'sk-chat-thread-id'
const THREAD_TS_KEY = 'sk-chat-thread-ts'
const VISITOR_STORAGE_KEY = 'sk-chat-visitor-id'
const THREAD_TTL_MS = 60 * 60 * 1000 // 1 hour

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  let id = window.localStorage.getItem(VISITOR_STORAGE_KEY)
  if (!(id && /^v_[a-z0-9]{8,32}$/.test(id))) {
    const rand =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        : Math.random().toString(36).slice(2, 18).padEnd(16, '0')
    id = `v_${rand}`
    window.localStorage.setItem(VISITOR_STORAGE_KEY, id)
  }
  return id
}

function collectVisitorInfo() {
  // navigator.connection is non-standard (Chrome/Edge/Android) - typed loosely.
  const navAny = navigator as unknown as {
    connection?: {
      effectiveType?: string
      downlink?: number
      rtt?: number
      saveData?: boolean
    }
    userAgentData?: { platform?: string }
    languages?: readonly string[]
  }
  const conn = navAny.connection
  const connStr = conn
    ? [
        conn.effectiveType,
        conn.downlink ? `${conn.downlink}Mbps` : null,
        conn.rtt ? `${conn.rtt}ms RTT` : null,
        conn.saveData ? 'data-saver' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined

  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    languages: navAny.languages?.slice(0, 5).join(', '),
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    dpr: window.devicePixelRatio,
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
    platform: navAny.userAgentData?.platform ?? navigator.platform,
    online: navigator.onLine,
    cookiesEnabled: navigator.cookieEnabled,
    connection: connStr,
    referrer: document.referrer || undefined,
    page: window.location.pathname,
    userAgent: navigator.userAgent,
  }
}

// Notification sound using Web Audio API - gentle "ding" for new replies.
function playNotificationSound() {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as Record<string, unknown>).webkitAudioContext
    if (!AC) return
    const ctx = new (AC as typeof AudioContext)()
    ctx.resume().then(() => {
      const now = ctx.currentTime

      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08)
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.2)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.4)

      setTimeout(() => ctx.close(), 500)
    })
  } catch {
    /* no audio support */
  }
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const visitorIdRef = useRef<string>('')
  const isFirstMessageRef = useRef(true)

  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId()
    const saved = window.localStorage.getItem(THREAD_STORAGE_KEY)
    const savedTs = window.localStorage.getItem(THREAD_TS_KEY)
    if (saved) {
      const age = Date.now() - Number(savedTs || 0)
      if (age > THREAD_TTL_MS) {
        window.localStorage.removeItem(THREAD_STORAGE_KEY)
        window.localStorage.removeItem(THREAD_TS_KEY)
      } else {
        setThreadId(saved)
        isFirstMessageRef.current = false
      }
    }
  }, [])

  useEffect(() => {
    if (!threadId) return
    window.localStorage.setItem(THREAD_STORAGE_KEY, threadId)
    window.localStorage.setItem(THREAD_TS_KEY, String(Date.now()))
  }, [threadId])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // SSE stream for instant replies.
  useEffect(() => {
    if (!(isOpen && threadId)) {
      setConnected(false)
      return
    }

    const es = new EventSource(
      `/api/chat/stream?threadId=${encodeURIComponent(threadId)}`
    )

    es.addEventListener('hello', () => setConnected(true))

    es.addEventListener('message', (ev: MessageEvent<string>) => {
      try {
        const m = JSON.parse(ev.data) as {
          id: string
          content: string
          timestamp: string
        }
        if (seenIdsRef.current.has(m.id)) return
        seenIdsRef.current.add(m.id)

        // Play notification sound for new replies.
        playNotificationSound()

        setMessages((prev) => [
          ...prev,
          {
            id: m.id,
            text: m.content,
            isUser: false,
            timestamp: new Date(m.timestamp),
          },
        ])
      } catch {
        /* ignore malformed event */
      }
    })

    es.onerror = () => setConnected(false)

    return () => {
      es.close()
      setConnected(false)
    }
  }, [isOpen, threadId])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const payload: Record<string, unknown> = {
        message: text,
        threadId,
      }

      // Send visitor info with the first message so Discord thread shows details.
      if (isFirstMessageRef.current) {
        payload.visitorInfo = collectVisitorInfo()
        isFirstMessageRef.current = false
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Visitor-Id': visitorIdRef.current,
        },
        body: JSON.stringify(payload),
      })

      const data = (await res.json().catch(() => ({}))) as {
        threadId?: string
        error?: string
      }

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            text: data.error ?? "Couldn't send message. Try again!",
            isUser: false,
            timestamp: new Date(),
          },
        ])
        return
      }

      if (data.threadId && data.threadId !== threadId) {
        setThreadId(data.threadId)
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          text: "Couldn't send message. Try again!",
          isUser: false,
          timestamp: new Date(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <button
        className={s.overlay}
        type="button"
        tabIndex={-1}
        onClick={onClose}
        aria-label="Close chat overlay"
      />
      <div className={s.panel} data-lenis-prevent>
        <div className={s.header}>
          <div>
            <div className={s.headerTitle}>Chat with Sameera</div>
            <div className={s.headerSub}>
              {connected ? (
                <>
                  <span className={s.liveDot} />
                  Live · replies arrive instantly
                </>
              ) : (
                'Connecting...'
              )}
            </div>
          </div>
          <button
            className={s.closeBtn}
            onClick={onClose}
            type="button"
            aria-label="Close chat"
          >
            &times;
          </button>
        </div>

        <div className={s.messages}>
          {messages.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyIcon}>&#128049;</div>
              <div className={s.emptyText}>
                Hi! Send Sameera a message - she&apos;ll reply here in real
                time.
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(s.message, msg.isUser ? s.isUser : s.isBot)}
              >
                {msg.text}
                <div className={s.timestamp}>
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className={s.typing}>
              <div className={s.dot} />
              <div className={s.dot} />
              <div className={s.dot} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={s.inputArea}>
          <input
            ref={inputRef}
            className={s.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type a message..."
            disabled={sending}
          />
          <button
            className={s.sendBtn}
            onClick={handleSend}
            disabled={!input.trim() || sending}
            type="button"
          >
            Send
          </button>
        </div>
      </div>
    </>
  )
}
