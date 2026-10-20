import { Clock } from 'lucide-react'
import { getFreshnessConfig } from '@/utils/safety'
import { cn } from '@/utils/cn'

export interface DataFreshnessBadgeProps {
  date?: Date | null
  showRelativeTime?: boolean
  className?: string
}

export function DataFreshnessBadge({
  date,
  showRelativeTime = true,
  className,
}: DataFreshnessBadgeProps) {
  const config = getFreshnessConfig(date)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs select-none',
        config.badgeClass,
        className,
      )}
      title={config.relativeTime}
    >
      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="font-medium">
        {showRelativeTime ? config.relativeTime : config.label}
      </span>
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          config.isFresh ? 'bg-emerald-400' : 'bg-slate-400',
        )}
      />
    </div>
  )
}
