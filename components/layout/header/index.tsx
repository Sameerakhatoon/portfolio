'use client'

import cn from 'clsx'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef, useState } from 'react'
import { Link } from '@/components/ui/link'

gsap.registerPlugin(ScrollTrigger)

const NAV_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#experience', label: 'Experience' },
  { href: '#projects', label: 'Projects' },
  { href: '#contact', label: 'Contact' },
] as const

export function Header() {
  const headerRef = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 80,
      onUpdate: (self) => {
        setScrolled(self.progress > 0)
      },
    })

    return () => trigger.kill()
  }, [])

  return (
    <header
      ref={headerRef}
      className={cn(
        'fixed top-0 right-0 left-0 z-header flex items-center justify-between px-safe py-3 dt:py-4 transition-all duration-300',
        scrolled && 'bg-primary/80 backdrop-blur-md'
      )}
      style={{ zIndex: 'var(--z-header)' }}
    >
      <Link
        href="#hero"
        className="font-display text-contrast text-lg tracking-tight"
      >
        SK
      </Link>
      <nav className="flex flex-nowrap items-center gap-3 dt:gap-10">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-body text-secondary text-[0.65rem] dt:text-xs whitespace-nowrap uppercase tracking-widest opacity-70 transition-opacity hover:opacity-100"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
