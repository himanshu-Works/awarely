/**
 * Maps service — helpers for Leaflet cartography, coordinates, and awareness styling.
 *
 * Provides: coordinate truncation (privacy), awareness colour mapping,
 * and Leaflet tile layer provider configuration.
 */

import {
  mapsConfig,
  getTileLayerConfig,
  isCartoConfigured,
  getCartoApiKey,
  type TileLayerConfig,
  type TileProviderId,
} from '@/config/maps.config'
import { APP_CONFIG, type AwarenessLevel } from '@/config/app.config'

/**
 * Truncate a coordinate to 3 decimal places (~111m precision).
 * Applied client-side before sending any coordinates to external services.
 * Reduces coordinate precision to area-level granularity.
 */
export function truncateCoordinate(coord: number): number {
  return Math.round(coord * 1000) / 1000
}

/**
 * Returns a hex colour string for the given awareness level.
 * Colours are intentionally neutral — no red/green.
 */
export function getAwarenessColor(level: AwarenessLevel): string {
  return APP_CONFIG.awarenessColors[level]
}

/**
 * Returns polygon fill opacity for map overlays.
 */
export function getAwarenessOpacity(level: AwarenessLevel): number {
  return level === 'unknown' ? 0.1 : 0.2
}

/**
 * Label for each awareness level — used in UI overlays and legends.
 */
export const AWARENESS_LABELS: Record<AwarenessLevel, string> = {
  active: 'Active Community Area',
  mixed: 'Mixed Conditions Reported',
  quiet: 'Quiet — Few Recent Reports',
  unknown: 'Limited Data Available',
}

/**
 * @deprecated Google Maps API key lookup. Superseded by Leaflet tile providers.
 */
export function getMapsApiKey(): string {
  return ''
}

/**
 * @deprecated Google Maps script loading has been superseded by Leaflet and Geoapify (Phase 2).
 * Retained as safe no-op returning false for backward compatibility.
 */
export function loadGoogleMapsScript(): Promise<boolean> {
  return Promise.resolve(false)
}

export {
  mapsConfig,
  getTileLayerConfig,
  isCartoConfigured,
  getCartoApiKey,
  type TileLayerConfig,
  type TileProviderId,
}
