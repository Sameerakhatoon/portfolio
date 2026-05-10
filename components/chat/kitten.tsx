'use client'

import cn from 'clsx'
import { useEffect, useRef, useState } from 'react'
import s from './kitten.module.css'

interface KittenProps {
  onClick: () => void
  unreadCount?: number
}

type AnimState =
  | 'idle'
  | 'jumping'
  | 'rolling'
  | 'spinning'
  | 'flopping'
  | 'zoomies'
  | 'headbanging'
  | 'vibrating'
  | 'loafing'
  | 'bigEyes'

const ANIM_STATES: Array<{ state: AnimState; duration: number }> = [
  { state: 'jumping', duration: 500 },
  { state: 'rolling', duration: 700 },
  { state: 'spinning', duration: 400 },
  { state: 'flopping', duration: 600 },
  { state: 'zoomies', duration: 600 },
  { state: 'headbanging', duration: 900 },
  { state: 'vibrating', duration: 500 },
  { state: 'loafing', duration: 800 },
  { state: 'bigEyes', duration: 600 },
]

const SOUND_NAMES = [
  'mew',
  'meow',
  'bigMeow',
  'chirp',
  'trill',
  'nyaa',
  'purr',
] as const

export function Kitten({ onClick, unreadCount = 0 }: KittenProps) {
  const [isBlinking, setIsBlinking] = useState(false)
  const [animState, setAnimState] = useState<AnimState>('idle')
  const [showTooltip, setShowTooltip] = useState(false)
  const animatingRef = useRef(false)
  const audioUnlockedRef = useRef(false)
  const soundsRef = useRef<typeof import('./kitten-sounds') | null>(null)

  // Load sounds module eagerly
  useEffect(() => {
    let cancelled = false
    import('./kitten-sounds').then((mod) => {
      if (!cancelled) soundsRef.current = mod
    })
    return () => {
      cancelled = true
    }
  }, [])

  function doUnlock() {
    if (audioUnlockedRef.current) return
    audioUnlockedRef.current = true
    soundsRef.current?.unlockAudio()
  }

  function playSound(name: string) {
    const mod = soundsRef.current
    if (!(mod && audioUnlockedRef.current)) return
    // Also re-call unlock to resume if suspended
    mod.unlockAudio()
    const fn = mod[name as keyof typeof mod]
    if (typeof fn === 'function') fn()
  }

  function triggerRandomAnim() {
    if (animatingRef.current) return
    const pick = ANIM_STATES[Math.floor(Math.random() * ANIM_STATES.length)]!
    animatingRef.current = true
    setAnimState(pick.state)

    playSound(SOUND_NAMES[Math.floor(Math.random() * SOUND_NAMES.length)]!)

    setTimeout(() => {
      setAnimState('idle')
      animatingRef.current = false
    }, pick.duration)
  }

  // Blink every 2–4s
  useEffect(() => {
    const id = setInterval(
      () => {
        setIsBlinking(true)
        setTimeout(() => setIsBlinking(false), 150)
      },
      2500 + Math.random() * 1500
    )
    return () => clearInterval(id)
  }, [])

  // Idle brainrot - fires every 3.5s, works on desktop AND phone
  useEffect(() => {
    const id = setInterval(() => {
      if (!animatingRef.current) {
        const pick =
          ANIM_STATES[Math.floor(Math.random() * ANIM_STATES.length)]!
        animatingRef.current = true
        setAnimState(pick.state)

        // Only play sound if audio was already unlocked
        if (audioUnlockedRef.current && soundsRef.current) {
          const snd =
            SOUND_NAMES[Math.floor(Math.random() * SOUND_NAMES.length)]!
          const fn = soundsRef.current[snd as keyof typeof soundsRef.current]
          if (typeof fn === 'function') fn()
        }

        setTimeout(() => {
          setAnimState('idle')
          animatingRef.current = false
        }, pick.duration)
      }
    }, 3500)
    return () => clearInterval(id)
  }, [])

  // Show tooltip periodically on ALL devices
  useEffect(() => {
    const t1 = setTimeout(() => {
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 4000)
    }, 3000)

    const id = setInterval(() => {
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 3500)
    }, 20000)

    return () => {
      clearTimeout(t1)
      clearInterval(id)
    }
  }, [])

  function handleMouseEnter() {
    doUnlock()
    setShowTooltip(true)
    playSound('mew')
    if (!animatingRef.current && Math.random() < 0.5) {
      triggerRandomAnim()
    }
  }

  function handleMouseLeave() {
    setShowTooltip(false)
  }

  function handleClick() {
    doUnlock()
    setShowTooltip(false)
    playSound('bigMeow')
    // Fire spin animation in parallel; open chat immediately so user isn't blocked.
    if (!animatingRef.current) {
      animatingRef.current = true
      setAnimState('spinning')
      setTimeout(() => {
        setAnimState('idle')
        animatingRef.current = false
      }, 400)
    }
    onClick()
  }

  return (
    <button
      className={s.kitten}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Open chat with Sameera"
      type="button"
    >
      <div
        className={cn(
          s.body,
          animState === 'idle' && s.isIdle,
          animState === 'jumping' && s.isJumping,
          animState === 'rolling' && s.isRolling,
          animState === 'spinning' && s.isSpinning,
          animState === 'flopping' && s.isFlopping,
          animState === 'zoomies' && s.isZoomies,
          animState === 'headbanging' && s.isHeadbanging,
          animState === 'vibrating' && s.isVibrating,
          animState === 'loafing' && s.isLoafing,
          animState === 'bigEyes' && s.isBigEyes,
          isBlinking && s.isBlinking
        )}
      >
        <div className={s.head}>
          <div className={s.earLeft} />
          <div className={s.earRight} />
          <div className={s.earLeftInner} />
          <div className={s.earRightInner} />
          <div className={s.eyes}>
            <div className={s.eye} />
            <div className={s.eye} />
          </div>
          <div className={s.nose} />
          <div className={s.mouth} />
        </div>
        <div className={s.bodyShape}>
          <div className={s.stripes}>
            <div className={s.stripe} />
            <div className={s.stripe} />
            <div className={s.stripe} />
          </div>
        </div>
        <div className={s.tail} />
        <div className={s.paws}>
          <div className={s.paw} />
          <div className={s.paw} />
        </div>
      </div>
      {unreadCount > 0 && <span className={s.badge}>{unreadCount}</span>}
      {showTooltip && (
        <div className={s.tooltip}>Click to chat with Sameera!</div>
      )}
    </button>
  )
}
