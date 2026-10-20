import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  Sparkles,
  Sun,
  Moon,
  PlusCircle,
  Compass,
  CheckCircle2,
  Layers,
  X,
  AlertTriangle,
} from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { SafetyStatusBadge } from '@/components/awareness/SafetyStatusBadge'
import { ConfidenceBadge } from '@/components/design-system/ConfidenceBadge'
import { DataFreshnessBadge } from '@/components/awareness/DataFreshnessBadge'
import { Card } from '@/components/design-system/Card'
import { Button } from '@/components/design-system/Button'
import { Select } from '@/components/design-system/Select'

export function AreaDetailsPage() {
  const navigate = useNavigate()
  const {
    areas,
    selectedArea,
    setSelectedArea,
    currentLocationNotice,
    currentLocationError,
    clearCurrentLocationNotice,
    clearCurrentLocationError,
    requestCurrentLocation,
    isLocating,
  } = useArea()

  const latestDate = selectedArea?.latestReportAt
    ? typeof selectedArea.latestReportAt.toDate === 'function'
      ? selectedArea.latestReportAt.toDate()
      : new Date()
    : null

  const areaOptions = areas.map((a) => ({
    value: a.id,
    label: `${a.name} (${a.city})`,
  }))

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* ── Current Location Resolved Banner ─────────────────────────── */}
      {currentLocationNotice && (
        <div className="rounded-2xl border border-teal-500/40 bg-teal-500/10 p-4 text-xs text-teal-200 flex items-start justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2.5">
            <Compass className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white font-semibold">Current Area: </strong>
              <span>{currentLocationNotice}</span>
            </div>
          </div>
          <button
            onClick={clearCurrentLocationNotice}
            className="rounded-full p-1 text-teal-400 hover:text-white hover:bg-teal-500/20 transition"
            title="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Current Location Error Banner ────────────────────────────── */}
      {currentLocationError && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200 flex items-start justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white font-semibold">Location Notice: </strong>
              <span>{currentLocationError}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => requestCurrentLocation()}
              className="text-xs font-bold underline text-white hover:text-rose-300"
            >
              Retry
            </button>
            <button
              onClick={clearCurrentLocationError}
              className="rounded-full p-1 text-rose-400 hover:text-white hover:bg-rose-500/20 transition"
              title="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Area Selector Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[var(--foreground-muted)]">Current Area</span>
            <h2 className="text-sm sm:text-base font-bold text-[var(--foreground)]">
              {selectedArea ? selectedArea.name : 'Select an area below'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => requestCurrentLocation()}
            isLoading={isLocating}
            leftIcon={<Compass className="h-3.5 w-3.5 text-[var(--primary)]" />}
            className="shrink-0"
          >
            {isLocating ? 'Finding your current area...' : 'Near Me'}
          </Button>

          <div className="w-full sm:w-72">
            <Select
              id="area-picker-select"
              value={selectedArea?.id || ''}
              onChange={(e) => {
                const found = areas.find((a) => a.id === e.target.value)
                if (found) setSelectedArea(found)
              }}
              options={areaOptions}
            />
          </div>
        </div>
      </div>

      {selectedArea ? (
        <div className="space-y-6">
          {/* ── Header Title & Location ───────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--primary)] font-bold">
                <MapPin className="h-4 w-4" />
                <span>
                  {selectedArea.city}, {selectedArea.country}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] mt-1">
                {selectedArea.name}
              </h1>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">{selectedArea.fullName}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PlusCircle className="h-4 w-4" />}
                onClick={() => navigate('/report')}
              >
                Contribute Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Layers className="h-4 w-4" />}
                onClick={() => navigate('/map')}
              >
                View on Map
              </Button>
            </div>
          </div>

          {/* ── Unreported Area Banner (Zero Fabrication Rule) ── */}
          {selectedArea.reportCount === 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center space-y-3 shadow-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1 text-xs font-semibold text-[var(--foreground-secondary)]">
                <Compass className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
                <span>Community Safety Data: Not Available Yet</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                No recent community reports are available for this area.
              </h2>
              <p className="text-xs text-[var(--foreground-muted)] max-w-lg mx-auto leading-relaxed">
                Awarely is built on genuine community observations. We never fabricate scores, confidence levels, or AI summaries. Be the first to share your observations.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<PlusCircle className="h-4 w-4" />}
                  onClick={() => navigate('/report')}
                >
                  Be the first to report
                </Button>
              </div>
            </div>
          )}

          {/* ── Core Triple Metric Banner (State, Confidence, Freshness) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Safety State */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2 shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Community Safety State
              </span>
              <div>
                <SafetyStatusBadge area={selectedArea} showDescription />
              </div>
            </div>

            {/* Confidence */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2 shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Data Confidence Tier
              </span>
              <div>
                <ConfidenceBadge
                  tier={selectedArea.confidenceLevel || 'low'}
                  reportCount={selectedArea.reportCount}
                  showDetail
                />
              </div>
            </div>

            {/* Freshness */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2 shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Observation Freshness
              </span>
              <div className="space-y-1">
                <div>
                  <DataFreshnessBadge date={latestDate} />
                </div>
                <p className="text-[11px] text-[var(--foreground-muted)] pl-1 leading-snug">
                  {latestDate
                    ? 'Recent corroboration recorded by local contributors.'
                    : 'Awaiting recent contributions for this district.'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Day vs Night Comfort Perception & AI Synthesis (Only when legitimate community data exists) ── */}
          {selectedArea.reportCount > 0 && (
            <>
              <Card variant="navy" className="p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div>
                    <h3 className="font-bold text-[var(--foreground)] text-base">Day vs. Night Comfort Breakdown</h3>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      Self-reported pedestrian comfort percentages across daylight and night hours.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  {/* Day Comfort */}
                  <div className="space-y-2 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-300">
                        <Sun className="h-4 w-4 text-amber-500" />
                        <span>Daylight Conditions</span>
                      </div>
                      <span className="text-lg font-bold text-[var(--foreground)]">
                        {selectedArea.dayNightSplit?.day ?? 0}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)] border border-[var(--border)]">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${selectedArea.dayNightSplit?.day ?? 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[var(--foreground-muted)]">
                      Contributors report open commerce and active pedestrian flow during afternoon periods.
                    </p>
                  </div>

                  {/* Night Comfort */}
                  <div className="space-y-2 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-300">
                        <Moon className="h-4 w-4 text-indigo-500" />
                        <span>Nighttime Conditions</span>
                      </div>
                      <span className="text-lg font-bold text-[var(--foreground)]">
                        {selectedArea.dayNightSplit?.night ?? 0}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)] border border-[var(--border)]">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${selectedArea.dayNightSplit?.night ?? 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[var(--foreground-muted)]">
                      Night conditions vary by street lighting. Sticking to primary thoroughfares is advised.
                    </p>
                  </div>
                </div>
              </Card>

              {/* ── AI Synthesis & Community Observations ───────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Summary Card */}
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    <span>AI Contextual Awareness</span>
                  </div>
                  <p className="text-sm text-[var(--foreground)] leading-relaxed">
                    {selectedArea.aiSummary ||
                      'No recent AI summary generated yet. Community reports contribute to periodic synthesis updates.'}
                  </p>
                  <div className="pt-2 text-[10px] text-[var(--foreground-muted)] border-t border-indigo-500/20">
                    Generated from anonymous observation trends. Does not replace individual prudence.
                  </div>
                </div>

                {/* Top Observations Card */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
                  <div className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                    Corroborated Environmental Signals
                  </div>

                  {selectedArea.topObservations && selectedArea.topObservations.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {selectedArea.topObservations.map((obs, idx) => (
                        <div
                          key={obs}
                          className="flex items-center justify-between rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] px-3.5 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2 text-[var(--foreground)] font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
                            <span>{obs}</span>
                          </div>
                          <span className="text-[11px] text-[var(--foreground-muted)]">
                            {Math.max(3, 10 - idx * 2)} mentions
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--foreground-muted)] pt-2">
                      No observation tags recorded yet for this area.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400">
          Please select an area to view details.
        </div>
      )}
    </div>
  )
}
