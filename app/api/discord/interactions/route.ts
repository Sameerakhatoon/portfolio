/**
 * Discord Interactions endpoint.
 *
 * Receives slash commands from Discord and responds in the thread.
 * Set this URL as "Interactions Endpoint URL" in your Discord app settings:
 *   https://your-domain.com/api/discord/interactions
 *
 * Commands:
 *   /greet      - Friendly hello
 *   /intent     - Ask what they're looking for
 *   /contact    - Share your contact info
 *   /askcontact - Ask for their contact info
 *   /busy       - "I've seen your message" placeholder
 *   /thanks     - Thank you + goodbye
 *   /block      - Block the visitor in this thread (adds to env-based blocklist)
 */

import { NextResponse } from 'next/server'
import { PRESET_REPLIES } from '@/lib/chat/discord'
import { verifyDiscordSignature } from '@/lib/chat/discord-verify'

// Discord interaction types
const PING = 1
const APPLICATION_COMMAND = 2

// Discord response types
const PONG = 1
const CHANNEL_MESSAGE = 4

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

export async function POST(request: Request) {
  const signature = request.headers.get('x-signature-ed25519') ?? ''
  const timestamp = request.headers.get('x-signature-timestamp') ?? ''
  const body = await request.text()

  // Discord requires signature verification on every request.
  const valid = verifyDiscordSignature(body, signature, timestamp)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const interaction = JSON.parse(body) as {
    type: number
    data?: {
      name?: string
      options?: Array<{ name: string; value: string }>
    }
    channel_id?: string
    channel?: { name?: string }
  }

  // Discord sends a PING to verify the endpoint on setup.
  if (interaction.type === PING) {
    return NextResponse.json({ type: PONG })
  }

  if (interaction.type !== APPLICATION_COMMAND || !interaction.data?.name) {
    return NextResponse.json({ type: PONG })
  }

  const command = interaction.data.name
  const threadId = interaction.channel_id

  // Handle /block separately - it doesn't send a message to the visitor.
  if (command === 'block') {
    const visitorId = extractVisitorIdFromThreadName(interaction.channel?.name)
    if (!visitorId) {
      return NextResponse.json({
        type: CHANNEL_MESSAGE,
        data: {
          content:
            "Couldn't find a visitor ID in this thread name. Make sure you're running this inside a chat thread.",
          flags: 64, // Ephemeral - only you see this
        },
      })
    }

    return NextResponse.json({
      type: CHANNEL_MESSAGE,
      data: {
        content: `Visitor \`${visitorId}\` should be blocked.\n\nAdd this to your \`BLOCKED_VISITOR_IDS\` env var:\n\`\`\`\n${visitorId}\n\`\`\`\nThen restart the server / redeploy.`,
        flags: 64,
      },
    })
  }

  // Preset reply commands - send the message to the thread (visible to visitor).
  const presetKey = command === 'askcontact' ? 'askContact' : command
  const preset = PRESET_REPLIES[presetKey as keyof typeof PRESET_REPLIES]

  if (!preset) {
    return NextResponse.json({
      type: CHANNEL_MESSAGE,
      data: { content: `Unknown command: ${command}`, flags: 64 },
    })
  }

  if (!(threadId && BOT_TOKEN)) {
    return NextResponse.json({
      type: CHANNEL_MESSAGE,
      data: { content: 'Missing thread context or bot token.', flags: 64 },
    })
  }

  // Post the preset as a bot message in the thread (visitor will see it via SSE).
  const msgRes = await fetch(
    `https://discord.com/api/v10/channels/${threadId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${BOT_TOKEN}`,
      },
      body: JSON.stringify({ content: preset }),
    }
  )

  if (!msgRes.ok) {
    const err = await msgRes.text().catch(() => 'unknown')
    return NextResponse.json({
      type: CHANNEL_MESSAGE,
      data: { content: `Failed to send: ${err}`, flags: 64 },
    })
  }

  // Confirm to Sameera with an ephemeral response (only she sees this).
  return NextResponse.json({
    type: CHANNEL_MESSAGE,
    data: {
      content: `Sent **/${command}** preset to the visitor.`,
      flags: 64,
    },
  })
}

function extractVisitorIdFromThreadName(name?: string): string | null {
  if (!name) return null
  // Thread names look like: "v_9bbc27f48cae412f · Asia/Kolkata · 2026-05-08"
  const match = name.match(/^(?<vid>v_[a-z0-9]+)/i)
  return match?.groups?.vid ?? null
}
