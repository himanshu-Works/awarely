import { useState, useEffect } from 'react'
import {
  Terminal,
  Shield,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Compass,
  FileText,
  Calculator,
  Trash2,
  PlusCircle,
  Eye,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useArea } from '@/contexts/AreaContext'
import { authService } from '@/services/auth.service'
import { RestrictedAccess } from '@/components/auth/RestrictedAccess'
import { Card } from '@/components/design-system/Card'
import { Button } from '@/components/design-system/Button'
import { Badge } from '@/components/design-system/Badge'
import { Select } from '@/components/design-system/Select'
import {
  devToolsService,
  type SimulationResult,
  type CalculationExplanation,
} from '@/services/dev-tools.service'
import { scoringService } from '@/services/scoring.service'
import { aiSafetyEngineService } from '@/services/ai-safety-engine.service'
import { locationAwarenessService } from '@/services/location-awareness.service'
import type { UserRole } from '@/types/user'
import type { Report } from '@/types/report'

export function DevToolsPage() {
  const { role, isDev, isAdmin, refreshProfile } = useAuth()
  const {
    areas,
    selectedArea,
    setSelectedArea,
    updateAreaMetrics,
    userReports,
    locationDiagnostic,
    clearLocationDiagnostic,
    requestCurrentLocation,
    isLocating,
  } = useArea()

  // ── ROLE SIMULATOR STATE ───────────────────────────────────────────
  const [activeRole, setActiveRole] = useState<UserRole>(role)
  const [roleSwitchedNotice, setRoleSwitchedNotice] = useState(false)

  // ── ZONE SIMULATION STATE ──────────────────────────────────────────
  const [simResult, setSimResult] = useState<SimulationResult | null>(null)
  const [activeAlertNotice, setActiveAlertNotice] = useState<string | null>(null)
  const [cooldownClearedNotice, setCooldownClearedNotice] = useState(false)

  // ── DEMO DATA & CALCULATION STATE ──────────────────────────────────
  const [demoReports, setDemoReports] = useState<Report[]>([])
  const [explanation, setExplanation] = useState<CalculationExplanation | null>(null)
  const [showRawJson, setShowRawJson] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Guard: Developer or Admin only
  if (!isDev && !isAdmin) {
    return (
      <RestrictedAccess
        requiredRole="Developer or Admin"
        title="Developer Tools Restricted"
        description="This console provides diagnostic controls, role simulation, and zone simulation. Only authorized engineering profiles may access it."
      />
    )
  }

  // Load demo reports and explanation on initial mount or selectedArea change
  useEffect(() => {
    refreshDemoReports()
  }, [selectedArea])

  useEffect(() => {
    if (!selectedArea) return
    try {
      const combinedReports = [
        ...userReports.filter((r) => r.areaId === selectedArea.id),
        ...devToolsService.getAllDemoReports(selectedArea.id),
      ]
      const expl = devToolsService.explainCalculation(selectedArea, combinedReports)
      setExplanation(expl)
    } catch (err: any) {
      console.error('[DevTools] Failed to explain calculation:', err)
      setActionNotice(`Calculation explanation error: ${err?.message || 'unknown error'}`)
    }
  }, [selectedArea, userReports, demoReports])

  // Listen to production alert pipeline broadcasts
  useEffect(() => {
    const unsub = locationAwarenessService.onAlert((alert) => {
      setActiveAlertNotice(
        `[PRODUCTION ALERT PIPELINE] ${alert.alertTitle}: ${alert.alertMessage} (Category: ${alert.state}, Area: ${alert.areaName})`,
      )
    })
    return () => unsub()
  }, [])

  function refreshDemoReports() {
    if (!selectedArea) return
    const all = devToolsService.getAllDemoReports(selectedArea.id)
    setDemoReports(all)
  }

  // ── RBAC ROLE SWITCHER ─────────────────────────────────────────────
  function handleSwitchRole(newRole: UserRole) {
    authService.setMockRole(newRole)
    setActiveRole(newRole)
    refreshProfile()
    setRoleSwitchedNotice(true)
    setTimeout(() => setRoleSwitchedNotice(false), 2500)
  }

  // ── ZONE SIMULATION HANDLERS ───────────────────────────────────────
  function handleSimulateZone(zoneKey: 'danger' | 'warning' | 'safe') {
    setActiveAlertNotice(null)
    const result = devToolsService.simulateZone(zoneKey, areas)
    setSimResult(result)

    // Sync selectedArea in context if matching
    if (result.zone.areaId) {
      const match = areas.find((a) => a.id === result.zone.areaId)
      if (match) setSelectedArea(match)
    }
  }

  function handleResetLocation() {
    setActiveAlertNotice(null)
    const result = devToolsService.simulateZone('outside', areas)
    setSimResult(result)
  }

  function handleClearCooldown() {
    devToolsService.clearAlertCooldowns()
    setCooldownClearedNotice(true)
    setTimeout(() => setCooldownClearedNotice(false), 2500)
    setActionNotice('Alert cooldowns cleared across all areas.')
  }

  function handleResetSimulation() {
    setActiveAlertNotice(null)
    const result = devToolsService.resetSimulation(areas)
    setSimResult(result)
    setActionNotice('Simulation reset: mock location cleared and state set to outside.')
  }

  // ── DEMO REPORTS HANDLERS ──────────────────────────────────────────
  function handleGenerateDemoReports(template: 'danger' | 'caution' | 'safe') {
    if (!selectedArea) return
    try {
      const generated = devToolsService.generateDemoReports(
        selectedArea.id,
        selectedArea.name,
        template,
        5,
      )
      refreshDemoReports()
      setActionNotice(
        `Generated ${generated.length} isolated DEMO reports (${template} profile) for ${selectedArea.name}.`,
      )
    } catch (err: any) {
      console.error('[DevTools] Failed to generate demo reports:', err)
      setActionNotice(`Failed to generate demo reports: ${err?.message || 'unknown error'}`)
    }
  }

  function handleDeleteAllDemoData() {
    try {
      const { deletedCount } = devToolsService.deleteAllDemoData()
      refreshDemoReports()
      setActionNotice(`Deleted ${deletedCount} isolated demo reports.`)
    } catch (err: any) {
      console.error('[DevTools] Failed to delete demo data:', err)
      setActionNotice(`Failed to delete demo data: ${err?.message || 'unknown error'}`)
    }
  }

  // ── SCORE RECOMPUTATION HANDLER ────────────────────────────────────
  async function handleRecomputeScore() {
    if (!selectedArea) return
    try {
      const combinedReports = [
        ...userReports.filter((r) => r.areaId === selectedArea.id),
        ...devToolsService.getAllDemoReports(selectedArea.id),
      ]

      const result = await scoringService.recalculateAreaScore(selectedArea.id)
      updateAreaMetrics(selectedArea.id, {
        overallScore: result.scoreResult.overallScore,
        timeScores: result.scoreResult.timeScores,
        confidenceLevel:
          result.scoreResult.confidence === 'medium' ? 'moderate' : result.scoreResult.confidence,
        awarenessLevel:
          result.scoreResult.safetyState === 'higher-concern'
            ? 'quiet'
            : result.scoreResult.safetyState === 'caution'
            ? 'mixed'
            : 'active',
        reportCount: combinedReports.length,
      })

      const expl = devToolsService.explainCalculation(selectedArea, combinedReports)
      setExplanation(expl)
      setActionNotice(`Score successfully recomputed for ${selectedArea.name}.`)
    } catch (err: any) {
      console.error('[DevTools] Score recomputation failed:', err)
      setActionNotice(`Score recomputation failed: ${err?.message || 'unknown error'}`)
    }
  }

  // ── AI SUMMARY TEST HANDLERS ───────────────────────────────────────
  const [aiGenerating, setAiGenerating] = useState(false)

  async function handleTestAiSummary() {
    if (!selectedArea) return
    setAiGenerating(true)
    try {
      const { summaryDoc, cached } = await aiSafetyEngineService.getOrGenerateAreaSummary(selectedArea, true)
      updateAreaMetrics(selectedArea.id, {
        aiSummary: summaryDoc.summaryText,
        aiSummaryGeneratedAt: summaryDoc.generatedAt,
      })
      setActionNotice(
        `AI Summary successfully generated for ${selectedArea.name} (${cached ? 'cached' : 'freshly synthesized'}).`,
      )
    } catch (err: any) {
      setActionNotice(`AI Summary generation failed: ${err?.message || 'unknown error'}`)
    } finally {
      setAiGenerating(false)
    }
  }

  function handleInvalidateAiCache() {
    if (!selectedArea) return
    aiSafetyEngineService.invalidateCache(selectedArea.id)
    updateAreaMetrics(selectedArea.id, {
      aiSummaryGeneratedAt: null,
    })
    setActionNotice(`AI Summary cache invalidated for ${selectedArea.name}.`)
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-300">
          <Terminal className="h-3.5 w-3.5" />
          <span>Internal Developer Sandbox</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          Developer Tools & Zone Simulator
        </h1>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Role-protected diagnostics, real-pipeline zone simulation, demo data isolation, and calculation
          transparency.
        </p>
      </div>

      {/* Action feedback notice */}
      {actionNotice && (
        <div className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-3.5 text-xs text-teal-700 dark:text-teal-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span>{actionNotice}</span>
          </span>
          <button onClick={() => setActionNotice(null)} className="text-teal-600 dark:text-teal-400 hover:text-[var(--foreground)]">
            ✕
          </button>
        </div>
      )}

      {/* ── SECTION 1: ZONE SIMULATION (Uses Real Production Pipeline) ── */}
      <Card variant="navy" className="p-6 space-y-6 border-amber-500/40 bg-[var(--surface)] shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Compass className="h-4 w-4" />
              <span>Real Production Alert Pipeline</span>
            </span>
            <h2 className="text-xl font-black text-[var(--foreground)]">ZONE SIMULATION</h2>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              Simulates user movement into predefined demo zones. Executes the <strong>same</strong> alert
              pipeline (<code className="text-amber-600 dark:text-amber-300">locationAwarenessService</code>) as genuine GPS
              updates. Reset Location moves to neutral coordinates (0,0) outside monitored areas to trigger geofence exit without invoking real browser geolocation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
              onClick={handleClearCooldown}
            >
              Clear Cooldown
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5 text-rose-500" />}
              onClick={handleResetSimulation}
            >
              Reset Simulation
            </Button>
          </div>
        </div>

        {/* The 4 Core Required Simulation Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Simulate Danger */}
          <button
            onClick={() => handleSimulateZone('danger')}
            className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-left hover:bg-rose-500/20 transition shadow-lg group"
          >
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
              <ShieldAlert className="h-5 w-5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Button 1</span>
            </div>
            <h4 className="text-sm font-bold text-[var(--foreground)] group-hover:text-rose-600 dark:group-hover:text-rose-200">Simulate Danger</h4>
            <p className="text-[11px] text-rose-700 dark:text-rose-200/80 mt-1">Move to Old Delhi Rail Perimeter (Higher Concern)</p>
          </button>

          {/* 2. Simulate Warning */}
          <button
            onClick={() => handleSimulateZone('warning')}
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left hover:bg-amber-500/20 transition shadow-lg group"
          >
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Button 2</span>
            </div>
            <h4 className="text-sm font-bold text-[var(--foreground)] group-hover:text-amber-600 dark:group-hover:text-amber-200">Simulate Warning</h4>
            <p className="text-[11px] text-amber-700 dark:text-amber-200/80 mt-1">Move to Hauz Khas Village (Caution Area)</p>
          </button>

          {/* 3. Simulate Safe */}
          <button
            onClick={() => handleSimulateZone('safe')}
            className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-left hover:bg-emerald-500/20 transition shadow-lg group"
          >
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Button 3</span>
            </div>
            <h4 className="text-sm font-bold text-[var(--foreground)] group-hover:text-emerald-600 dark:group-hover:text-emerald-200">Simulate Safe</h4>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-200/80 mt-1">Move to Connaught Place (Positive Zone)</p>
          </button>

          {/* 4. Reset Location */}
          <button
            onClick={handleResetLocation}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-left hover:border-[var(--border-strong)] transition shadow-lg group"
          >
            <div className="flex items-center justify-between text-[var(--foreground-muted)] mb-2">
              <Compass className="h-5 w-5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Button 4</span>
            </div>
            <h4 className="text-sm font-bold text-[var(--foreground)] group-hover:text-[var(--primary)]">Reset Location</h4>
            <p className="text-[11px] text-[var(--foreground-muted)] mt-1">Reset simulation to neutral/outside monitored areas</p>
          </button>
        </div>

        {/* 5. Current Simulated Zone Status Banner */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-[var(--foreground-muted)]">Current Simulated Zone:</span>
              <span className="text-sm font-black text-[var(--foreground)]">
                {simResult?.zone.name || 'Neutral (Not Simulated Yet)'}
              </span>
              {simResult?.zone.category && (
                <Badge
                  variant={
                    simResult.zone.category === 'higher-concern'
                      ? 'concern'
                      : simResult.zone.category === 'caution'
                      ? 'caution'
                      : 'positive'
                  }
                  size="sm"
                >
                  {simResult.zone.category}
                </Badge>
              )}
            </div>

            <div className="text-xs text-[var(--foreground-muted)] font-mono">
              Coordinates: {simResult ? `${simResult.coords.latitude.toFixed(4)}, ${simResult.coords.longitude.toFixed(4)}` : 'N/A'}
            </div>
          </div>

          {/* Alert Pipeline Status */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs flex items-center justify-between">
            <span className="text-[var(--foreground-muted)]">Production Alert Status:</span>
            {simResult?.alertTriggered ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Real Alert Triggered by Production Pipeline</span>
              </span>
            ) : (
              <span className="text-[var(--foreground-muted)] italic">
                {simResult?.suppressionReason || 'Ready for simulation'}
              </span>
            )}
          </div>

          {/* Broadcast alert preview if triggered */}
          {activeAlertNotice && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-200 animate-in fade-in">
              <strong className="text-[var(--foreground)] block mb-0.5">Live Alert Broadcast Received:</strong>
              {activeAlertNotice}
            </div>
          )}

          {cooldownClearedNotice && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Cooldowns cleared. Next zone entry will immediately trigger alerts.</span>
            </p>
          )}
        </div>
      </Card>

      {/* ── SECTION: LOCATION DIAGNOSTICS (Live One-Shot Geolocation Probe) ── */}
      <Card variant="navy" className="p-6 space-y-6 border-cyan-500/40 bg-[var(--surface)] shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
              <Compass className="h-4 w-4" />
              <span>Device & Geocoding Pipeline Probe</span>
            </span>
            <h2 className="text-xl font-black text-[var(--foreground)]">LOCATION DIAGNOSTICS</h2>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              Transient live diagnostics for demonstrating genuinely fresh one-shot browser geolocation (<code className="text-cyan-600 dark:text-cyan-300">enableHighAccuracy: true, maximumAge: 0</code>) and canonical area resolution. Not persisted.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Compass className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} />}
              disabled={isLocating}
              onClick={async () => {
                const ok = await requestCurrentLocation()
                if (ok) {
                  setActionNotice('Fresh device location successfully requested and resolved.')
                } else {
                  setActionNotice('Location request completed with notice or error.')
                }
              }}
            >
              {isLocating ? 'Finding Area…' : 'Test Near Me Request'}
            </Button>
            {locationDiagnostic && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RotateCcw className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />}
                onClick={clearLocationDiagnostic}
              >
                Clear Probe
              </Button>
            )}
          </div>
        </div>

        {locationDiagnostic ? (
          <div className="space-y-4">
            {/* Grid of Key Diagnostic Properties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Browser Location */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                  Browser Location (Raw Debug)
                </span>
                <div className="text-sm font-bold font-mono text-[var(--foreground)]">
                  {locationDiagnostic.browserCoords
                    ? `${locationDiagnostic.browserCoords.lat.toFixed(4)}, ${locationDiagnostic.browserCoords.lng.toFixed(4)}`
                    : 'N/A'}
                </div>
                <div className="text-[10px] text-cyan-600 dark:text-cyan-400">
                  Accuracy: ±{locationDiagnostic.accuracyMeters !== null ? `${locationDiagnostic.accuracyMeters} m` : 'N/A'}
                </div>
              </div>

              {/* 2. Position Timestamp & Age */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                  Position Timestamp & Age
                </span>
                <div className="text-sm font-bold font-mono text-[var(--foreground)] truncate">
                  {locationDiagnostic.positionTimestamp
                    ? new Date(locationDiagnostic.positionTimestamp).toLocaleTimeString()
                    : 'N/A'}
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400">
                  Request Age: {locationDiagnostic.requestAgeSeconds !== null ? `${locationDiagnostic.requestAgeSeconds}s` : 'N/A'} (maximumAge: 0)
                </div>
              </div>

              {/* 3. Privacy Truncated */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                  Privacy-Truncated (~111m)
                </span>
                <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {locationDiagnostic.privacyTruncatedCoords
                    ? `${locationDiagnostic.privacyTruncatedCoords.lat.toFixed(3)}, ${locationDiagnostic.privacyTruncatedCoords.lng.toFixed(3)}`
                    : 'N/A'}
                </div>
                <div className="text-[10px] text-[var(--foreground-muted)]">
                  Truncated to 3 decimal places
                </div>
              </div>

              {/* 4. Fallback Status */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                  Fallback Used?
                </span>
                <div className="pt-0.5">
                  <Badge variant={locationDiagnostic.fallbackUsed ? 'orange' : 'navy'}>
                    {locationDiagnostic.fallbackUsed ? 'YES (Fallback Active)' : 'NO (Genuine Lookup)'}
                  </Badge>
                </div>
                <div className="text-[10px] text-[var(--foreground-muted)] truncate">
                  {locationDiagnostic.fallbackUsed ? 'Catalog/Dynamic Synthesis' : 'Live Google Geocoder'}
                </div>
              </div>
            </div>

            {/* Resolution Pipeline Details */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                    Reverse Geocoding Result
                  </span>
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    {locationDiagnostic.reverseGeocodeResult || 'Pending reverse geocode'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                    Canonical Awarely Area
                  </span>
                  <div className="text-sm font-bold text-teal-600 dark:text-teal-400">
                    {locationDiagnostic.canonicalArea || 'Unresolved'}
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[var(--foreground-muted)] gap-1">
                <div>
                  <strong className="text-[var(--foreground)]">Resolution Source: </strong>
                  <span>{locationDiagnostic.resolutionSource}</span>
                </div>
                <div className="italic text-[11px]">
                  Zero GPS persistence • Transient React state only
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center space-y-2">
            <Compass className="h-8 w-8 text-[var(--foreground-muted)] mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-[var(--foreground)]">No Active Location Probe Yet</h4>
            <p className="text-xs text-[var(--foreground-muted)] max-w-md mx-auto">
              Click &quot;Test Near Me Request&quot; to invoke a fresh browser location request and inspect raw accuracy, timestamps, reverse geocoding, and canonical area resolution.
            </p>
          </div>
        )}
      </Card>

      {/* ── SECTION 2: DEMO REPORTS & SCORING CONTROLS ───────────────── */}
      <Card variant="navy" className="p-6 space-y-6 border-[var(--border)] bg-[var(--surface)] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>Isolated Demo Data & Area Controls</span>
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              Generate isolated demo reports (tagged <code className="text-teal-600 dark:text-teal-300">isDemo: true</code>) that
              never pollute production community stats.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <Select
              id="dev-area-select"
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Generate Demo Danger */}
          <button
            onClick={() => handleGenerateDemoReports('danger')}
            className="rounded-xl border border-rose-500/30 bg-[var(--surface-muted)] p-3 text-left hover:border-rose-500 transition text-xs"
          >
            <div className="font-bold flex items-center gap-1.5 text-rose-600 dark:text-rose-300">
              <PlusCircle className="h-4 w-4" />
              <span>+5 Danger Demo Reports</span>
            </div>
            <p className="text-[11px] text-[var(--foreground-muted)] mt-1">Poor lighting, isolated tags, rating 1–2</p>
          </button>

          {/* Generate Demo Caution */}
          <button
            onClick={() => handleGenerateDemoReports('caution')}
            className="rounded-xl border border-amber-500/30 bg-[var(--surface-muted)] p-3 text-left hover:border-amber-500 transition text-xs"
          >
            <div className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-300">
              <PlusCircle className="h-4 w-4" />
              <span>+5 Caution Demo Reports</span>
            </div>
            <p className="text-[11px] text-[var(--foreground-muted)] mt-1">Mixed lighting, crowded, rating 2–3</p>
          </button>

          {/* Generate Demo Safe */}
          <button
            onClick={() => handleGenerateDemoReports('safe')}
            className="rounded-xl border border-emerald-500/30 bg-[var(--surface-muted)] p-3 text-left hover:border-emerald-500 transition text-xs"
          >
            <div className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300">
              <PlusCircle className="h-4 w-4" />
              <span>+5 Positive Demo Reports</span>
            </div>
            <p className="text-[11px] text-[var(--foreground-muted)] mt-1">Well-lit, foot traffic, rating 4–5</p>
          </button>
        </div>

        {/* Operations Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Recompute Area Score */}
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Calculator className="h-4 w-4" />}
              onClick={handleRecomputeScore}
            >
              Recompute Area Score
            </Button>

            {/* Test AI Summary Generation */}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />}
              disabled={aiGenerating}
              onClick={handleTestAiSummary}
            >
              {aiGenerating ? 'Synthesizing AI...' : 'Test AI Summary'}
            </Button>

            {/* Invalidate AI Cache */}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />}
              onClick={handleInvalidateAiCache}
            >
              Invalidate AI Cache
            </Button>

            {/* Inspect Current Area JSON */}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Eye className="h-4 w-4" />}
              onClick={() => setShowRawJson(!showRawJson)}
            >
              {showRawJson ? 'Hide Raw Area' : 'Inspect Current Area'}
            </Button>
          </div>

          {/* Delete All Demo Data */}
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={handleDeleteAllDemoData}
          >
            Delete All Demo Data
          </Button>
        </div>

        {/* Raw JSON Inspector */}
        {showRawJson && selectedArea && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs space-y-2">
            <span className="font-bold text-[var(--foreground)] uppercase tracking-wider text-[11px]">
              Raw Area Entity: {selectedArea.id}
            </span>
            <pre className="max-h-60 overflow-auto font-mono text-[11px] text-emerald-600 dark:text-emerald-300 bg-[var(--surface-elevated)] p-3 rounded-xl border border-[var(--border)]">
              {JSON.stringify(selectedArea, null, 2)}
            </pre>
          </div>
        )}
      </Card>

      {/* ── SECTION 3: DEVELOPER DEBUGGING: “Explain Calculation” ─────── */}
      <Card variant="navy" className="p-6 space-y-6 border-teal-500/40 bg-[var(--surface)] shadow-xl">
        <div className="border-b border-[var(--border)] pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
            <Calculator className="h-4 w-4" />
            <span>Mathematical Scoring Engine Inspector</span>
          </span>
          <h2 className="text-xl font-black text-[var(--foreground)]">Explain Calculation</h2>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
            Step-by-step transparency into ratings normalization, exponential recency decay, Bayesian shrinkage,
            and safety state classification.
          </p>
        </div>

        {explanation ? (
          <div className="space-y-6">
            {/* Summary Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Target Area</span>
                <div className="text-sm font-bold text-[var(--foreground)] truncate">{explanation.area.name}</div>
                <div className="text-[10px] text-[var(--foreground-muted)]">{explanation.area.city}</div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Report Volume</span>
                <div className="text-sm font-bold text-[var(--foreground)]">
                  {explanation.reportCount.raw} Raw Reports
                </div>
                <div className="text-[10px] text-teal-600 dark:text-teal-400">
                  Eff. Volume: {explanation.reportCount.effectiveVolume}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Time Context</span>
                <div className="text-sm font-bold text-[var(--foreground)] capitalize">
                  {explanation.currentTimeContext.resolvedContext}
                </div>
                <div className="text-[10px] text-[var(--foreground-muted)]">
                  Local Hour: {explanation.currentTimeContext.currentHour}:00
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">Confidence Tier</span>
                <div className="text-sm font-bold text-[var(--foreground)] capitalize">
                  {explanation.confidence.level}
                </div>
                <div className="text-[10px] text-[var(--foreground-muted)]">
                  Consistency: {(explanation.confidence.consistencyScore * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Calculated Score Breakdown */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                  Computed Score vs Time Breakdown
                </h4>
                <Badge
                  variant={
                    explanation.selectedSafetyState === 'higher-concern'
                      ? 'concern'
                      : explanation.selectedSafetyState === 'caution'
                      ? 'caution'
                      : 'positive'
                  }
                >
                  {explanation.selectedSafetyState}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                <div className="p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--foreground-muted)] uppercase">Overall Score</span>
                  <div className="text-lg font-black text-[var(--foreground)]">
                    {explanation.calculatedScore.overall !== null
                      ? explanation.calculatedScore.overall.toFixed(1)
                      : 'N/A'}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--foreground-muted)] uppercase">Day Perception</span>
                  <div className="text-lg font-bold text-[var(--foreground)]">
                    {explanation.calculatedScore.dayScore}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--foreground-muted)] uppercase">Evening Perception</span>
                  <div className="text-lg font-bold text-[var(--foreground)]">
                    {explanation.calculatedScore.eveningScore}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--foreground-muted)] uppercase">Night Perception</span>
                  <div className="text-lg font-bold text-[var(--foreground)]">
                    {explanation.calculatedScore.nightScore}
                  </div>
                </div>
              </div>

              {/* State Reason Box */}
              <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs text-teal-800 dark:text-teal-200 leading-relaxed">
                <strong className="text-[var(--foreground)]">Reason for Selected State: </strong>
                {explanation.stateReason}
              </div>
            </div>

            {/* Contributing Reports Table with Weights */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                  Relevant Reports & Decay Weighting ({explanation.relevantReports.length})
                </h4>
                <span className="text-[11px] text-[var(--foreground-muted)]">
                  Formula: <code className="text-amber-600 dark:text-amber-300">w = exp(-ageHours / halfLife)</code>
                </span>
              </div>

              {explanation.relevantReports.length > 0 ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Report ID</th>
                        <th className="p-2.5">Rating</th>
                        <th className="p-2.5">Normalized</th>
                        <th className="p-2.5">Time Context</th>
                        <th className="p-2.5">Age (Hours)</th>
                        <th className="p-2.5">Recency Wt</th>
                        <th className="p-2.5">Effective Wt</th>
                        <th className="p-2.5">Tags</th>
                        <th className="p-2.5">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {explanation.relevantReports.slice(0, 8).map((rep) => (
                        <tr key={rep.id} className="hover:bg-[var(--surface)] transition">
                          <td className="p-2.5 font-mono text-[11px] text-[var(--foreground)]">{rep.id.slice(-8)}</td>
                          <td className="p-2.5 font-bold text-[var(--foreground)]">{rep.rating} / 5</td>
                          <td className="p-2.5 text-teal-600 dark:text-teal-400 font-mono">{rep.normalizedScore}</td>
                          <td className="p-2.5 capitalize text-[var(--foreground-secondary)]">{rep.timeContext}</td>
                          <td className="p-2.5 text-[var(--foreground-muted)]">{rep.ageHours}h</td>
                          <td className="p-2.5 font-mono text-amber-600 dark:text-amber-300">{rep.recencyWeight}</td>
                          <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400">{rep.effectiveWeight}</td>
                          <td className="p-2.5 text-[10px] text-[var(--foreground-muted)] truncate max-w-xs">
                            {rep.tags.join(', ') || 'None'}
                          </td>
                          <td className="p-2.5">
                            {rep.isDemo ? (
                              <Badge variant="orange" size="sm">
                                DEMO
                              </Badge>
                            ) : (
                              <Badge variant="navy" size="sm">
                                Community
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-[var(--foreground-muted)] italic">
                  No reports logged for this area. Click "+5 Demo Reports" above to populate mock data.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--foreground-muted)] italic">Select an area above to explain calculation.</p>
        )}
      </Card>

      {/* ── SECTION 4: RBAC ROLE SIMULATOR ───────────────────── */}
      <Card variant="navy" className="p-6 space-y-4 border-[var(--border)] bg-[var(--surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <span>RBAC Role Simulator</span>
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              Instantly toggle the session role to test privilege guards and restricted interfaces.
            </p>
          </div>
          <span className="rounded-full bg-[var(--surface-muted)] border border-[var(--border)] px-3 py-1 text-xs font-mono text-amber-600 dark:text-amber-300">
            Current: {role.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            { id: 'user', label: 'Ordinary Member (user)', desc: 'Standard consumer profile' },
            { id: 'dev', label: 'Developer (dev)', desc: 'Dev tools enabled' },
            { id: 'admin', label: 'Administrator (admin)', desc: 'All privileges + moderation' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => handleSwitchRole(r.id as UserRole)}
              className={`rounded-2xl border p-4 text-left transition ${
                activeRole === r.id
                  ? 'border-amber-500 bg-amber-500/15 text-[var(--foreground)] shadow-md ring-2 ring-amber-500/30'
                  : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
              }`}
            >
              <div className="font-bold text-xs">{r.label}</div>
              <div className="text-[11px] text-[var(--foreground-muted)] mt-1">{r.desc}</div>
            </button>
          ))}
        </div>

        {roleSwitchedNotice && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="h-4 w-4" />
            <span>Role successfully switched. Context and navigation updated.</span>
          </p>
        )}
      </Card>
    </div>
  )
}
