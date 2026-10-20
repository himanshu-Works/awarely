import { motion } from 'framer-motion'
import {
  MapPin,
  Clock,
  Sparkles,
  Sun,
  Moon,
  Compass,
  PlusCircle,
  Users,
} from 'lucide-react'
import type { Area } from '@/types/area'
import { ConfidenceIndicator } from './ConfidenceIndicator'
import { getRelativeTimeLabel } from '@/utils/freshness'
import { cn } from '@/utils/cn'

interface AreaContextCardProps {
  area: Area | null
  onOpenReport: () => void
  onOpenCircle: () => void
  onViewDetails?: () => void
  className?: string
}

export function AreaContextCard({
  area,
  onOpenReport,
  onOpenCircle,
  onViewDetails,
  className,
}: AreaContextCardProps) {
  if (!area) {
    return (
      <div
        className={cn(
          'glass rounded-3xl border border-slate-800/80 p-5 shadow-2xl backdrop-blur-2xl text-center',
          className,
        )}
      >
        <Compass className="mx-auto mb-2 h-7 w-7 text-slate-500 animate-spin" />
        <h3 className="text-sm font-medium text-slate-200">Resolving Area…</h3>
        <p className="mt-1 text-xs text-slate-400">
          Tap on an area on the map or select from the area picker.
        </p>
      </div>
    )
  }

  const hasReports = (area.reportCount || 0) > 0

  const awarenessBadge = !hasReports
    ? {
        text: 'No Community Reports Yet',
        color: 'bg-slate-700/30 text-slate-400 border-slate-700/50',
        dot: 'bg-slate-500',
      }
    : {
        active: {
          text: 'Well-Lit & Active Foot Traffic',
          color: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
          dot: 'bg-teal-400',
        },
        mixed: {
          text: 'Mixed Community Perception',
          color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400',
        },
        quiet: {
          text: 'Quiet / Lower Foot Traffic',
          color: 'bg-slate-400/15 text-slate-300 border-slate-400/30',
          dot: 'bg-slate-400',
        },
        unknown: {
          text: 'Limited Community Activity Data',
          color: 'bg-slate-700/30 text-slate-400 border-slate-700/50',
          dot: 'bg-slate-500',
        },
      }[area.awarenessLevel || 'unknown']

  const latestDate = area.latestReportAt
    ? typeof area.latestReportAt.toDate === 'function'
      ? area.latestReportAt.toDate()
      : new Date()
    : null

  const freshnessLabel = getRelativeTimeLabel(latestDate)

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'glass rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-2xl text-left',
        className,
      )}
    >
      {/* Top Header: Area Name & Location */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-teal-400 mb-0.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {area.city}, {area.country || 'Region'}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            {area.name}
          </h2>
        </div>

        {/* Confidence Badge */}
        <ConfidenceIndicator
          confidence={area.confidenceLevel || 'low'}
          reportCount={area.reportCount || 0}
        />
      </div>

      {/* Perception Tag & Freshness */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
            awarenessBadge.color,
          )}
        >
          <span className={cn('h-2 w-2 rounded-full animate-pulse', awarenessBadge.dot)} />
          {awarenessBadge.text}
        </div>

        <div className="inline-flex items-center gap-1 text-[11px] text-slate-400">
          <Clock className="h-3 w-3" />
          <span>Updated {freshnessLabel}</span>
        </div>
      </div>

      {/* Community Safety Data Status / AI Synthesis */}
      {!hasReports ? (
        <div className="mt-3.5 rounded-2xl bg-slate-800/40 p-3.5 border border-slate-700/40">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-slate-400" />
            <span>Community Safety Data: Not Available Yet</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            No recent community reports are available for this area. Be the first to contribute local awareness.
          </p>
        </div>
      ) : (
        <div className="mt-3.5 rounded-2xl bg-slate-800/60 p-3.5 border border-slate-700/40">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>AI Community Awareness Synthesis</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {area.aiSummary || 'Community reports are being analyzed for this area.'}
          </p>
        </div>
      )}

      {/* Top Observations Chips */}
      {area.topObservations && area.topObservations.length > 0 && (
        <div className="mt-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Top Observations
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {area.topObservations.slice(0, 4).map((obs) => (
              <span
                key={obs}
                className="rounded-lg bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-700/60"
              >
                {obs}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Day / Night comfort breakdown (only for areas with reports) */}
      {hasReports && area.dayNightSplit && (
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <Sun className="h-3.5 w-3.5 text-amber-400" />
            <span>Day: <strong className="text-slate-200">{area.dayNightSplit.day}%</strong> comfortable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Moon className="h-3.5 w-3.5 text-indigo-400" />
            <span>Night: <strong className="text-slate-200">{area.dayNightSplit.night}%</strong> comfortable</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-2 pt-2 border-t border-slate-800/80">
        <button
          onClick={onOpenReport}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-500 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-teal-500/20 hover:bg-teal-400 active:scale-98 transition"
        >
          <PlusCircle className="h-4 w-4" />
          Contribute Report
        </button>

        <button
          onClick={onOpenCircle}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 active:scale-98 transition"
          title="Notify your trusted emergency contacts"
        >
          <Users className="h-4 w-4 text-amber-400" />
          Safety Circle
        </button>

        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-2.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Details
          </button>
        )}
      </div>
    </motion.div>
  )
}
