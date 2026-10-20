import { type ReactNode } from 'react'
import {
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  X,
} from 'lucide-react'
import { cn } from '@/utils/cn'

export type AlertType = 'info' | 'caution' | 'concern' | 'positive'

export interface AlertProps {
  type?: AlertType
  title: string
  description?: string
  action?: ReactNode
  onDismiss?: () => void
  className?: string
}

export function Alert({
  type = 'info',
  title,
  description,
  action,
  onDismiss,
  className,
}: AlertProps) {
  const configs = {
    info: {
      border: 'border-sky-500/35',
      bg: 'bg-sky-500/10',
      text: 'text-sky-300',
      icon: Info,
      label: 'Information',
    },
    caution: {
      border: 'border-amber-500/35',
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      icon: AlertTriangle,
      label: 'Caution Advisory',
    },
    concern: {
      border: 'border-rose-500/35',
      bg: 'bg-rose-500/10',
      text: 'text-rose-300',
      icon: AlertOctagon,
      label: 'Higher Concern',
    },
    positive: {
      border: 'border-emerald-500/35',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-300',
      icon: CheckCircle2,
      label: 'Community Consensus',
    },
  }[type]

  const Icon = configs.icon

  return (
    <div
      role="alert"
      className={cn(
        'relative flex items-start gap-3 rounded-2xl border p-4 text-left transition',
        configs.bg,
        configs.border,
        className,
      )}
    >
      <div className={cn('mt-0.5 rounded-lg p-1 bg-black/20 shrink-0', configs.text)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>

      <div className="flex-1 space-y-1 pr-6">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-bold uppercase tracking-wider', configs.text)}>
            {configs.label}
          </span>
          <span className="text-slate-400">•</span>
          <h4 className="text-sm font-semibold text-white tracking-tight">
            {title}
          </h4>
        </div>

        {description && (
          <p className="text-xs text-slate-300 leading-relaxed">
            {description}
          </p>
        )}

        {action && <div className="pt-2">{action}</div>}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute right-3.5 top-3.5 rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10 transition"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
