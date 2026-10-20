import { HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { ConfidenceLevel } from '@/config/app.config'
import { cn } from '@/utils/cn'

interface ConfidenceIndicatorProps {
  confidence: ConfidenceLevel
  reportCount?: number
  className?: string
  showExplanation?: boolean
}

export function ConfidenceIndicator({
  confidence,
  reportCount,
  className,
  showExplanation = false,
}: ConfidenceIndicatorProps) {
  const meta = {
    high: {
      label: 'High Community Confidence',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
      desc: 'Based on substantial recent contributor observations within the area.',
    },
    moderate: {
      label: 'Moderate Confidence',
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      icon: AlertTriangle,
      desc: 'Formed from moderate community reports; conditions may vary across time.',
    },
    low: {
      label: 'Low / Sparse Data',
      badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
      icon: HelpCircle,
      desc: 'Few community reports recorded yet. Observations are preliminary.',
    },
  }[confidence] || {
    label: 'Preliminary Data',
    badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    icon: HelpCircle,
    desc: 'Community observations are limited.',
  }

  const Icon = meta.icon

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-md',
          meta.badgeClass,
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{meta.label}</span>
        {typeof reportCount === 'number' && (
          <span className="opacity-75 font-normal">
            ({reportCount} {reportCount === 1 ? 'report' : 'reports'})
          </span>
        )}
      </div>

      {showExplanation && (
        <p className="text-[11px] text-slate-400 leading-snug pl-1">
          {meta.desc}
        </p>
      )}
    </div>
  )
}
