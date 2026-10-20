import { useState, useEffect } from 'react'
import {
  Bell,
  BellRing,
  BellOff,
  AlertTriangle,
  Users,
  MapPin,
  Clock,
  Compass,
  Info,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
} from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { Button } from '@/components/design-system/Button'
import { EmptyState } from '@/components/design-system/EmptyState'
import { Card } from '@/components/design-system/Card'
import { locationAwarenessService } from '@/services/location-awareness.service'
import type { SafetyAwarenessAlert } from '@/types/location-awareness'

export function AlertsPage() {
  const { areas, selectedArea } = useArea()
  const [activeTab, setActiveTab] = useState<'area' | 'circle'>('area')

  // Alert preferences state
  const [prefs, setPrefs] = useState(locationAwarenessService.getPreferences())
  const [activeAlerts, setActiveAlerts] = useState<SafetyAwarenessAlert[]>([])
  const [checkingLocation, setCheckingLocation] = useState<boolean>(false)
  const [checkResultMsg, setCheckResultMsg] = useState<string | null>(null)

  // Sync preferences and subscribe to alerts
  useEffect(() => {
    setPrefs(locationAwarenessService.getPreferences())

    const unsubscribe = locationAwarenessService.onAlert((newAlert) => {
      setActiveAlerts((prev) => [newAlert, ...prev])
    })

    return () => {
      unsubscribe()
    }
  }, [])

  function handleToggleAlerts() {
    const newState = !prefs.alertsEnabled
    locationAwarenessService.setAlertsEnabled(newState)
    setPrefs(locationAwarenessService.getPreferences())
  }

  function handlePause(minutes: number) {
    locationAwarenessService.pauseAlerts(minutes)
    setPrefs(locationAwarenessService.getPreferences())
  }

  function handleResume() {
    locationAwarenessService.resumeAlerts()
    setPrefs(locationAwarenessService.getPreferences())
  }

  // Foreground location check
  function handlePerformForegroundCheck() {
    if (!('geolocation' in navigator)) {
      setCheckResultMsg('Geolocation is not supported by your browser.')
      return
    }

    setCheckingLocation(true)
    setCheckResultMsg(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCheckingLocation(false)
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }

        const event = locationAwarenessService.processLocationUpdate(coords, areas, Date.now())

        if (!event) {
          const currentId = locationAwarenessService.getCurrentAreaId()
          const currentArea = areas.find((a) => a.id === currentId)
          if (currentArea) {
            setCheckResultMsg(
              `Currently in ${currentArea.name}. No new alert triggered (already verified upon entry).`,
            )
          } else {
            setCheckResultMsg('Outside monitored Awarely areas. No elevated advisories.')
          }
          return
        }

        if (event.type === 'EXIT') {
          setCheckResultMsg('Transitioned outside monitored areas. Alerts reset for next entry.')
          return
        }

        if (event.alertTriggered && event.alert) {
          setCheckResultMsg(`Entered ${event.areaName}! Calm safety awareness alert recorded.`)
        } else {
          setCheckResultMsg(
            `Entered ${event.areaName}. Area conditions are within normal parameters or on cooldown.`,
          )
        }
      },
      (err) => {
        setCheckingLocation(false)
        setCheckResultMsg(`Location check failed: ${err.message}. Please allow location consent.`)
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  const isPaused = prefs.pausedUntilMs !== null && Date.now() < prefs.pausedUntilMs
  const remainingPauseMinutes = isPaused
    ? Math.max(1, Math.ceil((prefs.pausedUntilMs! - Date.now()) / (60 * 1000)))
    : 0

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
            <Bell className="h-6 w-6 text-[var(--primary)]" />
            <span>Community Alerts & Advisories</span>
          </h1>
          <p className="text-sm text-[var(--foreground-secondary)]">
            Real-time environmental notices and automated distress signals from your trusted network.
          </p>
        </div>

        {/* Global Alert Toggle */}
        <button
          onClick={handleToggleAlerts}
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
            prefs.alertsEnabled
              ? 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300'
              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
          }`}
        >
          {prefs.alertsEnabled ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          <span>{prefs.alertsEnabled ? 'Location Alerts Active' : 'Alerts Disabled'}</span>
        </button>
      </div>

      {/* ── Foreground Safety Awareness Controller ───────────────────── */}
      <Card variant="navy" className="p-5 sm:p-6 border-[var(--border)] bg-[var(--surface)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <Compass className="h-4 w-4 text-[var(--primary)]" />
              <span>Foreground Location Awareness</span>
            </h2>
            <p className="text-xs text-[var(--foreground-muted)]">
              Check if your current location has entered an area with elevated caution or concern.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePerformForegroundCheck}
            isLoading={checkingLocation}
            leftIcon={<Compass className="h-3.5 w-3.5" />}
          >
            Check Current Location
          </Button>
        </div>

        {/* Status result if user clicked check */}
        {checkResultMsg && (
          <div className="rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] p-3 text-xs text-[var(--foreground)] flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0" />
            <span>{checkResultMsg}</span>
          </div>
        )}

        {/* Notification Pause Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex items-center gap-2 text-[var(--foreground-secondary)]">
            <Clock className="h-4 w-4 text-[var(--foreground-muted)]" />
            <span>
              {isPaused ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  Muted for next {remainingPauseMinutes} min
                </span>
              ) : (
                'Alerts active upon area entry'
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isPaused ? (
              <button
                onClick={handleResume}
                className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-xs font-semibold hover:bg-teal-500/30 transition"
              >
                Resume Alerts
              </button>
            ) : (
              <>
                <span className="text-[var(--foreground-muted)] text-[11px]">Pause for:</span>
                <button
                  onClick={() => handlePause(60)}
                  className="px-2 py-1 rounded-lg bg-[var(--surface-muted)] text-[var(--foreground-secondary)] border border-[var(--border)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition"
                >
                  1 hr
                </button>
                <button
                  onClick={() => handlePause(480)}
                  className="px-2 py-1 rounded-lg bg-[var(--surface-muted)] text-[var(--foreground-secondary)] border border-[var(--border)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition"
                >
                  8 hrs
                </button>
                <button
                  onClick={() => handlePause(1440)}
                  className="px-2 py-1 rounded-lg bg-[var(--surface-muted)] text-[var(--foreground-secondary)] border border-[var(--border)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition"
                >
                  24 hrs
                </button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* ── Platform Architecture & Browser Limitations Notice ───────── */}
      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs text-indigo-900 dark:text-indigo-200/90 leading-relaxed flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-[var(--foreground)] text-xs">
            <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
            <span>Browser Limitations & Native Mobile Architecture</span>
          </div>
          <p className="text-[var(--foreground-secondary)]">
            Web browsers strictly suspend geolocation when tabs are closed or backgrounded. Awarely Web operates on <strong>foreground checks with zero persistent coordinates</strong>. The upcoming Flutter mobile app will use native background OS geofencing (<span className="text-indigo-600 dark:text-indigo-300 font-mono text-[11px]">GeofencingClient</span> / <span className="text-indigo-600 dark:text-indigo-300 font-mono text-[11px]">CLCircularRegion</span>), triggering calm alerts on boundary transitions with zero continuous tracking.
          </p>
        </div>
      </div>

      {/* ── Tab Switcher ─────────────────────────────────────────────── */}
      <div className="flex border-b border-[var(--border)] gap-4">
        <button
          onClick={() => setActiveTab('area')}
          className={`pb-3 text-xs sm:text-sm font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'area'
              ? 'border-[var(--primary)] text-[var(--foreground)]'
              : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Area Advisories ({selectedArea?.name || 'Selected Area'})</span>
        </button>

        <button
          onClick={() => setActiveTab('circle')}
          className={`pb-3 text-xs sm:text-sm font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'circle'
              ? 'border-[var(--primary)] text-[var(--foreground)]'
              : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Safety Circle Check-ins</span>
        </button>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────── */}
      {activeTab === 'area' ? (
        activeAlerts.length > 0 ? (
          <div className="space-y-4">
            <span className="text-xs text-[var(--foreground-muted)]">
              Active Location Entry Alerts ({activeAlerts.length})
            </span>
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 space-y-3 shadow-xl animate-in slide-in-from-top-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                    <span>{alert.alertTitle}</span>
                  </div>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400/80 font-medium">Just now</span>
                </div>

                <p className="text-xs sm:text-sm text-[var(--foreground)] whitespace-pre-line leading-relaxed font-normal">
                  {alert.alertMessage}
                </p>

                <div className="pt-1 flex items-center gap-3 text-[11px] text-[var(--foreground-muted)] border-t border-amber-500/20">
                  <span>Confidence: <strong className="text-[var(--foreground)]">{alert.confidenceLabel}</strong></span>
                  <span>•</span>
                  <span>{alert.freshnessText}</span>
                </div>
              </div>
            ))}
          </div>
        ) : selectedArea?.awarenessLevel === 'quiet' || selectedArea?.awarenessLevel === 'mixed' ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 space-y-2 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Area Environmental Advisory</span>
                </div>
                <span className="text-[11px] text-amber-700 dark:text-amber-400/80 font-medium">Active</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--foreground)] leading-relaxed font-normal">
                Safety awareness: Recent community feedback indicates caution in <strong className="text-[var(--foreground)]">{selectedArea.name}</strong> at night.
                Confidence: {selectedArea.confidenceLevel === 'high' ? 'High' : 'Moderate'}. Based on {selectedArea.reportCount} recent reports.
              </p>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No active safety advisories"
            description={`Community observations in ${
              selectedArea?.name || 'this area'
            } remain within normal observed parameters. No elevated environmental alerts have been issued.`}
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => (window.location.href = '/search')}
              >
                View All Monitored Areas
              </Button>
            }
          />
        )
      ) : (
        <EmptyState
          title="No circle distress signals or check-ins"
          description="Your trusted contacts have not triggered any distress sirens or check-ins in the last 24 hours. Everyone in your circle is quiet."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => (window.location.href = '/circle')}
            >
              Manage Safety Circle
            </Button>
          }
        />
      )}
    </div>
  )
}
