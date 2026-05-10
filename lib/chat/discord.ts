/**
 * Discord helpers for the chat integration.
 * Centralized so the message endpoint and the SSE stream share logic.
 */

interface DiscordMessage {
  id: string
  content: string
  timestamp: string
  author: { bot?: boolean; username?: string }
}

export interface ChatReply {
  id: string
  content: string
  timestamp: string
}

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

export function isDiscordConfigured(): boolean {
  return Boolean(WEBHOOK_URL)
}

/**
 * Visitor info - client signals + server-enriched geo/ISP.
 * Mirrors the overlay support-chat schema so every contact gives you the same
 * deep view (city, ISP, ASN, device, browser, viewport, network flags).
 */
export interface VisitorInfo {
  // Client-collected
  timezone?: string
  language?: string
  languages?: string
  screen?: string
  viewport?: string
  dpr?: number
  colorScheme?: string
  platform?: string
  online?: boolean
  cookiesEnabled?: boolean
  connection?: string
  referrer?: string
  page?: string
  userAgent?: string
  // Server-enriched (Vercel headers + ip-api.com)
  country?: string
  region?: string
  city?: string
  postal?: string
  geoTimezone?: string
  lat?: string
  lon?: string
  isp?: string
  asn?: string
  asOrg?: string
  proxy?: boolean
  hosting?: boolean
  mobile?: boolean
}

/**
 * Pull geo from Vercel's edge headers (free, no API call) and enrich with
 * ISP/ASN from ip-api.com (free, no key, ~45 req/min/IP).
 * Returns a partial VisitorInfo you merge with whatever the client sent.
 */
