import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Menu,
  X,
  Volume2,
  VolumeX,
  MapPin,
  Palette,
  LogOut,
  Users,
} from 'lucide-react'
import { BrandLogo } from './BrandLogo'
import { Button } from './Button'
import { ThemePaletteControl } from '@/components/theme/ThemePaletteControl'
import { sirenService } from '@/services/siren.service'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth.service'
import { cn } from '@/utils/cn'

interface AppNavbarProps {
  onOpenCircle?: () => void
  className?: string
}

export function AppNavbar({ onOpenCircle, className }: AppNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sirenActive, setSirenActive] = useState(sirenService.isPlaying)
  const { user, isGuest } = useAuth()
  const location = useLocation()

  useEffect(() => {
    return sirenService.subscribe((playing) => {
      setSirenActive(playing)
    })
  }, [])

  async function toggleSiren() {
    await sirenService.toggle()
  }

  const navLinks = [
    { href: '/', label: 'Awareness Map', icon: MapPin },
    { href: '/design-system', label: 'Design System', icon: Palette },
  ]

  return (
    <header
      className={cn(
        'sticky top-0 z-30 w-full border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl',
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand with supplied official logo */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            aria-label="Awarely Home"
          >
            <BrandLogo size="sm" showTagline />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
            {navLinks.map((item) => {
              const active = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                    active
                      ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)] font-bold'
                      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 text-[var(--primary)]" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Desktop Right Side Controls */}
        <div className="hidden md:flex items-center gap-3">
          {/* Audio Distress Siren */}
          <button
            onClick={toggleSiren}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 border',
              sirenActive
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-md shadow-rose-950/40'
                : 'bg-[var(--surface-muted)] text-rose-600 dark:text-rose-400 border-[var(--border)] hover:border-rose-500/50 hover:bg-rose-500/10',
            )}
            title="Audio distress warning siren"
            aria-label={sirenActive ? 'Stop Emergency Siren' : 'Sound Emergency Siren'}
          >
            {sirenActive ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span>{sirenActive ? 'Siren Active' : 'Distress Siren'}</span>
          </button>

          {/* Trusted Circle Quick Action */}
          {onOpenCircle && (
            <Button
              variant="navy"
              size="sm"
              leftIcon={<Users className="h-3.5 w-3.5 text-amber-500" />}
              onClick={onOpenCircle}
            >
              Circle
            </Button>
          )}

          {/* Theme & Palette Controls */}
          <ThemePaletteControl />

          {/* User Status / Mode */}
          {user && (
            <span className="rounded-full bg-[var(--surface-muted)] border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--foreground-secondary)]">
              {isGuest ? 'Guest Traveler' : user.displayName || 'Member'}
            </span>
          )}

          {/* Sign Out */}
          {user && (
            <button
              onClick={() => authService.signOut()}
              className="rounded-xl p-2 text-[var(--foreground-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          {/* Siren quick button on mobile */}
          <button
            onClick={toggleSiren}
            className={cn(
              'rounded-full p-2 text-xs font-semibold border',
              sirenActive
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-[var(--surface-muted)] text-rose-600 dark:text-rose-400 border-[var(--border)]',
            )}
            aria-label="Toggle siren"
          >
            {sirenActive ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-[var(--foreground)] hover:border-[var(--border-strong)]"
            aria-label={mobileMenuOpen ? 'Close Navigation' : 'Open Navigation'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] px-4 py-4 space-y-3">
          <nav className="flex flex-col gap-1.5" aria-label="Mobile Navigation">
            {navLinks.map((item) => {
              const active = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                    active
                      ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)] font-bold'
                      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
                  )}
                >
                  <Icon className="h-4 w-4 text-[var(--primary)]" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-xs text-[var(--foreground-muted)]">
              {isGuest ? 'Guest Mode' : user?.displayName || 'Signed in'}
            </span>
            {user && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  authService.signOut()
                }}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
