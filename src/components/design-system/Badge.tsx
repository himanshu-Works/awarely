import { type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type BadgeVariant =
  | 'default'
  | 'orange'
  | 'navy'
  | 'caution'
  | 'concern'
  | 'positive'
  | 'neutral'

export interface BadgeProps {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  dot?: boolean
  pulseDot?: boolean
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  pulseDot = false,
  icon,
  children,
  className,
}: BadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  }[size]

  const variantClasses = {
    default:
      'bg-[var(--surface-muted)] text-[var(--foreground-secondary)] border border-[var(--border)]',
    orange:
      'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/35 font-semibold',
    navy:
      'bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)]',
    caution:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35 font-medium',
    concern:
      'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 font-medium',
    positive:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35 font-medium',
    neutral:
      'bg-[var(--surface-muted)]/50 text-[var(--foreground-muted)] border border-[var(--border)]',
  }[variant]

  const dotColorClasses = {
    default: 'bg-slate-400',
    orange: 'bg-[#EB5E28]',
    navy: 'bg-sky-400',
    caution: 'bg-amber-400',
    concern: 'bg-rose-400',
    positive: 'bg-emerald-400',
    neutral: 'bg-slate-500',
  }[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium select-none tracking-tight',
        sizeClasses,
        variantClasses,
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            dotColorClasses,
            pulseDot && 'animate-ping duration-1000',
          )}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