export async function getServerVisitorMeta(
  request: Request,
  ip: string
): Promise<Partial<VisitorInfo>> {
  const h = request.headers
  const decode = (v: string | null): string | undefined => {
    if (!v) return undefined
    try {
      return decodeURIComponent(v)
    } catch {
      return v
    }
  }
  const meta: Partial<VisitorInfo> = {}
  const set = <K extends keyof VisitorInfo>(
    key: K,
    value: VisitorInfo[K] | undefined | null
  ) => {
    if (value !== undefined && value !== null && value !== '') {
      meta[key] = value as VisitorInfo[K]
    }
  }
  set('country', h.get('x-vercel-ip-country'))
  set(
    'region',
    decode(h.get('x-vercel-ip-country-region')) ??
      decode(h.get('x-vercel-ip-country-region-name'))
  )
  set('city', decode(h.get('x-vercel-ip-city')))
  set('postal', h.get('x-vercel-ip-postal-code'))
  set('geoTimezone', h.get('x-vercel-ip-timezone'))
  set('lat', h.get('x-vercel-ip-latitude'))
  set('lon', h.get('x-vercel-ip-longitude'))

  // ISP / ASN - Vercel doesn't expose these; ip-api.com is free and fast.
  // Skip private/unknown IPs so we don't burn requests on dev traffic.
  const isPublic =
    ip &&
    ip !== 'unknown' &&
    !/^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd)/i.test(ip)
  if (isPublic) {
    try {
      const r = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting`,
        { signal: AbortSignal.timeout(1500) }
      )
      if (r.ok) {
        const j = (await r.json()) as {
          status?: string
          country?: string
          regionName?: string
          city?: string
          zip?: string
          lat?: number
          lon?: number
          timezone?: string
          isp?: string
          org?: string
          as?: string
          mobile?: boolean
          proxy?: boolean
          hosting?: boolean
        }
        if (j.status === 'success') {
          if (!meta.isp) set('isp', j.isp)
          if (!meta.asOrg) set('asOrg', j.org)
          if (!meta.asn) set('asn', j.as)
          if (!meta.country) set('country', j.country)
          if (!meta.region) set('region', j.regionName)
          if (!meta.city) set('city', j.city)
          if (!meta.postal) set('postal', j.zip)
          if (!meta.geoTimezone) set('geoTimezone', j.timezone)
          if (!meta.lat && j.lat != null) set('lat', String(j.lat))
          if (!meta.lon && j.lon != null) set('lon', String(j.lon))
          if (typeof j.mobile === 'boolean') meta.mobile = j.mobile
          if (typeof j.proxy === 'boolean') meta.proxy = j.proxy
          if (typeof j.hosting === 'boolean') meta.hosting = j.hosting
        }
      }
    } catch {
      // network/timeout - keep whatever Vercel gave us
    }
  }

  return meta
}

// Short, friendly OS/browser/device label from a UA string.
function summarizeUA(ua?: string): string | undefined {
  if (!ua) return undefined
  let os = 'Unknown OS'
  if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11'
  else if (/Windows NT 6\.3/i.test(ua)) os = 'Windows 8.1'
  else {
    const mac = ua.match(/Mac OS X ([\d_]+)/i)
    const android = ua.match(/Android ([\d.]+)/i)
    const ios = ua.match(/iPhone OS ([\d_]+)/i)
    if (mac?.[1]) os = `macOS ${mac[1].replace(/_/g, '.')}`
    else if (android?.[1]) os = `Android ${android[1]}`
    else if (ios?.[1]) os = `iOS ${ios[1].replace(/_/g, '.')}`
    else if (/Linux/i.test(ua)) os = 'Linux'
  }
  let browser = 'Unknown browser'
  const edge = ua.match(/Edg\/([\d.]+)/i)
  const chrome = ua.match(/Chrome\/([\d.]+)/i)
  const firefox = ua.match(/Firefox\/([\d.]+)/i)
  const safari = ua.match(/Version\/([\d.]+).*Safari/i)
  if (edge?.[1]) browser = `Edge ${edge[1]}`
  else if (chrome?.[1] && !/Edg\//.test(ua)) browser = `Chrome ${chrome[1]}`
  else if (firefox?.[1]) browser = `Firefox ${firefox[1]}`
  else if (safari?.[1]) browser = `Safari ${safari[1]}`
  const device = /iPhone/i.test(ua)
    ? 'iPhone'
    : /iPad/i.test(ua)
      ? 'iPad'
      : /Android/i.test(ua) && /Mobile/i.test(ua)
        ? 'Android phone'
        : /Android/i.test(ua)
          ? 'Android tablet'
          : 'Desktop'
  return `${os} · ${browser} · ${device}`
}

// Two-letter ISO country code → flag emoji (regional indicator chars).
function countryFlag(cc: string): string {
  if (!/^[A-Za-z]{2}$/.test(cc)) return ''
  const A = 0x1f1e6
  const a = 'A'.charCodeAt(0)
  return String.fromCodePoint(
    A + cc.toUpperCase().charCodeAt(0) - a,
    A + cc.toUpperCase().charCodeAt(1) - a
  )
}

function formatVisitorEmbed(visitorId: string, ip: string, info: VisitorInfo) {
  const fields: Array<{ name: string; value: string; inline: boolean }> = []

  // Identity
  fields.push({ name: 'Visitor ID', value: `\`${visitorId}\``, inline: true })
  fields.push({ name: 'IP', value: `\`${ip}\``, inline: true })

  // Location
  const locParts = [info.city, info.region, info.country].filter(Boolean)
  if (locParts.length) {
    const flag = info.country ? countryFlag(info.country) : ''
    fields.push({
      name: 'Location',
      value: `${flag} ${locParts.join(', ')}${info.postal ? ` · ${info.postal}` : ''}`.trim(),
      inline: true,
    })
  }
  if (info.geoTimezone || info.timezone) {
    fields.push({
      name: 'Timezone',
      value: info.geoTimezone ?? info.timezone ?? '-',
      inline: true,
    })
  }

  // Network
  if (info.isp || info.asOrg) {
    fields.push({
      name: 'ISP',
      value: info.isp ?? info.asOrg ?? '-',
      inline: true,
    })
  }
  if (info.asn) {
    fields.push({ name: 'ASN', value: info.asn, inline: true })
  }
  const netFlags = [
    info.mobile ? '📱 Mobile carrier' : null,
    info.proxy ? '🛡️ Proxy/VPN' : null,
    info.hosting ? '🏢 Hosting/DC' : null,
  ].filter(Boolean)
  if (netFlags.length) {
    fields.push({ name: 'Network flags', value: netFlags.join(' · '), inline: true })
  }
  if (info.connection) {
    fields.push({ name: 'Connection', value: info.connection, inline: true })
  }

  // Locale
  if (info.language || info.languages) {
    fields.push({
      name: 'Language',
      value: info.languages ?? info.language ?? '-',
      inline: true,
    })
  }

  // Device summary (parsed from UA)
  const ua = summarizeUA(info.userAgent)
  if (ua) {
    fields.push({ name: 'Device', value: ua, inline: false })
  }
  const displayBits = [
    info.screen ? `Screen ${info.screen}` : null,
    info.viewport ? `Viewport ${info.viewport}` : null,
    info.dpr ? `DPR ${info.dpr}` : null,
    info.colorScheme ? info.colorScheme : null,
    info.platform ? info.platform : null,
  ].filter(Boolean)
  if (displayBits.length) {
    fields.push({ name: 'Display', value: displayBits.join(' · '), inline: false })
  }

  // Page context
  if (info.page) {
    fields.push({ name: 'Landed on', value: info.page, inline: true })
  }
  if (info.referrer) {
    fields.push({
      name: 'Referrer',
      value: info.referrer.slice(0, 200),
      inline: true,
    })
  }

  // Lookup links
  const links: string[] = [
    `[ip-api](http://ip-api.com/json/${ip})`,
    `[ipinfo](https://ipinfo.io/${ip})`,
  ]
  if (info.lat && info.lon) {
    links.push(`[Map](https://www.google.com/maps?q=${info.lat},${info.lon})`)
  }
  fields.push({ name: 'Lookups', value: links.join(' · '), inline: false })

  // Raw UA (truncated to fit Discord's 1024-char field limit)
  if (info.userAgent) {
    fields.push({
      name: 'User-Agent (raw)',
      value: '`' + info.userAgent.slice(0, 1000) + '`',
      inline: false,
    })
  }

  return {
    title: `New visitor from portfolio`,
    color: 0xc8a97e,
    fields,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Create a Discord thread for a new visitor.
 *
 * Two paths:
 * 1. Forum channel webhook → `thread_name` on POST creates the thread inline.
 * 2. Regular text channel webhook → post the starter message, then call the
 *    Bot API to wrap a thread around it.
 */
export async function createThread(
  visitorId: string,
  ip: string,
  info: VisitorInfo
): Promise<string | null> {
  if (!WEBHOOK_URL) return null

  const threadName = `${visitorId} · ${info.timezone ?? 'Unknown TZ'} · ${new Date().toISOString().slice(0, 10)}`
  const embed = formatVisitorEmbed(visitorId, ip, info)

  // Try the forum-channel path first.
  const forumRes = await fetch(`${WEBHOOK_URL}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [embed],
      thread_name: threadName,
    }),
  })
  if (forumRes.ok) {
    const data = (await forumRes.json()) as { channel_id?: string }
    if (data.channel_id) return data.channel_id
  }

  // Fall back to the text-channel path: post the starter, then start a thread
  // on it via the Bot API. Requires DISCORD_BOT_TOKEN with Manage Threads.
  if (!BOT_TOKEN) return null

  const msgRes = await fetch(`${WEBHOOK_URL}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  })
  if (!msgRes.ok) return null

  const msgData = (await msgRes.json()) as {
    id?: string
    channel_id?: string
  }
  if (!(msgData.id && msgData.channel_id)) return null

  const threadRes = await fetch(
    `https://discord.com/api/v10/channels/${msgData.channel_id}/messages/${msgData.id}/threads`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${BOT_TOKEN}`,
      },
      body: JSON.stringify({ name: threadName, auto_archive_duration: 1440 }),
    }
  )
  if (!threadRes.ok) return null

  const threadData = (await threadRes.json()) as { id?: string }
  return threadData.id ?? null
}

export async function postToThread(
  threadId: string,
  visitorId: string,
  message: string
): Promise<boolean> {
  if (!WEBHOOK_URL) return false
  const res = await fetch(`${WEBHOOK_URL}?wait=true&thread_id=${threadId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: message,
      username: `Visitor (${visitorId})`,
    }),
  })
  return res.ok
}

