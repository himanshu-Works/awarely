import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

export type SafetyState = 'positive' | 'caution' | 'concern' | 'neutral'

export interface StatusIndicatorProps {
  state: SafetyState
  label?: string
  description?: string
  showBadgeOnly?: boolean
  className?: string
}

export function StatusIndicator({
  state,
  label,
  description,
  showBadgeOnly = false,
  className,
}: StatusIndicatorProps) {
  const configs = {
    positive: {
      defaultLabel: 'Positive Community Feedback',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
      dotClass: 'bg-emerald-400',
      icon: CheckCircle2,
      subtext: 'High foot traffic and adequate street lighting observed.',
    },
    caution: {
      defaultLabel: 'Caution Advised',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
      dotClass: 'bg-amber-400',
      icon: AlertTriangle,
      subtext: 'Mixed observations; comfort varies depending on time and location.',
    },
    concern: {
      defaultLabel: 'Higher Concern Reported',
      badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
      dotClass: 'bg-rose-400',
      icon: AlertOctagon,
      subtext: 'Lower foot traffic or sparse lighting reported by community contributors.',
    },
    neutral: {
      defaultLabel: 'Preliminary Observations',
      badgeClass: 'bg-slate-700/30 text-slate-300 border-slate-700/60',
      dotClass: 'bg-slate-400',
      icon: HelpCircle,
      subtext: 'Fewer community reports recorded for this area.',
    },
  }[state]

  const Icon = configs.icon
  const displayLabel = label || configs.defaultLabel
  const displayDesc = description || configs.subtext

  if (showBadgeOnly) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold select-none',
          configs.badgeClass,
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{displayLabel}</span>
      </span>
    )
  }

  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-xl border select-none', configs.badgeClass, className)}>
      <div className="mt-0.5 rounded-lg p-1.5 bg-black/20 shrink-0">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider">
            {displayLabel}
          </span>
          <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', configs.dotClass)} />
        </div>
        <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
          {displayDesc}
        </p>
      </div>
    </div>
  )
}
