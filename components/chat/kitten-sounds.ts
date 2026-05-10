let ctx: AudioContext | null = null

export function unlockAudio() {
  if (ctx) {
    // Already created, just make sure it's resumed
    if (ctx.state === 'suspended')
      ctx.resume().catch(() => {
        /* ignore */
      })
    return
  }
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as Record<string, unknown>).webkitAudioContext
    if (!AC) return
    ctx = new (AC as typeof AudioContext)()
    // Must resume in user gesture for iOS/Android
    ctx.resume().catch(() => {
      /* ignore */
    })
    // Play silent buffer to fully unlock on iOS Safari
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
  } catch {
    /* not supported */
  }
}

function ensureCtx(): AudioContext | null {
  if (!ctx) return null
  if (ctx.state === 'suspended')
    ctx.resume().catch(() => {
      /* ignore */
    })
  return ctx
}

function playTone(
  startHz: number,
  endHz: number,
  durationMs: number,
  vol = 0.25
) {
  const c = ensureCtx()
  if (!c) return

  const now = c.currentTime
  const dur = durationMs / 1000

  // Fundamental - triangle wave for softer cat-like tone
  const osc1 = c.createOscillator()
  osc1.type = 'triangle'
  osc1.frequency.setValueAtTime(startHz, now)
  osc1.frequency.linearRampToValueAtTime(endHz, now + dur)

  // 2nd harmonic for richness
  const osc2 = c.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(startHz * 2, now)
  osc2.frequency.linearRampToValueAtTime(endHz * 2, now + dur)

  // Vibrato LFO
  const lfo = c.createOscillator()
  lfo.frequency.value = 6
  const lfoGain = c.createGain()
  lfoGain.gain.value = startHz * 0.03
  lfo.connect(lfoGain)
  lfoGain.connect(osc1.frequency)

  // Envelope for fundamental
  const gain1 = c.createGain()
  gain1.gain.setValueAtTime(0.001, now)
  gain1.gain.linearRampToValueAtTime(vol, now + 0.02)
  gain1.gain.setValueAtTime(vol, now + dur * 0.6)
  gain1.gain.exponentialRampToValueAtTime(0.001, now + dur)

  // Envelope for harmonic
  const gain2 = c.createGain()
  gain2.gain.setValueAtTime(0.001, now)
  gain2.gain.linearRampToValueAtTime(vol * 0.3, now + 0.02)
  gain2.gain.exponentialRampToValueAtTime(0.001, now + dur)

  osc1.connect(gain1)
  osc2.connect(gain2)
  gain1.connect(c.destination)
  gain2.connect(c.destination)

  osc1.start(now)
  osc2.start(now)
  lfo.start(now)
  osc1.stop(now + dur)
  osc2.stop(now + dur)
  lfo.stop(now + dur)
}

// Short "mew" - quick up then down
export function mew() {
  const base = 700 + Math.random() * 200
  playTone(base, base * 1.5, 150, 0.2)
  setTimeout(() => playTone(base * 1.4, base * 0.9, 100, 0.12), 100)
}

// Classic "meow" - up then long down
export function meow() {
  const base = 500 + Math.random() * 100
  playTone(base, base * 1.6, 120, 0.25)
  setTimeout(() => playTone(base * 1.5, base * 0.5, 250, 0.25), 100)
}

// Big loud MEOW
export function bigMeow() {
  playTone(400, 900, 150, 0.35)
  setTimeout(() => playTone(850, 350, 350, 0.35), 120)
  setTimeout(() => playTone(400, 250, 150, 0.15), 420)
}

// Purr - low rumble
export function purr() {
  const c = ensureCtx()
  if (!c) return
  const now = c.currentTime

  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = 28

  const am = c.createOscillator()
  am.frequency.value = 14
  const amGain = c.createGain()
  amGain.gain.value = 0.5
  am.connect(amGain)

  const gain = c.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.1, now + 0.05)
  gain.gain.setValueAtTime(0.1, now + 0.5)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7)

  amGain.connect(gain.gain)
  osc.connect(gain)
  gain.connect(c.destination)

  osc.start(now)
  am.start(now)
  osc.stop(now + 0.7)
  am.stop(now + 0.7)
}

// Chirp - quick staccato
export function chirp() {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const f = 900 + Math.random() * 300
      playTone(f, f * 1.4, 50, 0.18)
    }, i * 80)
  }
}

// Trill - rolling mrrp
export function trill() {
  const c = ensureCtx()
  if (!c) return
  const now = c.currentTime

  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(400, now)
  osc.frequency.linearRampToValueAtTime(700, now + 0.15)
  osc.frequency.linearRampToValueAtTime(500, now + 0.3)

  const trem = c.createOscillator()
  trem.frequency.value = 28
  const tremGain = c.createGain()
  tremGain.gain.value = 0.4
  trem.connect(tremGain)

  const gain = c.createGain()
  tremGain.connect(gain.gain)
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.2, now + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(now)
  trem.start(now)
  osc.stop(now + 0.3)
  trem.stop(now + 0.3)
}

// Hiss
export function hiss() {
  const c = ensureCtx()
  if (!c) return
  const now = c.currentTime

  const buf = c.createBuffer(1, c.sampleRate * 0.2, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const src = c.createBufferSource()
  src.buffer = buf

  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 3000

  const gain = c.createGain()
  gain.gain.setValueAtTime(0.001, now)
  gain.gain.linearRampToValueAtTime(0.15, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

  src.connect(hp)
  hp.connect(gain)
  gain.connect(c.destination)
  src.start(now)
  src.stop(now + 0.2)
}

// Nyaa
export function nyaa() {
  const base = 550 + Math.random() * 50
  playTone(base * 0.8, base * 1.3, 100, 0.2)
  setTimeout(() => playTone(base * 1.2, base * 1.5, 200, 0.28), 80)
  setTimeout(() => playTone(base * 1.4, base * 0.8, 120, 0.12), 260)
}

const ALL = [mew, meow, chirp, trill, purr, nyaa] as const

export function randomSound() {
  ALL[Math.floor(Math.random() * ALL.length)]?.()
}
