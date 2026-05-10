const colors = {
  black: '#0a0a08',
  white: '#e8e3d9',
  gold: '#c8a97e',
  red: '#e30613',
  blue: '#0070f3',
  green: '#00ff88',
  purple: '#7928ca',
  pink: '#ff0080',
} as const

const themeNames = ['light', 'dark', 'red', 'evil'] as const
const colorNames = ['primary', 'secondary', 'contrast'] as const

const themes = {
  light: {
    primary: colors.white,
    secondary: colors.black,
    contrast: colors.gold,
  },
  dark: {
    primary: colors.black,
    secondary: colors.white,
    contrast: colors.gold,
  },
  evil: {
    primary: colors.black,
    secondary: colors.gold,
    contrast: colors.white,
  },
  red: {
    primary: colors.gold,
    secondary: colors.black,
    contrast: colors.white,
  },
} as const satisfies Themes

export { colors, themeNames, themes }

// UTIL TYPES
export type Themes = Record<
  (typeof themeNames)[number],
  Record<(typeof colorNames)[number], string>
>
