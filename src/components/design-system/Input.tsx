import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  surface?: 'dark' | 'light'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      surface = 'dark',
      id,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const errorId = inputId ? `${inputId}-error` : undefined
    const hintId = inputId ? `${inputId}-hint` : undefined

    const surfaceClasses = {
      dark: 'bg-[var(--input-background)] text-[var(--input-foreground)] placeholder-[var(--input-placeholder)] border border-[var(--border-strong)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]',
      light: 'bg-[var(--input-background)] text-[var(--input-foreground)] placeholder-[var(--input-placeholder)] border border-[var(--border-strong)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]',
    }[surface]

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[var(--foreground)] select-none tracking-tight"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : hint ? hintId : undefined
            }
            className={cn(
              'w-full rounded-xl border px-3.5 py-2.5 text-sm transition duration-150 outline-none',
              surfaceClasses,
              leftIcon ? 'pl-10' : undefined,
              rightIcon || error ? 'pr-10' : undefined,
              error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : undefined,
              disabled ? 'opacity-50 cursor-not-allowed bg-slate-900' : undefined,
              className,
            )}
            {...props}
          />

          {error ? (
            <div className="pointer-events-none absolute right-3 text-rose-400">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : (
            rightIcon && (
              <div className="absolute right-3 text-slate-400">
                {rightIcon}
              </div>
            )
          )}
        </div>

        {error && (
          <p id={errorId} className="flex items-center gap-1 text-xs text-rose-400 pt-0.5">
            <span>{error}</span>
          </p>
        )}

        {hint && !error && (
          <p id={hintId} className="text-[11px] text-slate-400 pt-0.5">
            {hint}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
