import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  ArrowRight,
  Info,
  PlusCircle,
  Layers,
  X,
  Compass,
  AlertTriangle,
} from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { SafetyStatusBadge } from '@/components/awareness/SafetyStatusBadge'
import { ConfidenceBadge } from '@/components/design-system/ConfidenceBadge'
import { DataFreshnessBadge } from '@/components/awareness/DataFreshnessBadge'
import { Button } from '@/components/design-system/Button'
import { EmptyState } from '@/components/design-system/EmptyState'
import { AreaSearchBar } from '@/components/search/AreaSearchBar'
import { getAreaSafetyState } from '@/utils/safety'
import type { Area } from '@/types/area'

export function SearchAreaPage() {
  const navigate = useNavigate()
  const {
    areas,
    selectedArea,
    setSelectedArea,
    lastElevationNotice,
    clearElevationNotice,
    currentLocationNotice,
    currentLocationError,
    clearCurrentLocationNotice,
    clearCurrentLocationError,
    requestCurrentLocation,
    isLocating,
  } = useArea()

  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('all')

  const cities = useMemo(() => {
    const set = new Set(areas.map((a) => a.city))
    return ['all', ...Array.from(set)]
  }, [areas])

  const filteredAreas = useMemo(() => {
    return areas.filter((area) => {
      const matchesCity = selectedCity === 'all' || area.city === selectedCity
      const stateConfig = getAreaSafetyState(area)
      const matchesState =
        selectedStateFilter === 'all' || stateConfig.key === selectedStateFilter
      return matchesCity && matchesState
    })
  }, [areas, selectedCity, selectedStateFilter])

  function handleSelectArea(area: Area) {
    setSelectedArea(area)
  }

  function handleViewDetails(area: Area) {
    setSelectedArea(area)
    navigate('/area')
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          Area Search & Discovery
        </h1>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Awarely indexes community environmental context by <strong className="text-[var(--foreground)]">locality, neighborhood, market, station area, and chowk</strong>.
        </p>
      </div>

      {/* ── Road Elevation Communication Banner ──────────────────────── */}
      {lastElevationNotice && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-start justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--foreground)] font-semibold">Area-Level Elevation Notice: </strong>
              {lastElevationNotice}
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-1">
                To guarantee contributor privacy and statistical robustness, Awarely does not create street- or lane-level profiles.
              </p>
            </div>
          </div>

          <button
            onClick={clearElevationNotice}
            className="rounded-full p-1 text-amber-500 hover:text-[var(--foreground)] hover:bg-amber-500/20 transition"
            title="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Current Location Resolved Banner ─────────────────────────── */}
      {currentLocationNotice && (
        <div className="rounded-2xl border border-teal-500/40 bg-teal-500/10 p-4 text-xs text-teal-800 dark:text-teal-200 flex items-start justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2.5">
            <Compass className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--foreground)] font-semibold">Current Area: </strong>
              <span>{currentLocationNotice}</span>
            </div>
          </div>
          <button
            onClick={clearCurrentLocationNotice}
            className="rounded-full p-1 text-teal-500 hover:text-[var(--foreground)] hover:bg-teal-500/20 transition"
            title="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Current Location Error Banner ────────────────────────────── */}
      {currentLocationError && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-800 dark:text-rose-200 flex items-start justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--foreground)] font-semibold">Location Notice: </strong>
              <span>{currentLocationError}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => requestCurrentLocation()}
              className="text-xs font-bold underline text-[var(--foreground)] hover:text-rose-600 dark:hover:text-rose-300"
            >
              Retry
            </button>
            <button
              onClick={clearCurrentLocationError}
              className="rounded-full p-1 text-rose-500 hover:text-[var(--foreground)] hover:bg-rose-500/20 transition"
              title="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Autocomplete Search Bar & Filters ────────────────────────── */}
      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <AreaSearchBar
              placeholder="Search by locality, neighborhood, market, station, or chowk (e.g. Bandra, Colaba, Crawford Market, Soho)..."
              autoFocus={false}
              size="lg"
              onAreaResolved={(area) => {
                setSelectedArea(area)
              }}
            />
          </div>
          <Button
            variant="outline"
            size="md"
            onClick={async () => {
              const success = await requestCurrentLocation()
              if (success) {
                navigate('/area')
              }
            }}
            isLoading={isLocating}
            leftIcon={<Compass className="h-4 w-4 text-[var(--primary)]" />}
            className="shrink-0 h-12"
          >
            {isLocating ? 'Finding your current area...' : 'Near Me'}
          </Button>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
          {/* City Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--foreground-muted)] mr-1">City:</span>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  selectedCity === city
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
                    : 'bg-[var(--surface-muted)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-elevated)] border border-[var(--border)]'
                }`}
              >
                {city === 'all' ? 'All Cities' : city}
              </button>
            ))}
          </div>

          {/* Safety State Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--foreground-muted)] mr-1">Condition:</span>
            {[
              { id: 'all', label: 'All States' },
              { id: 'generally-positive', label: 'Positive' },
              { id: 'caution', label: 'Caution' },
              { id: 'higher-concern', label: 'Higher Concern' },
              { id: 'limited-data', label: 'Limited Data' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStateFilter(st.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  selectedStateFilter === st.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-[var(--surface-muted)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-elevated)] border border-[var(--border)]'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active Selected Area Focus ───────────────────────────────── */}
      {selectedArea && (
        <div className="rounded-2xl border border-[var(--primary)]/40 bg-[var(--surface)] p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--primary)] font-bold">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {selectedArea.city}, {selectedArea.country}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--foreground)] mt-0.5">{selectedArea.name}</h2>
              <p className="text-xs text-[var(--foreground-muted)]">{selectedArea.fullName}</p>
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

          {/* If the area has NO community reports yet (Zero Fabrication) */}
          {selectedArea.reportCount === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-0.5 text-xs font-semibold text-[var(--foreground-secondary)]">
                <Compass className="h-3 w-3 text-[var(--foreground-muted)]" />
                <span>Limited community data</span>
              </div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">No community reports yet for this area.</h3>
              <p className="text-xs text-[var(--foreground-muted)] max-w-md mx-auto">
                Awarely never fabricates or assumes safety scores. We rely on anonymous observations from neighbors and travelers like you.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<PlusCircle className="h-4 w-4" />}
                  onClick={() => navigate('/report')}
                >
                  Be the first to report
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <SafetyStatusBadge area={selectedArea} showDescription />
              <ConfidenceBadge
                tier={selectedArea.confidenceLevel || 'low'}
                reportCount={selectedArea.reportCount}
                showDetail
              />
              <DataFreshnessBadge
                date={
                  selectedArea.latestReportAt
                    ? typeof selectedArea.latestReportAt.toDate === 'function'
                      ? selectedArea.latestReportAt.toDate()
                      : new Date()
                    : null
                }
              />
            </div>
          )}
        </div>
      )}

      {/* ── Monitored Areas Grid ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)] px-1">
          <span>
            Displaying <strong className="text-[var(--foreground)]">{filteredAreas.length}</strong> monitored areas
          </span>
        </div>

        {filteredAreas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAreas.map((area) => {
              const isSelected = selectedArea?.id === area.id
              const latestDate = area.latestReportAt
                ? typeof area.latestReportAt.toDate === 'function'
                  ? area.latestReportAt.toDate()
                  : new Date()
                : null

              return (
                <div
                  key={area.id}
                  onClick={() => handleSelectArea(area)}
                  className={`cursor-pointer rounded-2xl border p-5 transition relative flex flex-col justify-between space-y-4 shadow-lg ${
                    isSelected
                      ? 'border-[var(--primary)] bg-[var(--surface-elevated)] ring-1 ring-[var(--primary)]/30'
                      : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--primary)] font-medium">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>
                            {area.city}, {area.country}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] mt-0.5">
                          {area.name}
                        </h3>
                      </div>

                      {isSelected && (
                        <span className="rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/40 px-2 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                          SELECTED
                        </span>
                      )}
                    </div>

                    {/* Distinct Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <SafetyStatusBadge area={area} />
                      <ConfidenceBadge
                        tier={area.confidenceLevel || 'low'}
                        reportCount={area.reportCount}
                      />
                      <DataFreshnessBadge date={latestDate} />
                    </div>

                    {/* Report count or Unreported Area callout */}
                    {area.reportCount === 0 ? (
                      <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">
                        No community reports yet for this area. Limited community data.
                      </p>
                    ) : area.aiSummary ? (
                      <p className="text-xs text-[var(--foreground-secondary)] line-clamp-2 leading-relaxed">
                        {area.aiSummary}
                      </p>
                    ) : null}

                    {/* Top Observations */}
                    {area.topObservations && area.topObservations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {area.topObservations.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--foreground-secondary)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
                    <span className="text-[var(--foreground-muted)]">
                      {area.reportCount === 0 ? (
                        <span className="text-[var(--primary)] font-medium">Be the first to report</span>
                      ) : (
                        `${area.reportCount} community reports`
                      )}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewDetails(area)
                      }}
                      className="flex items-center gap-1 font-semibold text-[var(--primary)] hover:underline"
                    >
                      <span>View Details</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title="No matching neighborhoods found"
            description="No areas match the current filters. Search for any global neighborhood, locality, station area, or market."
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedCity('all')
                  setSelectedStateFilter('all')
                }}
              >
                Clear Filters
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}
