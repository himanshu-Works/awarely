import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options?: SelectOption[]
  error?: string
  hint?: string
  surface?: 'dark' | 'light'
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      hint,
      surface = 'dark',
      id,
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const selectId =
      id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const errorId = selectId ? `${selectId}-error` : undefined
    const hintId = selectId ? `${selectId}-hint` : undefined

    const surfaceClasses = {
      dark: 'bg-[var(--input-background)] text-[var(--input-foreground)] border border-[var(--border-strong)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]',
      light: 'bg-[var(--input-background)] text-[var(--input-foreground)] border border-[var(--border-strong)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]',
    }[surface]

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[var(--foreground)] select-none tracking-tight"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : hint ? hintId : undefined
            }
            className={cn(
              'w-full appearance-none rounded-xl border px-3.5 py-2.5 pr-10 text-sm transition duration-150 outline-none cursor-pointer',
              surfaceClasses,
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
              disabled && 'opacity-50 cursor-not-allowed bg-slate-900',
              className,
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        {error && (
          <p id={errorId} className="flex items-center gap-1 text-xs text-rose-400 pt-0.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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

Select.displayName = 'Select'
