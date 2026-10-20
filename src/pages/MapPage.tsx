/**
 * MapPage — primary application screen for Awarely.
 *
 * Implements privacy-first, area-level community safety awareness:
 * - Area-wise neighborhood visualization & selection (Mumbai, Delhi, London)
 * - Community perception cards with data freshness & confidence ratings
 * - AI-synthesized neutral condition summaries
 * - Anonymous community report contributions
 * - Trusted Safety Circle check-ins and synthesized Audio Siren
 * - Developer simulation widget for testing
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Volume2,
  VolumeX,
  LogOut,
  Users,
} from 'lucide-react'
import { BrandLogo } from '@/components/design-system/BrandLogo'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth.service'
import { sirenService } from '@/services/siren.service'
import { SEED_AREAS } from '@/data/seedAreas'
import type { Area } from '@/types/area'
import { AwarelyMap } from '@/components/map/AwarelyMap'
import { MapLegend } from '@/components/map/MapLegend'
import { AreaContextCard } from '@/components/awareness/AreaContextCard'
import { FeedbackModal } from '@/components/report/FeedbackModal'
import { TrustedCircleModal } from '@/components/contacts/TrustedCircleModal'
import { DevSimulator } from '@/components/dev/DevSimulator'
import { LoadingScreen } from '@/components/ui/Spinner'

export function MapPage() {
  const { user, authLoading, isGuest } = useAuth()
  const navigate = useNavigate()

  const [areas, setAreas] = useState<Area[]>(SEED_AREAS)
  const [selectedArea, setSelectedArea] = useState<Area | null>(SEED_AREAS[0])
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [circleModalOpen, setCircleModalOpen] = useState(false)
  const [sirenPlaying, setSirenPlaying] = useState(sirenService.isPlaying)
  const [locating, setLocating] = useState(false)
  const [coarseUserLocation, setCoarseUserLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)

  // Synchronize siren playback state
  useEffect(() => {
    return sirenService.subscribe((playing) => {
      setSirenPlaying(playing)
    })
  }, [])

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true })
    }
  }, [user, authLoading, navigate])

  if (authLoading) {
    return <LoadingScreen message="Loading Awarely…" />
  }

  if (!user) return null

  async function handleSignOut() {
    if (sirenService.isPlaying) sirenService.stop()
    await authService.signOut()
    navigate('/login', { replace: true })
  }

  async function toggleSiren() {
    await sirenService.toggle()
  }

  // Discrete, single-shot privacy-first location check
  // Never continuously tracks; resolves to coarse area then discards precise coordinates
  function handleDiscreteLocate() {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        // Store coarse location marker ephemerally in session state
        setCoarseUserLocation({
          lat: Number(pos.coords.latitude.toFixed(2)),
          lng: Number(pos.coords.longitude.toFixed(2)),
        })
      },
      (err) => {
        setLocating(false)
        console.warn('[Awarely] Coarse location check unavailable:', err.message)
        // Fallback to default area
        if (areas.length > 0) {
          setSelectedArea(areas[0])
        }
      },
      {
        enableHighAccuracy: false, // Intentional coarse accuracy
        timeout: 8000,
        maximumAge: 60000,
      },
    )
  }

  // Developer simulation helper to dynamically update area condition
  function handleUpdateCondition(level: 'active' | 'mixed' | 'quiet') {
    if (!selectedArea) return
    const updated = {
      ...selectedArea,
      awarenessLevel: level,
      reportCount: selectedArea.reportCount + 1,
    }
    setSelectedArea(updated)
    setAreas((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* ── Interactive Map Canvas ──────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <AwarelyMap
          areas={areas}
          selectedArea={selectedArea}
          onSelectArea={(area) => setSelectedArea(area)}
          userCoarseLocation={coarseUserLocation}
          onRequestLocation={handleDiscreteLocate}
          locating={locating}
        />
      </div>

      {/* ── Top Floating Header ─────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 pointer-events-none">
        {/* Brand identity using official supplied logo */}
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-1.5 shadow-xl backdrop-blur-xl">
          <BrandLogo size="xs" showTagline />
          <a
            href="/design-system"
            className="hidden lg:inline-flex items-center gap-1 rounded-lg bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)] border border-[var(--border)] hover:bg-[var(--surface-elevated)] transition"
          >
            <span>Design System</span>
          </a>
        </div>

        {/* Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Map Legend */}
          <MapLegend />

          {/* Distress Siren Button */}
          <button
            onClick={toggleSiren}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 shadow-xl ${
              sirenPlaying
                ? 'bg-rose-600 text-white animate-pulse'
                : 'glass text-rose-500 hover:text-white border-rose-500/30'
            }`}
            title="Toggle synthesized emergency distress siren"
          >
            {sirenPlaying ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {sirenPlaying ? 'Stop Siren' : 'Siren'}
            </span>
          </button>

          {/* Guest or User Tag */}
          {isGuest ? (
            <div className="hidden sm:flex items-center rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-300">
              Guest Mode
            </div>
          ) : (
            <div className="hidden sm:flex items-center rounded-full bg-teal-500/15 border border-teal-500/30 px-3 py-1 text-xs font-medium text-teal-600 dark:text-teal-300">
              {user.displayName || 'Member'}
            </div>
          )}

          {/* Safety Circle Quick Trigger */}
          <button
            onClick={() => setCircleModalOpen(true)}
            className="glass flex h-8 w-8 items-center justify-center rounded-full text-amber-500 hover:text-[var(--foreground)] transition shadow-lg"
            title="Trusted Safety Circle"
            aria-label="Safety Circle"
          >
            <Users className="h-4 w-4" />
          </button>

          {/* Sign Out */}
          <button
            id="sign-out-btn"
            onClick={handleSignOut}
            className="glass flex h-8 w-8 items-center justify-center rounded-full text-[var(--foreground-muted)] hover:text-rose-500 transition shadow-lg"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── Bottom Area Awareness Card (Desktop Floating / Mobile Overlay) ──── */}
      <div className="pointer-events-none absolute bottom-5 left-0 right-0 z-20 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-xl">
          <AreaContextCard
            area={selectedArea}
            onOpenReport={() => setReportModalOpen(true)}
            onOpenCircle={() => setCircleModalOpen(true)}
          />
        </div>
      </div>

      {/* ── Modals & Drawers ────────────────────────────────────────── */}
      <FeedbackModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        area={selectedArea}
        onReportSubmitted={() => {
          if (selectedArea) {
            const nextLvl = selectedArea.awarenessLevel === 'unknown' ? 'active' : selectedArea.awarenessLevel
            handleUpdateCondition(nextLvl)
          }
        }}
      />

      <TrustedCircleModal
        isOpen={circleModalOpen}
        onClose={() => setCircleModalOpen(false)}
        currentArea={selectedArea}
      />

      {/* ── Developer Simulation Widget ──────────────────────────────── */}
      <DevSimulator
        currentArea={selectedArea}
        onSelectArea={(area) => setSelectedArea(area)}
        onUpdateAreaCondition={handleUpdateCondition}
      />
    </div>
  )
}
