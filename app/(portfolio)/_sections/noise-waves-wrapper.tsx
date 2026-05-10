'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const NoiseWaves = dynamic(
  () =>
    import('@/components/effects/noise-waves').then((mod) => mod.NoiseWaves),
  { ssr: false }
)

export function NoiseWavesClient() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 800)
  }, [])

  return (
    <NoiseWaves
      lineCount={isMobile ? 10 : 18}
      pointsPerLine={isMobile ? 40 : 80}
      waveAmplitudeX={isMobile ? 32 : 64}
      waveAmplitudeY={isMobile ? 24 : 40}
    />
  )
}