/**
 * Fetch replies in a thread newer than `afterId` (Discord snowflake).
 * Returns both human (Sameera) and bot (auto-response) messages - the visitor
 * should see both. Filters out webhook posts from visitors.
 */
export async function fetchReplies(
  threadId: string,
  afterId: string | null
): Promise<{ messages: ChatReply[]; hasHumanReply: boolean }> {
  if (!BOT_TOKEN) return { messages: [], hasHumanReply: false }
  const params = new URLSearchParams({ limit: '20' })
  if (afterId) params.set('after', afterId)
  const res = await fetch(
    `https://discord.com/api/v10/channels/${threadId}/messages?${params}`,
    {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      cache: 'no-store',
    }
  )
  if (!res.ok) return { messages: [], hasHumanReply: false }
  const data = (await res.json()) as DiscordMessage[]

  // Visitor messages are posted via webhook with "Visitor (...)" username.
  // Everything else is either Sameera (human, not bot) or the auto-response bot.
  let hasHumanReply = false
  const messages = data
    .filter((m) => {
      const isVisitorWebhook = m.author.username?.startsWith('Visitor (')
      if (isVisitorWebhook) return false
      if (!m.content?.trim()) return false
      if (!m.author.bot) hasHumanReply = true
      return true
    })
    .map((m) => ({ id: m.id, content: m.content, timestamp: m.timestamp }))
    .reverse()

  return { messages, hasHumanReply }
}

