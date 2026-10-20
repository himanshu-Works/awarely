/**
 * Awarely Location-Based Safety Awareness Service
 *
 * Privacy Invariants:
 * - Coordinates are strictly ephemeral; never stored to database.
 * - No continuous GPS trails, route history, or breadcrumb collections.
 * - Foreground location checks only with explicit user consent.
 *
 * Core Concept: AREA ENTRY
 * When entering a higher-concern or caution area:
 * 1. Resolve enclosing area
 * 2. Retrieve safety context & confidence
 * 3. Evaluate cooldown & de-duplication
 * 4. Trigger calm, non-alarmist safety awareness alert
 *
 * Flutter Compatibility:
 * Built on a universal geofence event model (IGeofencingEngine).
 * Web implements this in the foreground; Flutter mobile will use
 * native background geofences (GeofencingClient / CLCircularRegion).
 */

import type { Area } from '@/types/area'
import type {
  Coordinates,
  SafetyAwarenessAlert,
  GeofenceAreaEntryEvent,
  UserAlertPreferences,
  IGeofencingEngine,
} from '@/types/location-awareness'

const PREFS_STORAGE_KEY = 'awarely_location_alert_prefs'
const COOLDOWN_STORAGE_KEY = 'awarely_location_alert_cooldowns'
const DEFAULT_COOLDOWN_MINUTES = 60 // 1 hour per area

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3 // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export class LocationAwarenessEngine implements IGeofencingEngine {
  private currentAreaId: string | null = null
  private lastAlertedTimestamps: Record<string, number> = {}
  private preferences: UserAlertPreferences = {
    alertsEnabled: true,
    pausedUntilMs: null,
    cooldownMinutes: DEFAULT_COOLDOWN_MINUTES,
  }
  private alertListeners: ((alert: SafetyAwarenessAlert) => void)[] = []

  constructor() {
    this.loadState()
  }

  private loadState(): void {
    try {
      const savedPrefs = localStorage.getItem(PREFS_STORAGE_KEY)
      if (savedPrefs) {
        this.preferences = { ...this.preferences, ...JSON.parse(savedPrefs) }
      }
      const savedCooldowns = localStorage.getItem(COOLDOWN_STORAGE_KEY)
      if (savedCooldowns) {
        this.lastAlertedTimestamps = JSON.parse(savedCooldowns)
      }
    } catch {
      // Ignore storage errors in test / incognito mode
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(this.preferences))
      localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(this.lastAlertedTimestamps))
    } catch {
      // Ignore quota errors
    }
  }

  /** Current area ID the user is inside, or null if outside monitored areas */
  getCurrentAreaId(): string | null {
    return this.currentAreaId
  }

  /** Reset internal entry state (e.g. for testing) */
  resetState(): void {
    this.currentAreaId = null
    this.lastAlertedTimestamps = {}
    this.saveState()
  }

  /** Clear all alert cooldown timestamps (DevTools control) */
  clearCooldowns(): void {
    this.lastAlertedTimestamps = {}
    this.saveState()
  }

  /** Get map of last alerted timestamps per area ID (DevTools inspector) */
  getLastAlertedTimestamps(): Record<string, number> {
    return { ...this.lastAlertedTimestamps }
  }

  /** Get user alert configuration */
  getPreferences(): UserAlertPreferences {
    return { ...this.preferences }
  }

  /** Enable location safety alerts */
  setAlertsEnabled(enabled: boolean): void {
    this.preferences.alertsEnabled = enabled
    this.saveState()
  }

  /** Pause notifications for a specified duration in minutes */
  pauseAlerts(durationMinutes: number): void {
    this.preferences.pausedUntilMs = Date.now() + durationMinutes * 60 * 1000
    this.saveState()
  }

  /** Resume notifications immediately */
  resumeAlerts(): void {
    this.preferences.pausedUntilMs = null
    this.saveState()
  }

  /** Check if alerts are actively permitted (enabled and not paused) */
  isAlertActive(currentTimeMs: number = Date.now()): boolean {
    if (!this.preferences.alertsEnabled) return false
    if (this.preferences.pausedUntilMs && currentTimeMs < this.preferences.pausedUntilMs) {
      return false
    }
    return true
  }

  /** Subscribe to in-app calm alert broadcasts */
  onAlert(callback: (alert: SafetyAwarenessAlert) => void): () => void {
    this.alertListeners.push(callback)
    return () => {
      this.alertListeners = this.alertListeners.filter((cb) => cb !== callback)
    }
  }

  /**
   * Determine if coarse coordinates fall within a monitored area.
   * Checks circular center + radius, and falls back to bounding box.
   */
  isPointInArea(coords: Coordinates, area: Area): boolean {
    // 1. Center + Radius check (primary)
    if (area.center && typeof area.center.latitude === 'number' && typeof area.center.longitude === 'number') {
      const radiusMeters = area.radiusMeters || 1200
      const dist = calculateDistanceMeters(
        coords.latitude,
        coords.longitude,
        area.center.latitude,
        area.center.longitude,
      )
      if (dist <= radiusMeters) {
        return true
      }
    }

    // 2. Bounding box fallback
    if (area.bounds) {
      const { northEast, southWest } = area.bounds
      const inLat = coords.latitude >= southWest.latitude && coords.latitude <= northEast.latitude
      const inLng = coords.longitude >= southWest.longitude && coords.longitude <= northEast.longitude
      if (inLat && inLng) {
        return true
      }
    }

    return false
  }

  /**
   * Resolve coordinates to enclosing area from a list of monitored areas.
   */
  findContainingArea(coords: Coordinates, areas: Area[]): Area | null {
    for (const area of areas) {
      if (this.isPointInArea(coords, area)) {
        return area
      }
    }
    return null
  }

  /**
   * Categorize area for alert triggering:
   * Only 'higher-concern' or 'caution' areas trigger entry alerts.
   * 'insufficient-data' or 'generally-positive' areas do NOT trigger alerts.
   */
  classifyAlertCategory(area: Area): 'higher-concern' | 'caution' | 'insufficient-data' | 'positive' {
    // Insufficient data check: Never alert on unverified or sparse areas
    if ((area.reportCount ?? 0) < 2) {
      return 'insufficient-data'
    }

    const overall = area.overallScore
    const night = area.timeScores?.night ?? 70

    // Higher concern criteria
    if (
      (overall !== null && overall !== undefined && overall < 40) ||
      night < 40 ||
      (area.awarenessLevel as string) === 'concern' ||
      area.awarenessLevel === 'quiet'
    ) {
      return 'higher-concern'
    }

    // Caution criteria
    if (
      (overall !== null && overall !== undefined && overall < 70) ||
      night < 60 ||
      area.awarenessLevel === 'mixed'
    ) {
      return 'caution'
    }

    return 'positive'
  }

  /**
   * Format calm, non-alarmist safety awareness alert message.
   * STRICT NON-ALARMIST FRAMING: No sirens, panic, or crime predictions.
   */
  constructCalmAlert(
    area: Area,
    category: 'higher-concern' | 'caution',
    currentTimeMs: number = Date.now(),
  ): SafetyAwarenessAlert {
    const isNight = area.timeScores && area.timeScores.night < 55
    const timeDetail = isNight ? ' at night' : ''

    const confidenceLabel: 'High confidence' | 'Moderate confidence' | 'Low confidence' =
      area.confidenceLevel === 'high' || area.confidence === 'high'
        ? 'High confidence'
        : area.confidenceLevel === 'moderate' || area.confidence === 'moderate'
        ? 'Moderate confidence'
        : 'Low confidence'

    const reportCount = area.reportCount ?? 0
    const stateLabel = category === 'higher-concern' ? 'Higher concern' : 'Caution'

    const alertMessage =
      `Safety awareness:\n` +
      `Recent community feedback indicates ${stateLabel.toLowerCase()} in this area${timeDetail}.\n` +
      `Confidence: ${confidenceLabel.replace(' confidence', '')}.\n` +
      `Based on ${reportCount} recent reports.`

    return {
      id: `alert-${area.id}-${currentTimeMs}`,
      areaId: area.id,
      areaName: area.name,
      city: area.city,
      state: category,
      stateLabel,
      alertTitle: `Safety awareness: ${area.name}`,
      alertMessage,
      confidenceLabel,
      freshnessText: `Based on ${reportCount} recent reports`,
      sourceReportCount: reportCount,
      triggeredAt: currentTimeMs,
    }
  }

  /**
   * Process a foreground location update against monitored areas.
   *
   * Core State Machine:
   * 1. Resolves enclosing area.
   * 2. If entering a new area (currentAreaId !== area.id):
   *    - If category is 'higher-concern' or 'caution':
   *      - Checks cooldown: lastAlertedTimestamp[area.id]
   *      - Checks user alert preferences: alertsEnabled && !paused
   *      - If allowed, triggers calm alert & records cooldown timestamp.
   *    - Updates currentAreaId.
   * 3. If remaining within the same area:
   *    - Does NOT trigger repeated alert (once per entry).
   * 4. If moving outside monitored areas:
   *    - currentAreaId resets to null (exit event).
   *    - Re-entering later can trigger again after leaving.
   */
  processLocationUpdate(
    coords: Coordinates,
    monitoredAreas: Area[] = [],
    currentTimeMs: number = Date.now(),
  ): GeofenceAreaEntryEvent | null {
    const enclosingArea = this.findContainingArea(coords, monitoredAreas)
    const newAreaId = enclosingArea ? enclosingArea.id : null
    const previousAreaId = this.currentAreaId

    // ── CASE 1: Still within the same area (Repeated updates) ──────────────
    if (newAreaId !== null && newAreaId === previousAreaId) {
      // User is already inside this area. Once-per-entry invariant: no repeated alert.
      return null
    }

    // ── CASE 2: Exited an area to unmonitored space ─────────────────────────
    if (!enclosingArea || newAreaId === null) {
      if (previousAreaId !== null) {
        this.currentAreaId = null
        return {
          type: 'EXIT',
          areaId: previousAreaId,
          areaName: 'Outside Monitored Areas',
          timestamp: currentTimeMs,
          alertTriggered: false,
        }
      }
      return null
    }

    // ── CASE 3: Entered a new area (AREA ENTRY EVENT) ────────────────────────
    this.currentAreaId = newAreaId
    const targetArea = enclosingArea
    const category = this.classifyAlertCategory(targetArea)

    // Check if category warrants an alert (higher-concern or caution only)
    if (category !== 'higher-concern' && category !== 'caution') {
      return {
        type: 'ENTER',
        areaId: newAreaId,
        areaName: targetArea.name,
        timestamp: currentTimeMs,
        alertTriggered: false,
      }
    }

    // Check user preferences: must be enabled and not paused
    if (!this.isAlertActive(currentTimeMs)) {
      return {
        type: 'ENTER',
        areaId: newAreaId,
        areaName: targetArea.name,
        timestamp: currentTimeMs,
        alertTriggered: false,
      }
    }

    // Check cooldown: has cooldown elapsed since last alert for this area?
    const cooldownMs = this.preferences.cooldownMinutes * 60 * 1000
    const lastAlertTime = this.lastAlertedTimestamps[newAreaId]
    if (lastAlertTime !== undefined && currentTimeMs - lastAlertTime < cooldownMs) {
      // Still on cooldown for this area
      return {
        type: 'ENTER',
        areaId: newAreaId,
        areaName: targetArea.name,
        timestamp: currentTimeMs,
        alertTriggered: false,
      }
    }

    // Trigger calm safety alert!
    const alert = this.constructCalmAlert(targetArea, category, currentTimeMs)
    this.lastAlertedTimestamps[newAreaId] = currentTimeMs
    this.saveState()

    // Notify listeners
    this.alertListeners.forEach((cb) => cb(alert))

    return {
      type: 'ENTER',
      areaId: newAreaId,
      areaName: targetArea.name,
      timestamp: currentTimeMs,
      alertTriggered: true,
      alert,
    }
  }
}

export const locationAwarenessService = new LocationAwarenessEngine()
