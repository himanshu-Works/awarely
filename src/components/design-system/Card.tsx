import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type CardVariant = 'navy' | 'white' | 'glass' | 'flat'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  interactive?: boolean
  padded?: boolean
  children?: ReactNode
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'navy',
      interactive = false,
      padded = true,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    const variantClasses = {
      navy: 'bg-[#122338] border-[#1E3550] bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)] shadow-md',
      white: 'bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] shadow-md',
      glass: 'bg-[var(--surface-elevated)]/90 backdrop-blur-md text-[var(--foreground)] border border-[var(--border)] shadow-xl',
      flat: 'bg-[var(--surface)]/70 text-[var(--foreground-secondary)] border border-[var(--border)]',
    }[variant]

    const interactiveClasses = interactive
      ? 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-2 focus-within:ring-orange-500'
      : ''

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl overflow-hidden',
          variantClasses,
          interactiveClasses,
          padded && 'p-5 sm:p-6',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
)
Card.displayName = 'Card'

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 space-y-1.5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold tracking-tight leading-snug text-[var(--foreground)]', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-xs text-[var(--foreground-muted)] leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  )
}

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-5 pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