/**
 * Preset quick-reply messages Sameera can trigger from Discord.
 * These are also available as Discord slash commands if you set up the bot.
 *
 * Usage in Discord: just type the shortcode (e.g., `/greet`) and the bot
 * replaces it. For now, these are documented for manual copy-paste.
 */
export const PRESET_REPLIES = {
  greet:
    'Hey there! Thanks for visiting my portfolio! How can I help you today? 😊',
  intent:
    "I'd love to help! Could you tell me a bit more about what you're looking for?\n\n• **Hiring** - full-time or contract opportunities\n• **Collaboration** - open source or project work\n• **Freelance** - a specific project you need built\n• **Just chatting** - always happy to connect!",
  contact:
    "Here's how you can reach me:\n\n📧 **Email:** hittheresameera@gmail.com\n💼 **LinkedIn:** linkedin.com/in/sameera-khatoon\n🐙 **GitHub:** github.com/Sameerakhatoon\n📝 **Blog:** sameerakhatoon.hashnode.dev\n🌐 **Website:** sameerakhatoon.me\n\nFeel free to reach out on any platform!",
  askContact:
    "I'd love to follow up properly! Could you share your:\n\n• **Email** or **LinkedIn** profile\n• What you're looking for (hiring, collab, freelance)\n• Any timeline or details\n\nI'll get back to you within 24 hours! 🐱",
  busy: "Thanks for your patience! I'm a bit tied up right now, but I've seen your message and will respond properly soon. In the meantime, feel free to share more details or your contact info!",
  thanks:
    "Thank you so much for reaching out! It was great chatting with you. Don't hesitate to come back anytime! 🐱✨",
} as const
