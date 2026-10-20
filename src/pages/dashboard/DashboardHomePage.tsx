import { Link, useNavigate } from 'react-router-dom'
import {
  MapPin,
  Sparkles,
  PlusCircle,
  Users,
  Search,
  ArrowRight,
  Sun,
  Moon,
  Shield,
  AlertCircle,
  AlertTriangle,
  Compass,
  X,
} from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { SafetyStatusBadge } from '@/components/awareness/SafetyStatusBadge'
import { ConfidenceBadge } from '@/components/design-system/ConfidenceBadge'
import { DataFreshnessBadge } from '@/components/awareness/DataFreshnessBadge'
import { Card } from '@/components/design-system/Card'
import { Button } from '@/components/design-system/Button'
import { EmptyState } from '@/components/design-system/EmptyState'

export function DashboardHomePage() {
  const navigate = useNavigate()
  const {
    selectedArea,
    isLocating,
    requestCurrentLocation,
    currentLocationNotice,
    currentLocationError,
    clearCurrentLocationNotice,
    clearCurrentLocationError,
  } = useArea()

  const latestDate = selectedArea?.latestReportAt
    ? typeof selectedArea.latestReportAt.toDate === 'function'
      ? selectedArea.latestReportAt.toDate()
      : new Date()
    : null

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* ── Current Location Resolved Banner ─────────────────────────── */}
      {currentLocationNotice && (
        <div className="rounded-2xl border border-teal-500/40 bg-teal-500/10 p-4 text-xs text-teal-200 flex items-start justify-between gap-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2.5">
            <Compass className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white font-semibold">Location Notice: </strong>
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

      {/* ── Hero Communicating Awarely Purpose (Semantic Theme Token Hero) ── */}
      <section className="hero-banner relative overflow-hidden rounded-3xl border border-[var(--border)] p-6 sm:p-10 shadow-xl transition-colors duration-200">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-3.5 py-1 text-xs font-bold text-[var(--primary)]">
            <Shield className="h-3.5 w-3.5" />
            <span>Community-Powered Safety Awareness</span>
          </div>

          <h1 className="hero-title text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Understand the safety context of the area around you.
          </h1>

          <p className="hero-description text-sm sm:text-base leading-relaxed">
            Awarely aggregates community observations, street illumination, and pedestrian activity into clear, non-judgmental neighborhood context.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusCircle className="h-4 w-4" />}
              onClick={() => navigate('/report')}
            >
              Report Observations
            </Button>

            <Button
              variant="outline"
              size="md"
              leftIcon={<Search className="h-4 w-4" />}
              onClick={() => navigate('/search')}
            >
              Search Area
            </Button>

            <button
              onClick={async () => {
                const success = await requestCurrentLocation()
                if (success) {
                  navigate('/area')
                }
              }}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 px-4 py-2.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition disabled:opacity-50"
            >
              <Compass className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Finding your current area...' : 'Near Me (Current Location)'}</span>
            </button>
          </div>
        </div>

        {/* Ambient background accent */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--primary)]/10 blur-3xl pointer-events-none" />
      </section>

      {/* ── Active Area Spotlight (Distinguishes State, Confidence, Freshness) ── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
              Current Selected Neighborhood
            </span>
            <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[var(--primary)]" />
              {selectedArea ? `${selectedArea.name}, ${selectedArea.city}` : 'No Area Selected'}
            </h2>
          </div>

          {selectedArea && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/area')}
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                Full Area Details
              </Button>
            </div>
          )}
        </div>

        {selectedArea ? (
          <Card variant="navy" className="p-6 shadow-xl space-y-6">
            {/* The 3 Distinct Dimensions Required by Awarely */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-[var(--border)] pb-5">
              {/* 1. Safety State */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  1. Safety State
                </span>
                <div>
                  <SafetyStatusBadge area={selectedArea} showDescription />
                </div>
              </div>

              {/* 2. Confidence Level */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  2. Confidence Level
                </span>
                <div>
                  <ConfidenceBadge
                    tier={selectedArea.confidenceLevel || 'low'}
                    reportCount={selectedArea.reportCount}
                    showDetail
                  />
                </div>
              </div>

              {/* 3. Data Freshness */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  3. Data Freshness
                </span>
                <div className="flex flex-col gap-1">
                  <div>
                    <DataFreshnessBadge date={latestDate} />
                  </div>
                  <span className="text-[11px] text-[var(--foreground-muted)] pl-1">
                    {latestDate
                      ? 'Based on recent community observation submissions.'
                      : 'No recent contributions logged yet for this location.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics & Comfort Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-4">
                <span className="text-xs text-[var(--foreground-muted)]">Total Reports</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[var(--foreground)]">
                    {selectedArea.reportCount}
                  </span>
                  <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                    +{selectedArea.recentReportCount} recent
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-4">
                <span className="text-xs text-[var(--foreground-muted)]">Daytime Comfort</span>
                <div className="mt-1 flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <span className="text-2xl font-bold text-[var(--foreground)]">
                    {selectedArea.dayNightSplit?.day ?? 0}%
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-4">
                <span className="text-xs text-[var(--foreground-muted)]">Night Comfort</span>
                <div className="mt-1 flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <span className="text-2xl font-bold text-[var(--foreground)]">
                    {selectedArea.dayNightSplit?.night ?? 0}%
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-4">
                <span className="text-xs text-[var(--foreground-muted)]">AI Context</span>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-300 font-medium">
                  <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span className="truncate">
                    {selectedArea.aiSummary ? 'Available' : 'Pending Data'}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Summary Teaser */}
            {selectedArea.aiSummary && (
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 dark:bg-indigo-950/20 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <span>AI Community Synthesis</span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--foreground-secondary)] leading-relaxed">
                  {selectedArea.aiSummary}
                </p>
              </div>
            )}

            {/* Top Observations */}
            {selectedArea.topObservations && selectedArea.topObservations.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                  Reported Community Observations
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedArea.topObservations.map((obs) => (
                    <span
                      key={obs}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--foreground-secondary)] font-medium"
                    >
                      {obs}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <EmptyState
            title="No area currently selected"
            description="Choose an area from the search list or map to view real-time community context."
            action={
              <Button variant="primary" size="sm" onClick={() => navigate('/search')}>
                Browse Areas
              </Button>
            }
          />
        )}
      </section>

      {/* ── Quick Navigation Cards ────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--foreground)]">Application Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/map"
            className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--primary)]/50 hover:bg-[var(--surface-elevated)] transition shadow-sm space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition">
                <Compass className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--foreground-muted)] group-hover:text-[var(--foreground)] group-hover:translate-x-1 transition" />
            </div>
            <h3 className="font-bold text-[var(--foreground)]">Safety Map</h3>
            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              Explore neighborhoods, vector boundaries, and community signals across cities.
            </p>
          </Link>

          <Link
            to="/insights"
            className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--primary)]/50 hover:bg-[var(--surface-elevated)] transition shadow-sm space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition">
                <Sparkles className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--foreground-muted)] group-hover:text-[var(--foreground)] group-hover:translate-x-1 transition" />
            </div>
            <h3 className="font-bold text-[var(--foreground)]">AI Safety Insights</h3>
            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              Synthesized, neutral analysis of pedestrian comfort and time-of-day awareness advice.
            </p>
          </Link>

          <Link
            to="/circle"
            className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--primary)]/50 hover:bg-[var(--surface-elevated)] transition shadow-sm space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition">
                <Users className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--foreground-muted)] group-hover:text-[var(--foreground)] group-hover:translate-x-1 transition" />
            </div>
            <h3 className="font-bold text-[var(--foreground)]">Trusted Safety Circle</h3>
            <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
              Quick check-ins with your emergency contacts and instant audio distress siren.
            </p>
          </Link>
        </div>
      </section>

      {/* ── Important Safety & Privacy Notice ─────────────────────────── */}
      <footer className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--foreground-muted)] leading-relaxed shadow-sm">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-[var(--foreground)]">Safety Context Disclaimer: </strong>
            Awarely provides community-reported contextual awareness, not absolute guarantees of safety. Never enter areas where you feel uncomfortable. In urgent or life-threatening situations, contact local emergency dispatch (112 / 999 / 911) immediately.
          </div>
        </div>
      </footer>
    </div>
  )
}
