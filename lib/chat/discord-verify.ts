/**
 * Discord interaction signature verification using Node.js crypto.
 * Uses Ed25519 via createPublicKey + verify (works in both Node and Bun).
 */

import { createPublicKey, verify } from 'node:crypto'

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY ?? ''

// ASN.1 DER prefix for Ed25519 SubjectPublicKeyInfo
const ED25519_DER_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

let cachedKey: ReturnType<typeof createPublicKey> | null = null

function getKey() {
  if (cachedKey) return cachedKey
  if (!PUBLIC_KEY) return null
  const raw = Buffer.from(PUBLIC_KEY, 'hex')
  const der = Buffer.concat([ED25519_DER_PREFIX, raw])
  cachedKey = createPublicKey({ key: der, format: 'der', type: 'spki' })
  return cachedKey
}

export function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string
): boolean {
  if (!PUBLIC_KEY) return false
  try {
    const key = getKey()
    if (!key) return false
    return verify(
      null,
      Buffer.from(timestamp + body),
      key,
      Buffer.from(signature, 'hex')
    )
  } catch {
    return false
  }
}
