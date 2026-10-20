import { useState, useEffect } from 'react'
import {
  Sparkles,
  Bot,
  Sun,
  Sunset,
  Moon,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { SafetyStatusBadge } from '@/components/awareness/SafetyStatusBadge'
import { ConfidenceBadge } from '@/components/design-system/ConfidenceBadge'
import { Card } from '@/components/design-system/Card'
import { Select } from '@/components/design-system/Select'
import {
  aiSafetyEngineService,
} from '@/services/ai-safety-engine.service'
import type { AreaSummaryDoc } from '@/types/area-summary'

export function AiInsightsPage() {
  const { areas, selectedArea, setSelectedArea } = useArea()
  const [summaryDoc, setSummaryDoc] = useState<AreaSummaryDoc | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [isCached, setIsCached] = useState<boolean>(true)

  // Fetch or load cached summary whenever selectedArea changes
  useEffect(() => {
    let isCancelled = false

    async function loadSummary() {
      if (!selectedArea) return
      setLoading(true)
      try {
        const { summaryDoc: doc, cached } = await aiSafetyEngineService.getOrGenerateAreaSummary(
          selectedArea,
          false,
        )
        if (!isCancelled) {
          setSummaryDoc(doc)
          setIsCached(cached)
        }
      } catch (err) {
        console.warn('[AiInsightsPage] Failed to load AI summary:', err)
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    loadSummary()
    return () => {
      isCancelled = true
    }
  }, [selectedArea?.id, selectedArea?.reportCount])

  async function handleForceRefresh() {
    if (!selectedArea) return
    setLoading(true)
    try {
      const { summaryDoc: doc, cached } = await aiSafetyEngineService.getOrGenerateAreaSummary(
        selectedArea,
        true,
      )
      setSummaryDoc(doc)
      setIsCached(cached)
    } catch (err) {
      console.warn('[AiInsightsPage] Failed to force refresh AI summary:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>AI Safety Insights Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Contextual Community Intelligence
          </h1>
          <p className="text-sm text-[var(--foreground-secondary)]">
            Automated synthesis of anonymous observations into grounded environmental context.
          </p>
        </div>

        {/* Area Switcher */}
        <div className="w-full sm:w-64">
          <Select
            id="insights-area-select"
            value={selectedArea?.id || ''}
            onChange={(e) => {
              const found = areas.find((a) => a.id === e.target.value)
              if (found) setSelectedArea(found)
            }}
            options={areas.map((a) => ({
              value: a.id,
              label: `${a.name} (${a.city})`,
            }))}
          />
        </div>
      </div>

      {selectedArea ? (
        <div className="space-y-6">
          {/* ── Spotlight Synthesis Card ───────────────────────────────── */}
          <div className="rounded-3xl border border-indigo-500/30 bg-[var(--surface)] p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
              <div>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Synthesized Analysis For</span>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                  {selectedArea.name} ({selectedArea.city})
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--foreground-secondary)] bg-[var(--surface-muted)] px-3 py-1 rounded-xl border border-[var(--border)] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-teal-500" />
                  <span>{summaryDoc?.freshnessText || 'Evaluating freshness...'}</span>
                </span>

                <button
                  onClick={handleForceRefresh}
                  disabled={loading}
                  className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition disabled:opacity-50"
                  title="Force re-synthesis"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <SafetyStatusBadge area={selectedArea} showDescription />
              <ConfidenceBadge
                tier={selectedArea.confidenceLevel || 'low'}
                reportCount={selectedArea.reportCount}
                showDetail
              />
              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                {isCached ? 'Cached Synthesis' : 'Freshly Evaluated'}
              </span>
            </div>

            {/* Core AI Narrative */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <Bot className="h-4 w-4 text-indigo-500" />
                  <span>Executive Summary</span>
                </div>
                <span className="text-[11px] text-[var(--foreground-muted)]">
                  Model: {summaryDoc?.modelVersion || 'gemini-1.5-flash'}
                </span>
              </div>
              <p className="text-sm sm:text-base text-[var(--foreground)] leading-relaxed font-normal">
                {summaryDoc?.summaryText ||
                  'Currently analyzing community reports for this area. Synthesized context will appear here as observations are confirmed.'}
              </p>
            </div>

            {/* ── Separate Time-of-Day Context Breakdowns (Day, Evening, Night) ── */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Time-of-Day Environmental Insights
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Day Breakdown */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                      <Sun className="h-4 w-4 text-amber-500" />
                      <span>Daylight (06:00 – 17:00)</span>
                    </div>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                      {summaryDoc?.day.comfortScore ?? selectedArea.timeScores?.day ?? 70}/100
                    </span>
                  </div>
                  <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                    {summaryDoc?.day.summaryText || 'Active daytime pedestrian movement across primary thoroughfares.'}
                  </p>
                  {summaryDoc?.day.topObservations && summaryDoc.day.topObservations.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {summaryDoc.day.topObservations.map((obs) => (
                        <span key={obs} className="text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                          {obs}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Evening Breakdown */}
                <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700 dark:text-orange-300">
                      <Sunset className="h-4 w-4 text-orange-500" />
                      <span>Evening (17:00 – 21:00)</span>
                    </div>
                    <span className="text-xs font-bold text-orange-700 dark:text-orange-300">
                      {summaryDoc?.evening.comfortScore ?? selectedArea.timeScores?.evening ?? 60}/100
                    </span>
                  </div>
                  <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                    {summaryDoc?.evening.summaryText || 'Commuter traffic and market storefront activity sustained until dusk.'}
                  </p>
                  {summaryDoc?.evening.topObservations && summaryDoc.evening.topObservations.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {summaryDoc.evening.topObservations.map((obs) => (
                        <span key={obs} className="text-[10px] bg-orange-500/15 text-orange-800 dark:text-orange-300 px-2 py-0.5 rounded-md border border-orange-500/30">
                          {obs}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Night Breakdown */}
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      <Moon className="h-4 w-4 text-indigo-500" />
                      <span>Night (21:00 – 06:00)</span>
                    </div>
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      {summaryDoc?.night.comfortScore ?? selectedArea.timeScores?.night ?? 45}/100
                    </span>
                  </div>
                  <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                    {summaryDoc?.night.summaryText || 'Illumination concentrated on arterial roads; quiet side lanes.'}
                  </p>
                  {summaryDoc?.night.topObservations && summaryDoc.night.topObservations.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {summaryDoc.night.topObservations.map((obs) => (
                        <span key={obs} className="text-[10px] bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/30">
                          {obs}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Key Community Takeaways ─────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="navy" className="p-5 space-y-2 border-[var(--border)]">
              <span className="text-xs text-[var(--foreground-muted)] uppercase font-semibold">
                Illumination Condition
              </span>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {selectedArea.topObservations?.includes('Poor lighting')
                  ? 'Variable / Dim Off Arterials'
                  : 'Well-Lit Primary Corridors'}
              </p>
              <p className="text-[11px] text-[var(--foreground-muted)]">
                Corroborated by active night travelers.
              </p>
            </Card>

            <Card variant="navy" className="p-5 space-y-2 border-[var(--border)]">
              <span className="text-xs text-[var(--foreground-muted)] uppercase font-semibold">
                Pedestrian Density
              </span>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {selectedArea.reportCount > 20
                  ? 'High Foot Traffic'
                  : selectedArea.reportCount > 5
                  ? 'Moderate Activity'
                  : 'Quiet / Sparse'}
              </p>
              <p className="text-[11px] text-[var(--foreground-muted)]">
                Based on time-of-day observation volume.
              </p>
            </Card>

            <Card variant="navy" className="p-5 space-y-2 border-[var(--border)]">
              <span className="text-xs text-[var(--foreground-muted)] uppercase font-semibold">
                Assistance Proximity
              </span>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {selectedArea.topObservations?.includes('Police presence')
                  ? 'Visible Patrol Booths'
                  : 'Standard Civic Coverage'}
              </p>
              <p className="text-[11px] text-[var(--foreground-muted)]">
                Reported by community travelers.
              </p>
            </Card>
          </div>

          {/* ── Non-Judgmental Disclaimer Notice ────────────────────────── */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold text-amber-800 dark:text-amber-200">Ethical AI Transparency & Guardrails: </strong>
              <p className="text-[var(--foreground-secondary)]">
                Awarely AI synthesizes anonymous community perceptions into neutral awareness notes. It never predicts crimes, claims certainty, or classifies neighborhoods as "safe" or "unsafe." Always exercise personal situational judgment.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-[var(--foreground-muted)]">
          Please select an area to view AI insights.
        </div>
      )}
    </div>
  )
}
