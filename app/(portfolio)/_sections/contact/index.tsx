'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'
import { Link } from '@/components/ui/link'
import s from './contact.module.css'

gsap.registerPlugin(ScrollTrigger)

export function Contact() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        `.${s.divider}`,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.2,
          ease: 'power3.inOut',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
        }
      )

      gsap.fromTo(
        [`.${s.heading}`, `.${s.subtext}`, `.${s.email}`, `.${s.links}`],
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className={s.section} id="contact">
      <div className={s.divider} />
      <h2 className={s.heading}>Let&apos;s Connect</h2>
      <p className={s.subtext}>
        Have a project in mind or just want to chat? I&apos;d love to hear from
        you.
      </p>
      <Link href="mailto:hittheresameera@gmail.com" className={s.email}>
        hittheresameera@gmail.com
      </Link>
      <div className={s.links}>
        <Link
          href="https://github.com/Sameerakhatoon"
          target="_blank"
          rel="noopener noreferrer"
          className={s.link}
        >
          GitHub
        </Link>
        <Link
          href="https://www.linkedin.com/in/sameera-khatoon/"
          target="_blank"
          rel="noopener noreferrer"
          className={s.link}
        >
          LinkedIn
        </Link>
        <Link
          href="https://sameerakhatoon.hashnode.dev/"
          target="_blank"
          rel="noopener noreferrer"
          className={s.link}
        >
          Blog
        </Link>
        <Link
          href="https://www.linkedin.com/in/sameera-khatoon/details/certifications/"
          target="_blank"
          rel="noopener noreferrer"
          className={s.link}
        >
          Certifications
        </Link>
        <Link
          href="https://drive.google.com/drive/u/0/folders/1DD0czYzGNqTSdi218girFlcJip7H2flB"
          target="_blank"
          rel="noopener noreferrer"
          className={s.link}
        >
          Resume
        </Link>
      </div>
    </section>
  )
}
