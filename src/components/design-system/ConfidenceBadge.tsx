import { ShieldCheck, ShieldAlert, HelpCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ConfidenceTier = 'high' | 'moderate' | 'low'

export interface ConfidenceBadgeProps {
  tier: ConfidenceTier
  reportCount?: number
  showDetail?: boolean
  className?: string
}

export function ConfidenceBadge({
  tier,
  reportCount,
  showDetail = false,
  className,
}: ConfidenceBadgeProps) {
  const configs = {
    high: {
      label: 'High confidence',
      icon: ShieldCheck,
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
      desc: 'Corroborated by high report volume over recent days.',
    },
    moderate: {
      label: 'Moderate confidence',
      icon: ShieldAlert,
      badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
      desc: 'Moderate data sample; conditions may vary across times of day.',
    },
    low: {
      label: 'Low confidence',
      icon: HelpCircle,
      badgeClass: 'bg-slate-700/35 text-slate-300 border-slate-700/60',
      desc: 'Sparse or emerging reports; observations are tentative.',
    },
  }[tier]

  const Icon = configs.icon

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold select-none',
          configs.badgeClass,
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{configs.label}</span>
        {typeof reportCount === 'number' && (
          <span className="opacity-75 font-normal">
            ({reportCount} {reportCount === 1 ? 'report' : 'reports'})
          </span>
        )}
      </span>

      {showDetail && (
        <span className="text-[11px] text-slate-400 pl-1 leading-snug">
          {configs.desc}
        </span>
      )}
    </div>
  )
}
