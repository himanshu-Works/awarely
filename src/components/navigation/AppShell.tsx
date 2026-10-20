import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  Map as MapIcon,
  Info,
  PlusCircle,
  Sparkles,
  Bell,
  Users,
  User,
  ShieldCheck,
  ClipboardList,
  Terminal,
  ShieldAlert,
  Volume2,
  VolumeX,
  Menu,
  X,
  LogOut,
  MapPin,
  ChevronRight,
  Sparkle,
} from 'lucide-react'
import { BrandLogo } from '@/components/design-system/BrandLogo'
import { ThemePaletteControl } from '@/components/theme/ThemePaletteControl'
import { useAuth } from '@/contexts/AuthContext'
import { useArea } from '@/contexts/AreaContext'
import { authService } from '@/services/auth.service'
import { sirenService } from '@/services/siren.service'
import { cn } from '@/utils/cn'

interface AppShellProps {
  children: React.ReactNode
}

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  devOnly?: boolean
  adminOnly?: boolean
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isGuest, role, isAdmin, isDev } = useAuth()
  const { selectedArea, isLocating, requestCurrentLocation } = useArea()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sirenActive, setSirenActive] = useState(sirenService.isPlaying)

  useEffect(() => {
    return sirenService.subscribe((playing) => {
      setSirenActive(playing)
    })
  }, [])

  async function toggleSiren() {
    await sirenService.toggle()
  }

  const primaryNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { id: 'search', label: 'Search Area', href: '/search', icon: Search },
    { id: 'map', label: 'Safety Map', href: '/map', icon: MapIcon },
    { id: 'area', label: 'Area Details', href: '/area', icon: Info },
    { id: 'report', label: 'Report Safety', href: '/report', icon: PlusCircle },
    { id: 'insights', label: 'AI Insights', href: '/insights', icon: Sparkles },
    { id: 'alerts', label: 'Alerts', href: '/alerts', icon: Bell },
    { id: 'circle', label: 'Safety Circle', href: '/circle', icon: Users },
  ]

  const secondaryNavItems: NavItem[] = [
    { id: 'profile', label: 'Profile', href: '/profile', icon: User },
    { id: 'privacy', label: 'Privacy Settings', href: '/privacy', icon: ShieldCheck },
    { id: 'my-reports', label: 'My Reports', href: '/my-reports', icon: ClipboardList },
  ]

  const privilegedNavItems: NavItem[] = [
    {
      id: 'dev',
      label: 'Developer Tools',
      href: '/dev',
      icon: Terminal,
      badge: 'DEV',
      devOnly: true,
    },
    {
      id: 'admin',
      label: 'Admin Dashboard',
      href: '/admin',
      icon: ShieldAlert,
      badge: 'ADMIN',
      adminOnly: true,
    },
  ]

  const filteredPrivileged = privilegedNavItems.filter((item) => {
    if (item.adminOnly) return isAdmin
    if (item.devOnly) return isDev || isAdmin
    return true
  })

  // Quick bottom nav items for mobile
  const mobileBottomItems = [
    { id: 'dashboard', label: 'Home', href: '/', icon: LayoutDashboard },
    { id: 'search', label: 'Search', href: '/search', icon: Search },
    { id: 'map', label: 'Map', href: '/map', icon: MapIcon },
    { id: 'alerts', label: 'Alerts', href: '/alerts', icon: Bell },
    { id: 'more', label: 'Menu', href: '#more', icon: Menu },
  ]

  async function handleSignOut() {
    if (sirenService.isPlaying) sirenService.stop()
    await authService.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans">
      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 px-3 sm:px-6 backdrop-blur-xl">
        {/* Brand Logo & Active Area Chip */}
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            aria-label="Awarely Home"
          >
            <BrandLogo size="xs" showTagline />
          </Link>

          {/* Active Area Quick Indicator */}
          {selectedArea && (
            <button
              onClick={() => navigate('/search')}
              className="hidden md:flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--foreground-secondary)] hover:border-[var(--primary)]/40 hover:text-[var(--foreground)] transition"
              title="Click to search or switch area"
            >
              <MapPin className="h-3 w-3 text-[var(--primary)]" />
              <span className="font-semibold text-[var(--foreground)] truncate max-w-[150px]">
                {selectedArea.name}
              </span>
              <span className="text-[var(--foreground-muted)]">({selectedArea.city})</span>
            </button>
          )}

          {/* Discrete Location Trigger */}
          <button
            onClick={async () => {
              const success = await requestCurrentLocation()
              if (success) {
                navigate('/area')
              }
            }}
            disabled={isLocating}
            className="hidden lg:flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-[11px] font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition disabled:opacity-50"
            title="Privacy-safe coarse area check (never tracks continuous GPS)"
          >
            <Sparkle className={cn('h-3 w-3', isLocating && 'animate-spin')} />
            <span>{isLocating ? 'Finding your current area...' : 'Near Me'}</span>
          </button>
        </div>

        {/* Right Header Action Items */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Emergency Distress Siren */}
          <button
            id="siren-toggle-btn"
            onClick={toggleSiren}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 border shadow-md',
              sirenActive
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-rose-950/60'
                : 'bg-[var(--surface-elevated)] text-[var(--primary)] border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-muted)]',
            )}
            title="Audio distress emergency siren"
            aria-label={sirenActive ? 'Stop Emergency Siren' : 'Sound Emergency Siren'}
          >
            {sirenActive ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-[var(--primary)]" />
            )}
            <span className="hidden sm:inline">
              {sirenActive ? 'Siren Active' : 'Siren'}
            </span>
          </button>

          {/* Theme & Color Palette Controls */}
          <ThemePaletteControl />

          {/* Role Indicator Badge */}
          {role === 'admin' ? (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/40 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
              Admin
            </span>
          ) : role === 'dev' ? (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
              Dev
            </span>
          ) : isGuest ? (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-500/15 border border-slate-500/40 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              Guest
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 text-[11px] font-medium text-teal-700 dark:text-teal-300">
              Member
            </span>
          )}

          {/* Profile Quick Link */}
          <Link
            to="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:border-[var(--primary)]/50 transition"
            title="Profile & Settings"
            aria-label="User Profile"
          >
            <User className="h-4 w-4" />
          </Link>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:text-rose-500 hover:border-rose-500/40 transition"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>

          {/* Mobile Menu Drawer Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:border-[var(--primary)]/50"
            aria-label={mobileMenuOpen ? 'Close Navigation' : 'Open Navigation'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* ── Main Layout Body ────────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside
          className="hidden md:flex w-64 shrink-0 flex-col justify-between border-r border-[#1E3550] border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md p-4 overflow-y-auto custom-scrollbar"
          aria-label="Sidebar Navigation"
        >
          <div className="space-y-6">
            {/* Primary Awareness Nav Group */}
            <div>
              <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Awareness & Context
              </span>
              <nav className="mt-2 space-y-1">
                {primaryNavItems.map((item) => {
                  const active = location.pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      className={cn(
                        'flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition',
                        active
                          ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)] shadow-sm'
                          : 'text-[var(--foreground-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            'h-4 w-4',
                            active ? 'text-[var(--primary)]' : 'text-[var(--foreground-muted)]',
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded bg-[var(--primary)]/15 border border-[var(--primary)]/30 px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Community & Settings Group */}
            <div>
              <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                User & Privacy
              </span>
              <nav className="mt-2 space-y-1">
                {secondaryNavItems.map((item) => {
                  const active = location.pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                        active
                          ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)] shadow-sm'
                          : 'text-[var(--foreground-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          active ? 'text-[var(--primary)]' : 'text-[var(--foreground-muted)]',
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Privileged Nav Group (Dev & Admin) */}
            {filteredPrivileged.length > 0 && (
              <div>
                <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-amber-500/90 dark:text-amber-400/80">
                  Authorized Only
                </span>
                <nav className="mt-2 space-y-1">
                  {filteredPrivileged.map((item) => {
                    const active = location.pathname === item.href
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.id}
                        to={item.href}
                        className={cn(
                          'flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition',
                          active
                            ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-amber-500/40 shadow-sm'
                            : 'text-[var(--foreground-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                          <span>{item.label}</span>
                        </div>
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          {item.badge}
                        </span>
                      </Link>
                    )
                  })}
                </nav>
              </div>
            )}
          </div>

          {/* Sidebar Footer Info */}
          <div className="mt-6 border-t border-[var(--border)] pt-4 text-[11px] text-[var(--foreground-muted)]">
            <div className="flex items-center justify-between">
              <span>Awarely v0.1.0</span>
              <Link
                to="/design-system"
                className="text-[var(--primary)] hover:underline font-medium"
              >
                Design System
              </Link>
            </div>
            <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
              Safety context, not guarantees.
            </p>
          </div>
        </aside>

        {/* ── Main View Content ────────────────────────────────────────── */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden bg-[var(--background)] pb-20 md:pb-6 custom-scrollbar"
          id="main-content-scroll"
        >
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation Bar ─────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 backdrop-blur-xl"
        aria-label="Mobile Bottom Navigation"
      >
        {mobileBottomItems.map((item) => {
          const isMore = item.id === 'more'
          const active = isMore ? mobileMenuOpen : location.pathname === item.href
          const Icon = item.icon

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isMore) {
                  setMobileMenuOpen(!mobileMenuOpen)
                } else {
                  setMobileMenuOpen(false)
                  navigate(item.href)
                }
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-1.5 transition active:scale-95',
                active
                  ? 'text-[var(--primary)] font-bold'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* ── Mobile Drawer / More Sheet ───────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <BrandLogo size="xs" />
                <span className="text-xs text-[var(--foreground-muted)]">All Application Areas</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full bg-[var(--surface-elevated)] p-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Actions / Contribute */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/report')
                }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] p-3 text-xs font-bold text-white shadow-lg"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Report Safety</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/circle')
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-bold text-amber-700 dark:text-amber-300"
              >
                <Users className="h-4 w-4" />
                <span>Safety Circle</span>
              </button>
            </div>

            {/* Full Links List */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Core Modules
              </span>
              {[...primaryNavItems, ...secondaryNavItems].map((item) => {
                const active = location.pathname === item.href
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate(item.href)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition',
                      active
                        ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)]'
                        : 'text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          active ? 'text-[var(--primary)]' : 'text-[var(--foreground-muted)]',
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
                  </button>
                )
              })}
            </div>

            {/* Privileged mobile links */}
            {filteredPrivileged.length > 0 && (
              <div className="space-y-1 border-t border-[var(--border)] pt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400/80">
                  Authorized Modules
                </span>
                {filteredPrivileged.map((item) => {
                  const active = location.pathname === item.href
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setMobileMenuOpen(false)
                        navigate(item.href)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition',
                        active
                          ? 'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-amber-500/40'
                          : 'text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        <span>{item.label}</span>
                      </div>
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        {item.badge}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* User session status and sign out */}
            <div className="border-t border-[var(--border)] pt-3 flex items-center justify-between">
              <span className="text-xs text-[var(--foreground-muted)]">
                {isGuest ? 'Guest Traveler' : user?.displayName || 'Signed in'}
              </span>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleSignOut()
                }}
                className="text-xs font-bold text-rose-500 hover:text-rose-600"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
