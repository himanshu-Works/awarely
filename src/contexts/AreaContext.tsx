import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { SEED_AREAS } from '@/data/seedAreas'
import type { Area } from '@/types/area'
import type { Report } from '@/types/report'
import { Timestamp } from 'firebase/firestore'
import { toFirestoreTimestamp } from '@/utils/date'

import { feedbackService, type FeedbackSubmissionResult } from '@/services/feedback.service'
import { geocodingService } from '@/services/geocoding.service'
import { firestoreService } from '@/services/firestore.service'
import { locationAwarenessService } from '@/services/location-awareness.service'

interface AreaContextValue {
  areas: Area[]
  selectedArea: Area | null
  setSelectedArea: (area: Area | null) => void
  selectAreaById: (id: string) => void
  userReports: Report[]
  addUserReport: (reportPayload: {
    areaId: string
    areaName?: string
    rating: number
    observations?: string[]
    tags?: string[]
    customObservation?: string | null
    comfortLevel?: 'yes' | 'maybe' | 'no'
    note?: string | null
    visitTime?: 'morning' | 'afternoon' | 'evening' | 'night' | 'day'
    timeContext?: 'day' | 'evening' | 'night' | 'morning' | 'afternoon'
    photoFile?: File | null
    photoUrl?: string | null
    isAnonymous: boolean
  }) => Promise<FeedbackSubmissionResult>
  addOrSelectArea: (area: Area, notice?: string) => void
  lastElevationNotice: string | null
  clearElevationNotice: () => void
  currentLocationNotice: string | null
  currentLocationError: string | null
  clearCurrentLocationNotice: () => void
  clearCurrentLocationError: () => void
  requestCurrentLocation: () => Promise<boolean>
  updateAreaMetrics: (
    areaId: string,
    updates: Partial<Area>,
  ) => void
  coarseLocation: { lat: number; lng: number } | null
  isLocating: boolean
  requestCoarseLocation: () => void
  resetToInitialData: () => void
  locationDiagnostic: LocationDiagnostic | null
  clearLocationDiagnostic: () => void
}

export interface LocationDiagnostic {
  browserCoords: { lat: number; lng: number } | null
  accuracyMeters: number | null
  positionTimestamp: string | null
  requestAgeSeconds: number | null
  privacyTruncatedCoords: { lat: number; lng: number } | null
  reverseGeocodeResult: string | null
  canonicalArea: string | null
  resolutionSource: string | null
  fallbackUsed: boolean
}

const AreaContext = createContext<AreaContextValue | undefined>(undefined)

const LOCAL_REPORTS_STORAGE_KEY = 'awarely_user_submitted_reports'

