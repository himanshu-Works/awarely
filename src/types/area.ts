import type { Timestamp } from 'firebase/firestore'
import type { AwarenessLevel, ConfidenceLevel } from '@/config/app.config'

export type { AwarenessLevel, ConfidenceLevel }

export type AreaSource = 'seed' | 'google_places' | 'osm' | 'admin' | 'user_reported'
export type AreaStatus = 'active' | 'under_review' | 'inactive'

export interface AreaCenter {
  latitude: number
  longitude: number
}

export interface AreaBounds {
  northEast: { latitude: number; longitude: number }
  southWest: { latitude: number; longitude: number }
}

export interface TimeScores {
  day: number      // e.g. 0–100 aggregated comfort perception
  evening: number  // e.g. 0–100
  night: number    // e.g. 0–100
}

export interface DayNightSplit {
  day: number   // percentage 0–100
  night: number // percentage 0–100
}

/**
 * Canonical Area document stored at areas/{areaId} in Firestore.
 *
 * All computed safety scores (overallScore, timeScores, confidence)
 * are computed exclusively server-side via Cloud Functions.
 * Direct client mutation of safety scores is write-protected.
 */
export interface Area {
  id: string
  canonicalName?: string
  name: string // Display alias for UI convenience
  city: string
  locality?: string
  postalCode?: string | null
  country?: string
  fullName: string
  center?: AreaCenter
  radiusMeters?: number
  placeId?: string | null
  source?: AreaSource
  status?: AreaStatus
  bounds: AreaBounds
  polygon: string // GeoJSON Polygon string
  createdAt: Timestamp
  updatedAt: Timestamp
  isActive: boolean

  // ── Computed Safety & Community Metrics (Server-Aggregated Only) ──
  reportCount: number
  recentReportCount: number
  confidence?: ConfidenceLevel
  confidenceLevel: ConfidenceLevel // UI convenience alias
  overallScore?: number | null      // 0–100 server-calculated aggregated score
  timeScores?: TimeScores           // Breakdowns for day, evening, night
  lastReportAt?: Timestamp | null
  latestReportAt?: Timestamp | null // UI convenience alias
  topObservations: string[]
  dayNightSplit: DayNightSplit
  awarenessLevel: AwarenessLevel
  aiSummary: string | null
  aiSummaryGeneratedAt: Timestamp | null
}

/** Lightweight area reference for selectors and lists */
export interface AreaRef {
  id: string
  name: string
  canonicalName?: string
  city: string
  fullName: string
  awarenessLevel: AwarenessLevel
}

/** Result returned by the resolveArea Cloud Function */
export interface ResolvedArea {
  found: boolean
  areaId: string | null
  areaName: string | null
  city: string | null
}
