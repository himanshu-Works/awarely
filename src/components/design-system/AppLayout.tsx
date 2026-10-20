import { type ReactNode } from 'react'
import { AppNavbar } from './AppNavbar'
import { BrandLogo } from './BrandLogo'
import { Shield, Lock } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface AppLayoutProps {
  children: ReactNode
  onOpenCircle?: () => void
  showFooter?: boolean
  className?: string
  fullBleed?: boolean
}

export function AppLayout({
  children,
  onOpenCircle,
  showFooter = true,
  className,
  fullBleed = false,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-[var(--primary-foreground)] focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Brand Header & Navigation */}
      <AppNavbar onOpenCircle={onOpenCircle} />

      {/* Main Content Area */}
      <main
        id="main-content"
        className={cn(
          'flex-1 flex flex-col',
          !fullBleed && 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6',
          className,
        )}
      >
        {children}
      </main>

      {/* Trustworthy Responsive Footer */}
      {showFooter && (
        <footer className="border-t border-[var(--border)] bg-[var(--surface-muted)] py-8 text-xs text-[var(--foreground-muted)] select-none">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandLogo size="xs" />
              <span className="text-[11px] text-[var(--foreground-muted)]">
                Privacy-first safety awareness platform for travelers.
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
                <Lock className="h-3.5 w-3.5 text-[var(--primary)]" />
                <span>Zero location history retained</span>
              </div>
              <span className="text-[var(--border)]">•</span>
              <div className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
                <Shield className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                <span>Community Perception Protocol</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
