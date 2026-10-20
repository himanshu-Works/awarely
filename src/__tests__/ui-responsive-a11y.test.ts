import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Alert } from '@/components/design-system/Alert'
import { EmptyState } from '@/components/design-system/EmptyState'
import { Skeleton, CardSkeleton } from '@/components/design-system/Skeleton'
import { Button } from '@/components/design-system/Button'

describe('Awarely UI, Responsive Layout & Accessibility Test Suite', () => {
  // -- 1. RESPONSIVE BREAKPOINT & SHELL DESIGN TOKENS ---------------------
  describe('1. Responsive Layout & Breakpoints', () => {
    const appShellPath = path.resolve(__dirname, '../components/navigation/AppShell.tsx')
    const appShellContent = fs.readFileSync(appShellPath, 'utf-8')

    it('implements responsive desktop navigation (sidebar visible on md and lg screens)', () => {
      // Desktop sidebar must be hidden on mobile (< 768px) and flex on md: screens
      expect(appShellContent).toContain('hidden md:flex w-64')
      expect(appShellContent).toContain('border-r border-[#1E3550]')
    })

    it('implements mobile bottom navigation bar (visible only below md breakpoint)', () => {
      // Mobile bottom bar must be md:hidden and fixed to viewport bottom
      expect(appShellContent).toContain('md:hidden fixed bottom-0')
      expect(appShellContent).toContain('aria-label="Mobile Bottom Navigation"')
    })

    it('implements expandable mobile drawer / sheet for full module navigation', () => {
      expect(appShellContent).toContain('mobileMenuOpen')
      expect(appShellContent).toContain('max-h-[85vh]')
      expect(appShellContent).toContain('rounded-t-3xl')
    })

    it('ensures main viewport applies responsive bottom padding to prevent mobile bottom-nav overlap', () => {
      expect(appShellContent).toContain('pb-20 md:pb-6')
    })
  })

  // -- 2. KEYBOARD NAVIGATION & FOCUS MANAGEMENT --------------------------
  describe('2. Keyboard Navigation & Accessibility (a11y)', () => {
    const indexCssPath = path.resolve(__dirname, '../index.css')
    const indexCssContent = fs.readFileSync(indexCssPath, 'utf-8')

    it('enforces visible keyboard focus rings across all interactive elements', () => {
      expect(indexCssContent).toContain(':focus-visible')
      expect(indexCssContent).toContain('outline: 2px solid #EB5E28')
      expect(indexCssContent).toContain('outline-offset: 2px')
    })

    it('configures manipulation touch-action for responsive mobile taps', () => {
      expect(indexCssContent).toContain('touch-action: manipulation')
    })

    it('renders accessible Button with focus-visible outline and role attributes', () => {
      const html = renderToStaticMarkup(
        React.createElement(Button, { variant: 'primary', size: 'md' }, 'Confirm Check-in')
      )
      expect(html).toContain('focus-visible:ring-2')
      expect(html).toContain('Confirm Check-in')
    })

    it('renders disabled button with aria-busy and disabled attribute for screen readers', () => {
      const html = renderToStaticMarkup(
        React.createElement(Button, { disabled: true, isLoading: true }, 'Submitting...')
      )
      expect(html).toContain('disabled=""')
      expect(html).toContain('aria-busy="true"')
      expect(html).toContain('disabled:pointer-events-none')
    })
  })

  // -- 3. REDUCED MOTION PREFERENCES --------------------------------------
  describe('3. Reduced Motion Support', () => {
    const indexCssPath = path.resolve(__dirname, '../index.css')
    const indexCssContent = fs.readFileSync(indexCssPath, 'utf-8')

    it('defines prefers-reduced-motion media query override', () => {
      expect(indexCssContent).toContain('@media (prefers-reduced-motion: reduce)')
    })

    it('collapses animation and transition durations to instantaneous for vestibular safety', () => {
      expect(indexCssContent).toContain('animation-duration: 0.01ms !important')
      expect(indexCssContent).toContain('transition-duration: 0.01ms !important')
      expect(indexCssContent).toContain('scroll-behavior: auto !important')
    })

    it('completely disables ambient decorative background animations when reduced motion is requested', () => {
      expect(indexCssContent).toContain('.animate-blob {')
      expect(indexCssContent).toContain('animation: none !important')
    })
  })

  // -- 4. EMPTY STATES ---------------------------------------------------
  describe('4. Empty States', () => {
    it('renders EmptyState with title, description, and placeholder graphic', () => {
      const html = renderToStaticMarkup(
        React.createElement(EmptyState, {
          title: 'No Safety Reports in this Zone',
          description: 'This area currently has no recent community reports. You can submit the first observation.',
        })
      )
      expect(html).toContain('No Safety Reports in this Zone')
      expect(html).toContain('This area currently has no recent community reports.')
      expect(html).toContain('border-dashed')
    })

    it('renders EmptyState with interactive call-to-action button', () => {
      const actionButton = React.createElement(Button, { size: 'sm' }, 'Add First Report')
      const html = renderToStaticMarkup(
        React.createElement(EmptyState, {
          title: 'Trusted Circle Empty',
          description: 'Add up to 3 close contacts to receive emergency notifications.',
          action: actionButton,
        })
      )
      expect(html).toContain('Trusted Circle Empty')
      expect(html).toContain('Add First Report')
    })
  })

  // -- 5. LOADING STATES & SKELETONS --------------------------------------
  describe('5. Loading States', () => {
    it('renders base Skeleton with pulse animation and accessible rounded geometry', () => {
      const html = renderToStaticMarkup(
        React.createElement(Skeleton, { className: 'h-6 w-48' })
      )
      expect(html).toContain('animate-pulse')
      expect(html).toContain('rounded-xl')
      expect(html).toContain('bg-slate-800/80')
    })

    it('renders CardSkeleton with multi-line placeholder layout for area cards and insights', () => {
      const html = renderToStaticMarkup(
        React.createElement(CardSkeleton, {})
      )
      expect(html).toContain('animate-pulse')
      expect(html).toContain('rounded-2xl')
      expect(html).toContain('border border-[#1E3550]')
    })

    it('renders circular avatar skeleton correctly', () => {
      const html = renderToStaticMarkup(
        React.createElement(Skeleton, { circle: true, className: 'h-10 w-10' })
      )
      expect(html).toContain('rounded-full')
    })
  })

  // -- 6. ERROR & ALERT STATES -------------------------------------------
  describe('6. Error & Alert States', () => {
    it('renders high-concern safety alert with role="alert" and danger styling', () => {
      const html = renderToStaticMarkup(
        React.createElement(Alert, {
          type: 'concern',
          title: 'High Concern Area Advisory',
          description: 'Recent observations indicate lower foot traffic and poor visibility.',
        })
      )
      expect(html).toContain('role="alert"')
      expect(html).toContain('Higher Concern')
      expect(html).toContain('High Concern Area Advisory')
      expect(html).toContain('text-rose-300')
      expect(html).toContain('border-rose-500/35')
    })

    it('renders caution advisory alert with warning semantic colors', () => {
      const html = renderToStaticMarkup(
        React.createElement(Alert, {
          type: 'caution',
          title: 'Caution Advisory',
          description: 'Mixed community reports during evening hours.',
        })
      )
      expect(html).toContain('Caution Advisory')
      expect(html).toContain('text-amber-300')
      expect(html).toContain('border-amber-500/35')
    })

    it('renders informational alert with calm non-alarmist phrasing', () => {
      const html = renderToStaticMarkup(
        React.createElement(Alert, {
          type: 'info',
          title: 'Location Awareness Active',
          description: 'Coarse area entry detection is running locally.',
        })
      )
      expect(html).toContain('Information')
      expect(html).toContain('text-sky-300')
    })

    it('renders dismiss button with accessible aria-label when onDismiss is supplied', () => {
      const html = renderToStaticMarkup(
        React.createElement(Alert, {
          type: 'concern',
          title: 'Temporary Notice',
          onDismiss: () => {},
        })
      )
      expect(html).toContain('aria-label="Dismiss alert"')
    })
  })

  // -- 6. USER-CONTROLLED THEME SYSTEM & LOGO VISIBILITY -------------------
  describe('6. Theme System, Light/Dark Modes & Logo Contrast', () => {
    const indexCssPath = path.resolve(__dirname, '../index.css')
    const indexCssContent = fs.readFileSync(indexCssPath, 'utf-8')
    const appShellPath = path.resolve(__dirname, '../components/navigation/AppShell.tsx')
    const appShellContent = fs.readFileSync(appShellPath, 'utf-8')
    const brandLogoPath = path.resolve(__dirname, '../components/design-system/BrandLogo.tsx')
    const brandLogoContent = fs.readFileSync(brandLogoPath, 'utf-8')

    it('defines distinct light and dark CSS mode variables in index.css', () => {
      expect(indexCssContent).toContain('html.light')
      expect(indexCssContent).toContain('html.dark')
      expect(indexCssContent).toContain('--brand-navy-dark')
      expect(indexCssContent).toContain('--surface-text-primary')
    })

    it('implements comprehensive real application styling overrides for light mode', () => {
      expect(indexCssContent).toContain('html.light body')
      expect(indexCssContent).toContain('background-color: #F8FAFC !important')
      expect(indexCssContent).toContain('color: #0F172A !important')
      expect(indexCssContent).toContain('.awarely-logo-badge')
    })

    it('maps all 5 color palette accent tokens across buttons, borders, and rings', () => {
      const themeContextPath = path.resolve(__dirname, '../contexts/ThemeContext.tsx')
      const themeContextContent = fs.readFileSync(themeContextPath, 'utf-8')

      // All 5 user palettes must be defined
      expect(themeContextContent).toContain('Safety Orange')
      expect(themeContextContent).toContain('Sapphire Ocean')
      expect(themeContextContent).toContain('Nordic Emerald')
      expect(themeContextContent).toContain('Solar Amber')
      expect(themeContextContent).toContain('Royal Amethyst')

      // Dynamic CSS class mappings
      expect(indexCssContent).toContain('--color-accent')
      expect(indexCssContent).toContain('var(--color-accent, var(--brand-orange))')
      expect(indexCssContent).toContain('var(--color-accent-hover, var(--brand-orange-hover))')
    })

    it('provides dedicated visible Light/Dark and Palette UI control in top header bar', () => {
      expect(appShellContent).toContain('ThemePaletteControl')
    })

    it('enforces contrast-safe surface and adaptive typography for official Awarely logo', () => {
      expect(brandLogoContent).toContain('Contrast-safe surface')
      expect(brandLogoContent).toContain('awarely-logo-badge')
      expect(brandLogoContent).toContain('src="/logo.png"')
    })
  })
})