export function AreaProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useState<Area[]>(SEED_AREAS)
  const [selectedArea, setSelectedArea] = useState<Area | null>(SEED_AREAS[0])
  const [userReports, setUserReports] = useState<Report[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_REPORTS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Convert serialized timestamps back using central normalization utility
        return Array.isArray(parsed)
          ? parsed.map((r: any) => ({
              ...r,
              createdAt: r.createdAt ? toFirestoreTimestamp(r.createdAt) : undefined,
              submittedAt: r.submittedAt
                ? toFirestoreTimestamp(r.submittedAt)
                : Timestamp.now(),
              expiresAt: r.expiresAt
                ? toFirestoreTimestamp(r.expiresAt)
                : Timestamp.fromMillis(Date.now() + 90 * 86400000),
            }))
          : []
      }
    } catch (e) {
      console.warn('Failed to parse saved user reports', e)
    }
    return []
  })
  const [coarseLocation, setCoarseLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  // Persist userReports
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_REPORTS_STORAGE_KEY, JSON.stringify(userReports))
    } catch {
      // Ignore quota errors
    }
  }, [userReports])

  function selectAreaById(id: string) {
    const found = areas.find((a) => a.id === id)
    if (found) setSelectedArea(found)
  }

  async function addUserReport(payload: {
    areaId: string
    areaName?: string
    rating: number
    observations?: string[]
    tags?: string[]
    customObservation?: string | null
    comfortLevel?: 'yes' | 'maybe' | 'no'
    note?: string | null
    visitTime?: 'morning' | 'afternoon' | 'evening' | 'night' | 'day'
    timeContext?: 'day' | 'evening' | 'night' | 'morning' | 'afternoon'
    photoFile?: File | null
    photoUrl?: string | null
    isAnonymous: boolean
  }): Promise<FeedbackSubmissionResult> {
    const targetArea = areas.find((a) => a.id === payload.areaId) || null
    const normalizedTimeContext: 'day' | 'evening' | 'night' =
      payload.timeContext === 'day' || payload.timeContext === 'night' || payload.timeContext === 'evening'
        ? payload.timeContext
        : payload.visitTime === 'night'
        ? 'night'
        : payload.visitTime === 'evening'
        ? 'evening'
        : 'day'

    const normalizedTags = payload.tags || payload.observations || []

    // Execute through the feedback service moderation & score recomputation pipeline
    const result = await feedbackService.submitReport(
      {
        areaId: payload.areaId,
        areaName: payload.areaName || targetArea?.name || 'Local Area',
        rating: payload.rating,
        timeContext: normalizedTimeContext,
        tags: normalizedTags,
        note: payload.note || null,
        photoFile: payload.photoFile || null,
        photoUrl: payload.photoUrl || null,
        isAnonymous: payload.isAnonymous,
      },
      targetArea,
    )

    const now = Timestamp.now()
    const newReport: Report = {
      id: result.reportId,
      areaId: payload.areaId,
      areaName: payload.areaName || targetArea?.name || 'Local Area',
      uid: payload.isAnonymous ? 'anonymous-contributor' : 'current-user-session',
      reporterUid: payload.isAnonymous ? null : 'current-user-session',
      isAnonymous: payload.isAnonymous,
      rating: payload.rating,
      observations: normalizedTags,
      tags: normalizedTags,
      customObservation: payload.customObservation || null,
      comfortLevel:
        payload.comfortLevel || (payload.rating >= 4 ? 'yes' : payload.rating === 3 ? 'maybe' : 'no'),
      note: payload.note || null,
      timeContext: normalizedTimeContext,
      visitTime: normalizedTimeContext,
      photoRef: payload.photoUrl || null,
      photoUrl: payload.photoUrl || null,
      createdAt: now,
      submittedAt: now,
      expiresAt: Timestamp.fromMillis(Date.now() + 90 * 86400000),
      moderationStatus: result.moderationStatus, // 'pending'
      weight: 1.0,
      platform: 'web',
    }

    setUserReports((prev) => [newReport, ...prev])

    // Update aggregated scores from the recomputed pipeline metrics
    const { recomputedMetrics } = result
    setAreas((prev) =>
      prev.map((a) => {
        if (a.id === payload.areaId) {
          const newTopObs = Array.from(
            new Set([...normalizedTags, ...a.topObservations]),
          ).slice(0, 5)

          return {
            ...a,
            reportCount: recomputedMetrics.reportCount,
            recentReportCount: a.recentReportCount + 1,
            overallScore: recomputedMetrics.overallScore,
            timeScores: recomputedMetrics.timeScores,
            confidence: recomputedMetrics.confidence,
            confidenceLevel: recomputedMetrics.confidence,
            latestReportAt: now,
            lastReportAt: now,
            topObservations: newTopObs,
            awarenessLevel: a.awarenessLevel === 'unknown' ? 'active' : a.awarenessLevel,
            // Invalidate relevant AI summary cache
            aiSummaryGeneratedAt: null,
          }
        }
        return a
      }),
    )

    // Update selectedArea if it matches
    setSelectedArea((prev) => {
      if (!prev || prev.id !== payload.areaId) return prev
      return {
        ...prev,
        reportCount: recomputedMetrics.reportCount,
        recentReportCount: prev.recentReportCount + 1,
        overallScore: recomputedMetrics.overallScore,
        timeScores: recomputedMetrics.timeScores,
        confidence: recomputedMetrics.confidence,
        confidenceLevel: recomputedMetrics.confidence,
        latestReportAt: now,
        lastReportAt: now,
        topObservations: Array.from(
          new Set([...normalizedTags, ...prev.topObservations]),
        ).slice(0, 5),
        aiSummaryGeneratedAt: null,
      }
    })

    return result
  }

  function updateAreaMetrics(areaId: string, updates: Partial<Area>) {
    setAreas((prev) =>
      prev.map((a) => (a.id === areaId ? { ...a, ...updates } : a)),
    )
    setSelectedArea((prev) => {
      if (!prev || prev.id !== areaId) return prev
      return { ...prev, ...updates }
    })
  }

  const [currentLocationNotice, setCurrentLocationNotice] = useState<string | null>(null)
  const [currentLocationError, setCurrentLocationError] = useState<string | null>(null)
  const [locationDiagnostic, setLocationDiagnostic] = useState<LocationDiagnostic | null>(null)

  function clearCurrentLocationNotice() {
    setCurrentLocationNotice(null)
  }

  function clearCurrentLocationError() {
    setCurrentLocationError(null)
  }

  function clearLocationDiagnostic() {
    setLocationDiagnostic(null)
  }

  async function requestCurrentLocation(): Promise<boolean> {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setCurrentLocationError("Current-location detection isn't supported by this browser.")
      return false
    }

    setIsLocating(true)
    setCurrentLocationError(null)
    const requestStartTime = Date.now()

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const rawLat = pos.coords.latitude
            const rawLng = pos.coords.longitude
            const accuracy = pos.coords.accuracy
            const posTimestamp = pos.timestamp ? new Date(pos.timestamp).toISOString() : new Date().toISOString()
            const requestAgeSec = Math.round((Date.now() - (pos.timestamp || requestStartTime)) / 1000)

            // Privacy precision: truncate to 3 decimal places (~111m)
            const coarseLat = Math.round(rawLat * 1000) / 1000
            const coarseLng = Math.round(rawLng * 1000) / 1000
            setCoarseLocation({ lat: coarseLat, lng: coarseLng })

            // Reverse geocode coarse coordinates to human-readable geographic area
            const suggestion = await geocodingService.reverseGeocode(coarseLat, coarseLng)
            const resolved = await geocodingService.resolveArea(suggestion)

            // Sync with Firestore if existing area document is present
            let finalArea = resolved.area
            try {
              const fromFirestore = await firestoreService.getArea(resolved.area.id)
              if (fromFirestore) {
                finalArea = fromFirestore
              }
            } catch {}

            addOrSelectArea(finalArea, resolved.elevationNotice)
            setSelectedArea(finalArea)

            // Feed genuine coordinates into location awareness alert pipeline
            locationAwarenessService.processLocationUpdate(
              { latitude: coarseLat, longitude: coarseLng },
              areas,
              Date.now(),
            )

            // Low-accuracy location handling:
            // Do not silently present a false sense of precision if accuracy radius is large
            const isLowAccuracy = accuracy > 1500
            const accuracyLabel = accuracy >= 1000 ? `${(accuracy / 1000).toFixed(1)} km` : `${Math.round(accuracy)} m`

            if (isLowAccuracy) {
              setCurrentLocationNotice(`Approximate location — accuracy about ${accuracyLabel}`)
            } else {
              setCurrentLocationNotice(`Current area: ${finalArea.name}, ${finalArea.city}`)
            }
            setCurrentLocationError(null)

            // Determine diagnostic resolution details (transient in-memory only)
            const isCatalogMatch =
              suggestion.placeId?.startsWith('cat-') ||
              suggestion.placeId?.startsWith('rev-cat-') ||
              false
            const isSeedMatch = suggestion.placeId?.startsWith('area-') || false
            const isGlobalSynthesis = suggestion.placeId?.startsWith('rev-global-') || false

            let sourceStr = suggestion.resolutionSource
            if (!sourceStr) {
              if (isSeedMatch) {
                sourceStr = 'Curated Seed Area (Geographic Bounds)'
              } else if (isCatalogMatch) {
                sourceStr = 'Local Catalog Boundary Match'
              } else if (isGlobalSynthesis) {
                sourceStr = 'Dynamic Geographic Locality Synthesis'
              } else {
                sourceStr = 'Google Geocoder (Browser Reverse Geocode)'
              }
            }

            // Fallback is TRUE if resolved by seed bounds, catalog match, or dynamic synthesis
            // Fallback is FALSE strictly for genuine Google Geocoder resolution
            const fallbackUsed =
              typeof suggestion.fallbackUsed === 'boolean'
                ? suggestion.fallbackUsed
                : (isSeedMatch || isCatalogMatch || isGlobalSynthesis)

            setLocationDiagnostic({
              browserCoords: {
                lat: Math.round(rawLat * 10000) / 10000,
                lng: Math.round(rawLng * 10000) / 10000,
              },
              accuracyMeters: Math.round(accuracy),
              positionTimestamp: posTimestamp,
              requestAgeSeconds: Math.max(0, requestAgeSec),
              privacyTruncatedCoords: { lat: coarseLat, lng: coarseLng },
              reverseGeocodeResult: `${suggestion.mainText}, ${suggestion.secondaryText}`,
              canonicalArea: `${finalArea.name}, ${finalArea.city}`,
              resolutionSource: sourceStr,
              fallbackUsed,
            })

            resolve(true)
          } catch (err: any) {
            console.error('[Awarely] Failed to resolve current location area:', err)
            setCurrentLocationError('Current location could not be determined. Try again.')
            resolve(false)
          } finally {
            setIsLocating(false)
          }
        },
        (err) => {
          setIsLocating(false)
          setCurrentLocationNotice(null)
          if (err.code === 1) {
            setCurrentLocationError('Location permission is required to use Near Me.')
          } else if (err.code === 2) {
            setCurrentLocationError('Current location could not be determined. Try again.')
          } else if (err.code === 3) {
            setCurrentLocationError('Location request timed out. Try again.')
          } else {
            setCurrentLocationError('Current location could not be determined. Try again.')
          }
          resolve(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        },
      )
    })
  }

  function requestCoarseLocation() {
    requestCurrentLocation().catch(() => {})
  }

  const [lastElevationNotice, setLastElevationNotice] = useState<string | null>(null)

  function addOrSelectArea(area: Area, notice?: string) {
    setAreas((prev) => {
      const exists = prev.some((a) => a.id === area.id)
      if (exists) {
        return prev.map((a) => (a.id === area.id ? area : a))
      }
      return [area, ...prev]
    })
    setSelectedArea(area)
    if (notice) {
      setLastElevationNotice(notice)
    }
  }

  function clearElevationNotice() {
    setLastElevationNotice(null)
  }

  function resetToInitialData() {
    setAreas(SEED_AREAS)
    setSelectedArea(SEED_AREAS[0])
    setUserReports([])
    setLastElevationNotice(null)
    setCurrentLocationNotice(null)
    setCurrentLocationError(null)
    setLocationDiagnostic(null)
    localStorage.removeItem(LOCAL_REPORTS_STORAGE_KEY)
  }

  return (
    <AreaContext.Provider
      value={{
        areas,
        selectedArea,
        setSelectedArea,
        selectAreaById,
        userReports,
        addUserReport,
        addOrSelectArea,
        lastElevationNotice,
        clearElevationNotice,
        currentLocationNotice,
        currentLocationError,
        clearCurrentLocationNotice,
        clearCurrentLocationError,
        requestCurrentLocation,
        updateAreaMetrics,
        coarseLocation,
        isLocating,
        requestCoarseLocation,
        resetToInitialData,
        locationDiagnostic,
        clearLocationDiagnostic,
      }}
    >
      {children}
    </AreaContext.Provider>
  )
}

export function useArea() {
  const ctx = useContext(AreaContext)
  if (!ctx) {
    throw new Error('useArea must be used within an <AreaProvider>')
  }
  return ctx
}
