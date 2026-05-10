import type { CSSProperties } from 'react'

const fonts = {
  mono: '--next-font-mono',
  display: '--next-font-display',
  body: '--next-font-body',
} as const

const typography: TypeStyles = {
  'test-mono': {
    'font-family': `var(${fonts.mono})`,
    'font-style': 'normal',
    'font-weight': 400,
    'line-height': '90%',
    'letter-spacing': '0em',
    'font-size': { mobile: 20, desktop: 24 },
  },
  'heading-xl': {
    'font-family': `var(${fonts.display})`,
    'font-style': 'normal',
    'font-weight': 300,
    'line-height': '88%',
    'letter-spacing': '-0.02em',
    'font-size': { mobile: 56, desktop: 120 },
  },
  'heading-lg': {
    'font-family': `var(${fonts.display})`,
    'font-style': 'normal',
    'font-weight': 300,
    'line-height': '90%',
    'letter-spacing': '-0.02em',
    'font-size': { mobile: 36, desktop: 72 },
  },
  'heading-md': {
    'font-family': `var(${fonts.display})`,
    'font-style': 'normal',
    'font-weight': 400,
    'line-height': '100%',
    'letter-spacing': '-0.01em',
    'font-size': { mobile: 24, desktop: 40 },
  },
  'body-lg': {
    'font-family': `var(${fonts.body})`,
    'font-style': 'normal',
    'font-weight': 400,
    'line-height': '150%',
    'letter-spacing': '0em',
    'font-size': { mobile: 16, desktop: 18 },
  },
  'body-sm': {
    'font-family': `var(${fonts.body})`,
    'font-style': 'normal',
    'font-weight': 400,
    'line-height': '140%',
    'letter-spacing': '0.01em',
    'font-size': { mobile: 13, desktop: 14 },
  },
  label: {
    'font-family': `var(${fonts.body})`,
    'font-style': 'normal',
    'font-weight': 500,
    'line-height': '100%',
    'letter-spacing': '0.08em',
    'font-size': { mobile: 11, desktop: 12 },
  },
} as const

export { fonts, typography }

// UTIL TYPES
type TypeStyles = Record<
  string,
  {
    'font-family': string
    'font-style': CSSProperties['fontStyle']
    'font-weight': CSSProperties['fontWeight']
    'line-height':
      | `${number}%`
      | { mobile: `${number}%`; desktop: `${number}%` }
    'letter-spacing':
      | `${number}em`
      | { mobile: `${number}em`; desktop: `${number}em` }
    'font-feature-settings'?: string
    'font-size': number | { mobile: number; desktop: number }
  }
>
