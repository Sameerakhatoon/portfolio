'use client'

import { useEffect, useRef } from 'react'
import s from './noise-waves.module.css'

// Perlin noise
class Grad {
  x: number
  y: number
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
  dot2(x: number, y: number) {
    return this.x * x + this.y * y
  }
}

const grad3 = [
  new Grad(1, 1),
  new Grad(-1, 1),
  new Grad(1, -1),
  new Grad(-1, -1),
  new Grad(1, 0),
  new Grad(-1, 0),
  new Grad(0, 1),
  new Grad(0, -1),
  new Grad(1, 1),
  new Grad(-1, 1),
  new Grad(1, -1),
  new Grad(-1, -1),
]

const p = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
  36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234,
  75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237,
  149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48,
  27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105,
  92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73,
  209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86,
  164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38,
  147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189,
  28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101,
  155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
  178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12,
  191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31,
  181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
  138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215,
  61, 156, 180,
]

const perm: number[] = []
const gradP: Grad[] = []

for (let i = 0; i < 512; i++) {
  const v = p[i & 255]!
  perm[i] = v
  gradP[i] = grad3[v % 12]!
}

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number) {
  return (1 - t) * a + t * b
}

function perlin2(x: number, y: number) {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255
  const xf = x - Math.floor(x)
  const yf = y - Math.floor(y)

  const n00 = gradP[X + perm[Y]!]!.dot2(xf, yf)
  const n01 = gradP[X + perm[Y + 1]!]!.dot2(xf, yf - 1)
  const n10 = gradP[X + 1 + perm[Y]!]!.dot2(xf - 1, yf)
  const n11 = gradP[X + 1 + perm[Y + 1]!]!.dot2(xf - 1, yf - 1)

  const u = fade(xf)
  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), fade(yf))
}

interface NoiseWavesProps {
  color?: string
  waveAmplitudeX?: number
  waveAmplitudeY?: number
  lineCount?: number
  pointsPerLine?: number
  speed?: number
}

export function NoiseWaves({
  color = 'rgba(200, 169, 126, 0.14)',
  waveAmplitudeX = 64,
  waveAmplitudeY = 40,
  lineCount = 18,
  pointsPerLine = 80,
  speed = 0.0004,
}: NoiseWavesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', s.svg ?? '')
    svg.setAttribute('preserveAspectRatio', 'none')
    container.appendChild(svg)

    const paths: SVGPathElement[] = []
    for (let i = 0; i < lineCount; i++) {
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      )
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', color)
      path.setAttribute('stroke-width', '1')
      svg.appendChild(path)
      paths.push(path)
    }

    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, touching: false }
    const hasHover = window.matchMedia('(hover: hover)').matches

    function onMouse(e: MouseEvent) {
      pointer.tx = e.clientX / window.innerWidth
      pointer.ty = e.clientY / window.innerHeight
    }

    function onTouchStart(e: TouchEvent) {
      pointer.touching = true
      const t = e.touches[0]
      if (t) {
        pointer.tx = t.clientX / window.innerWidth
        pointer.ty = t.clientY / window.innerHeight
      }
    }

    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0]
      if (t) {
        pointer.tx = t.clientX / window.innerWidth
        pointer.ty = t.clientY / window.innerHeight
      }
    }

    function onTouchEnd() {
      pointer.touching = false
    }

    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    let startTime = 0

    function tick(timestamp: number) {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime

      const w = window.innerWidth
      const h = window.innerHeight

      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)

      const time = elapsed * speed

      // Auto-drift when no pointer/touch
      const autoX = 0.5 + Math.sin(elapsed * 0.0003) * 0.35
      const autoY = 0.5 + Math.cos(elapsed * 0.00025) * 0.3

      if (!(pointer.touching || hasHover)) {
        pointer.tx = autoX
        pointer.ty = autoY
      }

      pointer.x += (pointer.tx - pointer.x) * 0.04
      pointer.y += (pointer.ty - pointer.y) * 0.04

      const influence = pointer.touching ? 45 : 20

      for (let i = 0; i < paths.length; i++) {
        const path = paths[i]!
        const baseY = (h / (lineCount + 1)) * (i + 1)
        let d = ''

        for (let j = 0; j <= pointsPerLine; j++) {
          const frac = j / pointsPerLine
          const x = frac * w

          const nx = perlin2(frac * 3 + time, i * 0.5 + 0.1)
          const ny = perlin2(frac * 2.5 + time * 0.7, i * 0.5 + 100.1)

          const dx = Math.abs(frac - pointer.x)
          const dy = Math.abs(baseY / h - pointer.y)
          const dist = Math.sqrt(dx * dx + dy * dy)
          const pEffect = Math.max(0, 1 - dist * 3) * influence

          const px = x + nx * waveAmplitudeX
          const py =
            baseY + ny * waveAmplitudeY + pEffect * Math.sin(frac * Math.PI)

          d += j === 0 ? `M${px} ${py}` : `L${px} ${py}`
        }

        path.setAttribute('d', d)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      svg.remove()
    }
  }, [lineCount, pointsPerLine, color, waveAmplitudeX, waveAmplitudeY, speed])

  return <div ref={containerRef} className={s.root} aria-hidden="true" />
}
