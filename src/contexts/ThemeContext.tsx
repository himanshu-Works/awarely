import React, { createContext, useContext, useState, useEffect } from 'react'

export type ThemeMode = 'dark' | 'light'

export type PaletteKey = 'default' | 'ocean' | 'emerald' | 'amber' | 'amethyst'

export interface PaletteConfig {
  key: PaletteKey
  name: string
  accentColor: string
  accentHover: string
  accentMuted: string
  accentBorder: string
  ringColor: string
}

export const PALETTES: Record<PaletteKey, PaletteConfig> = {
  default: {
    key: 'default',
    name: 'Safety Orange (Awarely Pin)',
    accentColor: '#EB5E28',
    accentHover: '#D94E1B',
    accentMuted: 'rgba(235, 94, 40, 0.15)',
    accentBorder: 'rgba(235, 94, 40, 0.4)',
    ringColor: '#EB5E28',
  },
  ocean: {
    key: 'ocean',
    name: 'Sapphire Ocean',
    accentColor: '#2563EB',
    accentHover: '#1D4ED8',
    accentMuted: 'rgba(37, 99, 235, 0.15)',
    accentBorder: 'rgba(37, 99, 235, 0.4)',
    ringColor: '#2563EB',
  },
  emerald: {
    key: 'emerald',
    name: 'Nordic Emerald',
    accentColor: '#0D9488',
    accentHover: '#0F766E',
    accentMuted: 'rgba(13, 148, 136, 0.15)',
    accentBorder: 'rgba(13, 148, 136, 0.4)',
    ringColor: '#0D9488',
  },
  amber: {
    key: 'amber',
    name: 'Solar Amber',
    accentColor: '#D97706',
    accentHover: '#B45309',
    accentMuted: 'rgba(217, 119, 6, 0.15)',
    accentBorder: 'rgba(217, 119, 6, 0.4)',
    ringColor: '#D97706',
  },
  amethyst: {
    key: 'amethyst',
    name: 'Royal Amethyst',
    accentColor: '#7C3AED',
    accentHover: '#6D28D9',
    accentMuted: 'rgba(124, 58, 237, 0.15)',
    accentBorder: 'rgba(124, 58, 237, 0.4)',
    ringColor: '#7C3AED',
  },
}

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  palette: PaletteKey
  setPalette: (palette: PaletteKey) => void
  currentPaletteConfig: PaletteConfig
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'awarely_theme_mode'
const PALETTE_STORAGE_KEY = 'awarely_theme_palette'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') return saved
    } catch {
      // Ignore
    }
    return 'dark' // Awarely default trustworthy dark mode
  })

  const [palette, setPaletteState] = useState<PaletteKey>(() => {
    try {
      const saved = localStorage.getItem(PALETTE_STORAGE_KEY) as PaletteKey
      if (saved && PALETTES[saved]) return saved
    } catch {
      // Ignore
    }
    return 'default'
  })

  const currentPaletteConfig = PALETTES[palette] || PALETTES.default

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {}

    const root = document.documentElement
    root.dataset.theme = theme
    if (theme === 'light') {
      root.classList.remove('dark')
      root.classList.add('light')
      root.style.colorScheme = 'light'
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, palette)
    } catch {}

    const root = document.documentElement
    const p = currentPaletteConfig
    root.dataset.palette = palette
    root.style.setProperty('--color-accent', p.accentColor)
    root.style.setProperty('--color-accent-hover', p.accentHover)
    root.style.setProperty('--color-accent-muted', p.accentMuted)
    root.style.setProperty('--color-accent-border', p.accentBorder)
    root.style.setProperty('--brand-orange', p.accentColor)
    root.style.setProperty('--brand-orange-hover', p.accentHover)
    root.style.setProperty('--brand-orange-muted', p.accentMuted)
    root.style.setProperty('--brand-orange-border', p.accentBorder)
    root.style.setProperty('--focus-ring-color', p.ringColor)
  }, [palette, currentPaletteConfig])

  function setTheme(t: ThemeMode) {
    setThemeState(t)
  }

  function toggleTheme() {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  function setPalette(p: PaletteKey) {
    setPaletteState(p)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        palette,
        setPalette,
        currentPaletteConfig,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>')
  }
  return ctx
}
