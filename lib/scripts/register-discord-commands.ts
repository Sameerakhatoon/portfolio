#!/usr/bin/env bun
/**
 * One-time script to register Discord slash commands for the chat bot.
 *
 * Usage:
 *   bun run lib/scripts/register-discord-commands.ts
 *
 * Required env vars (reads from .env.local):
 *   DISCORD_APP_ID     - from Discord Developer Portal → General Information
 *   DISCORD_BOT_TOKEN  - from Discord Developer Portal → Bot → Reset Token
 *
 * After running, set the Interactions Endpoint URL in your Discord app:
 *   https://your-domain.com/api/discord/interactions
 *   (for local dev, use ngrok or similar to expose localhost)
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Load .env.local
const envPath = resolve(import.meta.dir, '../../.env.local')
try {
  const envFile = readFileSync(envPath, 'utf-8')
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
} catch {
  console.error('Could not read .env.local - make sure it exists')
}

const APP_ID = process.env.DISCORD_APP_ID
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

if (!(APP_ID && BOT_TOKEN)) {
  console.error(
    'Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN in .env.local\n\n' +
      'Get these from: https://discord.com/developers/applications\n' +
      '  DISCORD_APP_ID    → General Information → Application ID\n' +
      '  DISCORD_BOT_TOKEN → Bot → Reset Token\n'
  )
  process.exit(1)
}

const commands = [
  {
    name: 'greet',
    description: 'Send a friendly greeting to the visitor',
  },
  {
    name: 'intent',
    description: 'Ask the visitor what they are looking for',
  },
  {
    name: 'contact',
    description: 'Share your contact info with the visitor',
  },
  {
    name: 'askcontact',
    description: 'Ask the visitor for their contact info',
  },
  {
    name: 'busy',
    description:
      "Tell the visitor you've seen their message and will reply soon",
  },
  {
    name: 'thanks',
    description: 'Thank the visitor and say goodbye',
  },
  {
    name: 'block',
    description: 'Get instructions to block the visitor in this thread',
  },
]

console.log(
  `Registering ${commands.length} slash commands for app ${APP_ID}...\n`
)

const res = await fetch(
  `https://discord.com/api/v10/applications/${APP_ID}/commands`,
  {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${BOT_TOKEN}`,
    },
    body: JSON.stringify(commands),
  }
)

if (!res.ok) {
  const body = await res.text()
  console.error(`Failed (${res.status}): ${body}`)
  process.exit(1)
}

const registered = (await res.json()) as Array<{ name: string; id: string }>
console.log('Registered commands:')
for (const cmd of registered) {
  console.log(`  /${cmd.name}  (id: ${cmd.id})`)
}

console.log(
  '\nDone! Now set your Interactions Endpoint URL in Discord Developer Portal:\n' +
    '  → Your App → General Information → Interactions Endpoint URL\n' +
    '  → https://your-domain.com/api/discord/interactions\n\n' +
    'For local development, use ngrok:\n' +
    '  npx ngrok http 3000\n' +
    '  Then use the ngrok URL + /api/discord/interactions\n'
)
