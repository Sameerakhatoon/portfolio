'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'
import { Link } from '@/components/ui/link'
import s from './projects.module.css'

gsap.registerPlugin(ScrollTrigger)

const PROJECTS = [
  {
    title: 'SamOS',
    description:
      'A multitasking kernel with a bootloader, IDT, preemptive scheduler, 4-level paging, multi-arena heap, syscall layer, ELF64 loader, VFS with a FAT16 driver, PCIe ECAM (ACPI MCFG), NVMe + PATA disk drivers, PS/2 keyboard + mouse drivers, an event-driven window system, and a static userlib plus shell program.',
    tags: ['x86', 'C', 'NASM', 'UEFI', 'NVMe', 'QEMU'],
    href: 'https://github.com/Sameerakhatoon/SamOS',
  },
  {
    title: 'SamCompiler',
    description:
      'A C compiler with a custom lexer, preprocessor, recursive-descent parser, tag-union AST, semantic validator, identifier resolver, and an x86 code generator emitting NASM under the cdecl ABI.',
    tags: ['C', 'x86 NASM', 'cdecl', 'ELF32', 'Linux'],
    href: 'https://github.com/Sameerakhatoon/SamCompiler',
  },
  {
    title: 'SamTcpIp',
    description:
      'A userspace TCP/IP stack implementing ARP, IPv4, ICMP, UDP, TCP with congestion control, a Path MTU Discovery cache, and VLAN tagging on Linux TAP devices.',
    tags: ['C', 'TCP/IP', 'Linux TAP', 'pthread', 'libpcap'],
    href: 'https://github.com/Sameerakhatoon/SamTcpIp',
  },
  {
    title: 'SamDB',
    description:
      'A persistent database with a copy-on-write B+tree, durable two-phase commit, a page-organised free list, typed tables, secondary indexes, multi-statement ACID transactions, and MVCC snapshot isolation.',
    tags: ['C', 'B+tree', 'MVCC', 'ACID', 'SQL', 'mmap', 'POSIX'],
    href: 'https://github.com/Sameerakhatoon/SamDB',
  },
  {
    title: 'SamMLD',
    description:
      'A memory-leak detection tool that tracks dynamic allocations and identifies unreachable objects by analyzing object graphs, reporting leaks back to their source.',
    tags: ['C', 'Linked Lists', 'Hash Maps', 'Linux', 'GCC'],
    href: 'https://github.com/Sameerakhatoon/SamMLD',
  },
]

export function Projects() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(`.${s.card}`)

      cards.forEach((card) => {
        gsap.fromTo(
          card,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
            },
          }
        )
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className={s.section} id="projects">
      <div className={s.header}>
        <span className={s.label}>Selected Work</span>
        <span className={s.count}>
          ({String(PROJECTS.length).padStart(2, '0')})
        </span>
      </div>
      <div className={s.grid}>
        {PROJECTS.map((project) => (
          <Link
            key={project.title}
            href={project.href}
            target="_blank"
            rel="noopener noreferrer"
            className={s.card}
          >
            <div className={s.cardHeader}>
              <h3 className={s.cardTitle}>{project.title}</h3>
              <span className={s.arrow}>&#8599;</span>
            </div>
            <p className={s.cardDescription}>{project.description}</p>
            <div className={s.tags}>
              {project.tags.map((tag) => (
                <span key={tag} className={s.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
