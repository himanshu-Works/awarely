import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  PlusCircle,
  Info,
  Compass,
  X,
} from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { AwarelyMap } from '@/components/map/AwarelyMap'
import { MapLegend } from '@/components/map/MapLegend'
import { SafetyStatusBadge } from '@/components/awareness/SafetyStatusBadge'
import { ConfidenceBadge } from '@/components/design-system/ConfidenceBadge'
import { DataFreshnessBadge } from '@/components/awareness/DataFreshnessBadge'
import { Button } from '@/components/design-system/Button'
import { AreaSearchBar } from '@/components/search/AreaSearchBar'

export function SafetyMapPage() {
  const navigate = useNavigate()
  const {
    areas,
    selectedArea,
    setSelectedArea,
    coarseLocation,
    isLocating,
    requestCoarseLocation,
    lastElevationNotice,
    clearElevationNotice,
    currentLocationNotice,
    clearCurrentLocationNotice,
  } = useArea()

  const [filterCity, setFilterCity] = useState<string>('all')

  const cities = useMemo(() => {
    const set = new Set<string>()
    areas.forEach((a) => {
      if (a.city) set.add(a.city)
    })
    if (selectedArea?.city) {
      set.add(selectedArea.city)
    }
    return ['all', ...Array.from(set)]
  }, [areas, selectedArea])

  const filteredAreas =
    filterCity === 'all' ? areas : areas.filter((a) => a.city === filterCity)

  const latestDate = selectedArea?.latestReportAt
    ? typeof selectedArea.latestReportAt.toDate === 'function'
      ? selectedArea.latestReportAt.toDate()
      : new Date()
    : null

  const isUnreported = selectedArea ? selectedArea.reportCount === 0 : false

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-[var(--background)]">
      {/* ── Vector & Cartography Canvas ─────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <AwarelyMap
          areas={filteredAreas}
          selectedArea={selectedArea}
          onSelectArea={(area) => setSelectedArea(area)}
          userCoarseLocation={coarseLocation}
          onRequestLocation={requestCoarseLocation}
          locating={isLocating}
        />
      </div>

      {/* ── Top Floating Overlays ────────────────────────────────────── */}
      <div className="relative z-20 flex flex-col gap-3 p-3 sm:p-4 pointer-events-none">
        {/* Search Bar & City Selector Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Autocomplete Search Bar */}
          <div className="pointer-events-auto w-full sm:max-w-md shadow-2xl">
            <AreaSearchBar
              placeholder="Search locality, market, station, or chowk on map…"
              size="md"
              onAreaResolved={(area) => {
                setSelectedArea(area)
              }}
            />
          </div>

          {/* City Pills & Map Legend */}
          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-1 shadow-xl backdrop-blur-md">
              {cities.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilterCity(c)}
                  className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                    filterCity === c
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
                      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {c === 'all' ? 'All' : c}
                </button>
              ))}
            </div>
            <MapLegend />
          </div>
        </div>

        {/* Current Location Resolved Notice */}
        {currentLocationNotice && (
          <div className="pointer-events-auto max-w-xl rounded-2xl border border-teal-500/40 bg-[var(--surface)]/95 p-3.5 text-xs text-teal-800 dark:text-teal-200 flex items-start justify-between gap-3 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-2">
              <Compass className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--foreground)] font-semibold">Current Area: </strong>
                {currentLocationNotice}
              </div>
            </div>
            <button
              onClick={clearCurrentLocationNotice}
              className="text-teal-500 hover:text-[var(--foreground)] p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Road-to-Area Elevation Notice */}
        {lastElevationNotice && (
          <div className="pointer-events-auto max-w-xl rounded-2xl border border-amber-500/40 bg-[var(--surface)]/95 p-3.5 text-xs text-amber-800 dark:text-amber-200 flex items-start justify-between gap-3 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--foreground)] font-semibold">Area-Level Context: </strong>
                {lastElevationNotice}
              </div>
            </div>
            <button
              onClick={clearElevationNotice}
              className="text-amber-500 hover:text-[var(--foreground)] p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom Floating Area Snapshot Card ──────────────────────── */}
      {selectedArea && (
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex justify-center px-3 sm:px-4">
          <div className="pointer-events-auto w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-3 animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--primary)] font-semibold">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>
                    {selectedArea.city}, {selectedArea.country}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--foreground)]">
                  {selectedArea.name}
                </h2>
              </div>

              {/* Confidence Badge */}
              <div className="hidden sm:flex items-center gap-2">
                <ConfidenceBadge
                  tier={selectedArea.confidenceLevel || 'low'}
                  reportCount={selectedArea.reportCount}
                />
              </div>
            </div>

            {/* UNREPORTED AREA: Strict Non-Fabrication Rule */}
            {isUnreported ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-0.5 text-xs font-semibold text-[var(--foreground-secondary)]">
                  <Compass className="h-3 w-3 text-[var(--foreground-muted)]" />
                  <span>Limited community data</span>
                </div>
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  No community reports yet for this area.
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Awarely does not simulate safety scores. Be the first to share your observation.
                </p>
                <div className="pt-1 flex items-center justify-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<PlusCircle className="h-4 w-4" />}
                    onClick={() => navigate('/report')}
                  >
                    Be the first to report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/area')}
                  >
                    Area Details
                  </Button>
                </div>
              </div>
            ) : (
              /* MONITORED AREA: Badges & Summary */
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <SafetyStatusBadge area={selectedArea} />
                  <div className="sm:hidden">
                    <ConfidenceBadge
                      tier={selectedArea.confidenceLevel || 'low'}
                      reportCount={selectedArea.reportCount}
                    />
                  </div>
                  <DataFreshnessBadge date={latestDate} />
                </div>

                {selectedArea.aiSummary && (
                  <p className="text-xs text-[var(--foreground-secondary)] line-clamp-2 leading-relaxed bg-[var(--surface-muted)] p-2.5 rounded-xl border border-[var(--border)]">
                    {selectedArea.aiSummary}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    leftIcon={<PlusCircle className="h-4 w-4" />}
                    onClick={() => navigate('/report')}
                  >
                    Contribute Observation
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Info className="h-4 w-4" />}
                    onClick={() => navigate('/area')}
                  >
                    Full Details
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
