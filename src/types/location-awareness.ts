/**
 * Awarely Location-Based Safety Awareness Types
 *
 * Privacy Invariants:
 * - Coordinates are strictly ephemeral; never stored to database.
 * - No continuous GPS trails, route history, or breadcrumb collections.
 * - Foregrounds checks only; geofencing is coarse and area-based.
 */

export type AlertStateCategory = 'higher-concern' | 'caution'

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface SafetyAwarenessAlert {
  id: string
  areaId: string
  areaName: string
  city: string
  state: AlertStateCategory
  stateLabel: string
  alertTitle: string
  alertMessage: string
  confidenceLabel: 'High confidence' | 'Moderate confidence' | 'Low confidence'
  freshnessText: string
  sourceReportCount: number
  triggeredAt: number
}

export interface GeofenceAreaEntryEvent {
  type: 'ENTER' | 'EXIT'
  areaId: string
  areaName: string
  timestamp: number
  alertTriggered: boolean
  alert?: SafetyAwarenessAlert
}

export interface UserAlertPreferences {
  alertsEnabled: boolean
  pausedUntilMs: number | null
  cooldownMinutes: number // default 60
}

/**
 * Universal Geofencing Engine interface.
 * Implemented via foreground geolocation on Web,
 * and via native background geofences (CLCircularRegion / GeofencingClient) in Flutter.
 */
export interface IGeofencingEngine {
  processLocationUpdate(coords: Coordinates): GeofenceAreaEntryEvent | null
  setAlertsEnabled(enabled: boolean): void
  pauseAlerts(durationMinutes: number): void
  resumeAlerts(): void
  getPreferences(): UserAlertPreferences
}
