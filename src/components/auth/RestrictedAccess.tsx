import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/design-system/Button'
import { useAuth } from '@/contexts/AuthContext'

interface RestrictedAccessProps {
  requiredRole: string
  title?: string
  description?: string
}

export function RestrictedAccess({
  requiredRole,
  title = 'Restricted Area',
  description = 'You do not have the required permissions to access this module.',
}: RestrictedAccessProps) {
  const { role } = useAuth()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-rose-500/30 bg-rose-500/10 text-rose-400 mb-4 shadow-xl">
        <ShieldAlert className="h-8 w-8" />
      </div>

      <h2 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-[var(--foreground-muted)]">{description}</p>

      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--foreground-secondary)]">
        <span>Current Role: </span>
        <strong className="text-[var(--foreground)] uppercase font-mono">{role}</strong>
        <span className="text-[var(--foreground-muted)] mx-2">|</span>
        <span>Required: </span>
        <strong className="text-amber-500 dark:text-amber-400 font-mono">{requiredRole}</strong>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Link to="/">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Dashboard
          </Button>
        </Link>
        <Link to="/profile">
          <Button variant="outline" size="sm">
            View Profile
          </Button>
        </Link>
      </div>
    </div>
  )
}
