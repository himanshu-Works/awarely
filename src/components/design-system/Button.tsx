import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ButtonVariant =
  | 'primary'      // Restrained orange accent
  | 'navy'         // Deep brand navy
  | 'secondary'    // Slate outline
  | 'light'        // Crisp white surface with navy text
  | 'ghost'        // Subtle transparent
  | 'danger'       // Elevated concern / alarm red
  | 'outline'      // Subtle border outline

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-xl transition duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]'

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2.5',
    }[size]

    const variantClasses = {
      primary:
        'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] shadow-sm focus-visible:ring-offset-[var(--background)]',
      navy:
        'bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] border border-[var(--border)] shadow-sm focus-visible:ring-offset-[var(--background)]',
      secondary:
        'bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] focus-visible:ring-offset-[var(--background)]',
      light:
        'bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] border border-[var(--border-strong)] shadow-sm focus-visible:ring-offset-[var(--background)]',
      ghost:
        'bg-transparent text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
      danger:
        'bg-rose-600 text-white hover:bg-rose-500 shadow-sm shadow-rose-950/30 focus-visible:ring-offset-[var(--background)]',
      outline:
        'bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-muted)] border border-[var(--border-strong)] shadow-sm focus-visible:ring-offset-[var(--background)]',
    }[variant]

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(baseClasses, sizeClasses, variantClasses, className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    )
  },
)

Button.displayName = 'Button'
