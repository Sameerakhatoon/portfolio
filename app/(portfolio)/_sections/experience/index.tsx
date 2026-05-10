'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'
import s from './experience.module.css'

gsap.registerPlugin(ScrollTrigger)

const EXPERIENCE = [
  {
    period: 'Aug 2025 - Present',
    company: 'Seaionl Inc',
    role: 'Software Engineer',
    description:
      'Developing CertPing, a distributed SaaS platform for PKI and certificate lifecycle automation across multi-cloud and on-prem environments. Building event-driven microservices for SSL/TLS operations with third-party API integrations, plus orchestration across notification, scheduling, monitoring, domain/DNS, billing, support, and auth systems.',
  },
  {
    period: 'May 2025 - Jul 2025',
    company: 'Athena Tech Systems',
    role: 'Software Engineer Intern',
    description:
      'Built a Java APM platform tracking JVM KPIs via a JMX/JFR-based sidecar agent and a Kafka pipeline backed by TimescaleDB and Redis, exposing telemetry to downstream dashboards.',
  },
  {
    period: 'Jun 2024 - Aug 2024',
    company: 'NIT Warangal',
    role: 'AI/ML Research Intern',
    description:
      'Built an end-to-end machine-learning pipeline for predicting expensive CFD simulations across 1,800+ runs. Achieved 99.99% accuracy with MAE of 0.00048 and MSE of 0.00057.',
  },
]

export function Experience() {
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

      const items = gsap.utils.toArray<HTMLElement>(`.${s.item}`)
      items.forEach((item, i) => {
        gsap.fromTo(
          item,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            delay: i * 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: item,
              start: 'top 85%',
            },
          }
        )
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className={s.section} id="experience">
      <div className={s.divider} />
      <div className={s.header}>
        <span className={s.label}>Experience</span>
      </div>
      <div className={s.timeline}>
        {EXPERIENCE.map((exp) => (
          <div key={exp.company} className={s.item}>
            <span className={s.period}>{exp.period}</span>
            <div className={s.info}>
              <h3 className={s.company}>{exp.company}</h3>
              <span className={s.role}>{exp.role}</span>
            </div>
            <p className={s.description}>{exp.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
