'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'
import s from './about.module.css'

gsap.registerPlugin(ScrollTrigger)

const SKILLS = [
  'Java',
  'SQL',
  'C',
  'Python',
  'Spring Boot',
  'Spring Security',
  'Spring Data JPA',
  'JUnit',
  'Mockito',
  'PostgreSQL',
  'MongoDB',
  'Redis',
  'Apache Kafka',
  'Docker',
  'Kubernetes',
  'Helm',
  'Argo CD',
  'Jenkins',
  'GitHub Actions',
  'GitLab CI/CD',
  'Azure',
  'Linux',
  'OAuth2',
  'JWT',
  'OIDC',
  'SAML',
  'SSO',
  'RBAC',
  'IAM',
  'SSL/TLS',
]

export function About() {
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
        `.${s.grid}`,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          },
        }
      )

      gsap.fromTo(
        `.${s.skill}`,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.05,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: `.${s.skills}`,
            start: 'top 85%',
          },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className={s.section} id="about">
      <div className={s.divider} />
      <div className={s.grid}>
        <span className={s.label}>About</span>
        <div>
          <div className={s.text}>
            <p>
              I&apos;m a software engineer with a B.Tech from NIT Warangal. I
              build distributed systems, microservices, and full-stack
              applications with a focus on reliability, security, and clean
              architecture.
            </p>
            <p>
              From certificate lifecycle management across multi-cloud
              environments to kernel development and compiler engineering, I
              care about software that works at every layer of the stack.
            </p>
          </div>
          <div className={s.skills}>
            {SKILLS.map((skill) => (
              <span key={skill} className={s.skill}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
