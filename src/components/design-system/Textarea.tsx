import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  surface?: 'dark' | 'light'
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      surface = 'dark',
      id,
      className,
      disabled,
      rows = 3,
      ...props
    },
    ref,
  ) => {
    const textareaId =
      id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const errorId = textareaId ? `${textareaId}-error` : undefined
    const hintId = textareaId ? `${textareaId}-hint` : undefined

    const surfaceClasses = {
      dark: 'bg-[var(--input-background)] text-[var(--input-foreground)] placeholder-[var(--input-placeholder)] border border-[var(--border-strong)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]',
      light: 'bg-[var(--input-background)] text-[var(--input-foreground)] placeholder-[var(--input-placeholder)] border border-[var(--border-strong)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]',
    }[surface]

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-[var(--foreground)] select-none tracking-tight"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : hint ? hintId : undefined
            }
            className={cn(
              'w-full rounded-xl border px-3.5 py-2.5 text-sm transition duration-150 outline-none resize-none',
              surfaceClasses,
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
              disabled && 'opacity-50 cursor-not-allowed bg-[var(--surface-muted)]',
              className,
            )}
            {...props}
          />

          {error && (
            <div className="pointer-events-none absolute right-3 top-3 text-rose-500">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="flex items-center gap-1 text-xs text-rose-500 pt-0.5">
            <span>{error}</span>
          </p>
        )}

        {hint && !error && (
          <p id={hintId} className="text-[11px] text-[var(--foreground-muted)] pt-0.5">
            {hint}
          </p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
