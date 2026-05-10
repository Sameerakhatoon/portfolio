'use client'

import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import s from './hero.module.css'

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const roleRef = useRef<HTMLParagraphElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.fromTo(
        nameRef.current,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, delay: 0.3 }
      )
        .fromTo(
          roleRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 0.7, duration: 0.8 },
          '-=0.4'
        )
        .fromTo(
          scrollRef.current,
          { opacity: 0 },
          { opacity: 0.4, duration: 0.6 },
          '-=0.2'
        )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className={s.section} id="hero">
      <div className={s.content}>
        <h1 ref={nameRef} className={s.name}>
          Sameera
          <br />
          Khatoon
        </h1>
        <p ref={roleRef} className={s.role}>
          Software Engineer
        </p>
      </div>
      <div ref={scrollRef} className={s.scrollIndicator}>
        <div className={s.scrollLine} />
        <span className={s.scrollText}>Scroll</span>
      </div>
    </section>
  )
}
