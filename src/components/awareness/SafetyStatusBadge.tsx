import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react'
import type { Area } from '@/types/area'
import { getAreaSafetyState, type SafetyStateKey } from '@/utils/safety'
import { cn } from '@/utils/cn'

export interface SafetyStatusBadgeProps {
  area?: Area | null
  stateKey?: SafetyStateKey
  showDescription?: boolean
  className?: string
}

export function SafetyStatusBadge({
  area,
  stateKey,
  showDescription = false,
  className,
}: SafetyStatusBadgeProps) {
  const config = area ? getAreaSafetyState(area) : stateKey ? getAreaSafetyState({
    awarenessLevel: stateKey === 'generally-positive' ? 'active' : stateKey === 'caution' ? 'mixed' : (stateKey === 'higher-concern' ? 'concern' : 'unknown') as any,
    reportCount: stateKey === 'limited-data' ? 0 : 10,
  } as Area) : getAreaSafetyState(null)

  const icons = {
    'generally-positive': CheckCircle2,
    'caution': AlertTriangle,
    'higher-concern': AlertCircle,
    'limited-data': HelpCircle,
  }
  const Icon = icons[config.key] || HelpCircle

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold select-none',
          config.badgeClass,
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{config.label}</span>
      </span>

      {showDescription && (
        <span className="text-[11px] text-slate-400 pl-1 leading-snug">
          {config.description}
        </span>
      )}
    </div>
  )
}
