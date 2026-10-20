/**
 * Map and cartography configuration for Awarely.
 * Supports Leaflet with CARTO Basemaps, OpenStreetMap, and optional custom tile endpoints.
 *
 * Security & Attribution Mandates:
 * - Reads VITE_CARTO_API_KEY from environment without exposing or logging it.
 * - By default, uses OpenStreetMap tiles as a zero-cost local development fallback.
 * - When VITE_CARTO_API_KEY is supplied, configures CARTO Dark Matter with verified
 *   attribution for both CARTO and OpenStreetMap contributors.
 * - Never enables Geoapify tiles or burns Geoapify credits unless explicitly opted-in via
 *   VITE_USE_GEOAPIFY_TILES=true.
 */

export type TileProviderId = 'carto' | 'osm' | 'geoapify' | 'custom'

export interface TileLayerConfig {
  providerId: TileProviderId
  name: string
  url: string
  attribution: string
  maxZoom: number
  minZoom: number
  subdomains?: string[] | string
  applyDarkFilter: boolean
  isNativeDark?: boolean
}

/**
 * Retrieves the CARTO API key without logging or hardcoding.
 */
export function getCartoApiKey(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CARTO_API_KEY) {
    return String(import.meta.env.VITE_CARTO_API_KEY).trim()
  }
  return ''
}

/**
 * Checks whether a valid CARTO API key is present in environment.
 */
export function isCartoConfigured(): boolean {
  return getCartoApiKey().length > 0
}

/**
 * Resolves the active Leaflet tile layer configuration based on environment settings.
 *
 * Priority order:
 * 1. Explicit custom tile URL (VITE_MAP_TILE_URL)
 * 2. CARTO Basemaps (when VITE_CARTO_API_KEY is configured — defaults to Voyager)
 * 3. Geoapify raster tiles (only when VITE_USE_GEOAPIFY_TILES=true and key present)
 * 4. Default: OpenStreetMap standard tile server (zero-cost development fallback)
 */
export function getTileLayerConfig(): TileLayerConfig {
  // 1. Explicit custom tile URL override
  const customUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAP_TILE_URL
    ? String(import.meta.env.VITE_MAP_TILE_URL).trim()
    : '')
  const customAttr = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAP_TILE_ATTRIBUTION
    ? String(import.meta.env.VITE_MAP_TILE_ATTRIBUTION).trim()
    : '')

  if (customUrl) {
    return {
      providerId: 'custom',
      name: 'Custom Cartography Provider',
      url: customUrl,
      attribution:
        customAttr ||
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 3,
      applyDarkFilter: false,
      isNativeDark: false,
    }
  }

  // 2. Geoapify raster tiles (ONLY if explicitly opted-in via VITE_USE_GEOAPIFY_TILES=true)
  // Protected: does not consume Geoapify credits by default.
  const useGeoapifyTiles = typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_GEOAPIFY_TILES === 'true'
  const geoapifyKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEOAPIFY_API_KEY
    ? String(import.meta.env.VITE_GEOAPIFY_API_KEY).trim()
    : '')

  if (useGeoapifyTiles && geoapifyKey) {
    return {
      providerId: 'geoapify',
      name: 'Geoapify Dark Matter',
      url: `https://maps.geoapify.com/v1/tile/dark-matter-dark-purple/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(geoapifyKey)}`,
      attribution:
        'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> | &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 20,
      minZoom: 3,
      applyDarkFilter: false,
      isNativeDark: true,
    }
  }

  // 3. CARTO Basemaps (configured when valid VITE_CARTO_API_KEY is supplied — defaults to Voyager)
  const cartoKey = getCartoApiKey()
  if (cartoKey) {
    const rawTheme = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CARTO_THEME
      ? String(import.meta.env.VITE_CARTO_THEME).trim().toLowerCase()
      : '')
    // Default to voyager for clear, readable street navigation; support dark_all and light_all
    const cartoTheme = ['voyager', 'light_all', 'dark_all'].includes(rawTheme)
      ? rawTheme
      : 'voyager'

    const themeDisplayName =
      cartoTheme === 'voyager'
        ? 'Voyager'
        : cartoTheme === 'dark_all'
          ? 'Dark Matter'
          : cartoTheme === 'light_all'
            ? 'Positron'
            : cartoTheme

    return {
      providerId: 'carto',
      name: `CARTO ${themeDisplayName}`,
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/${cartoTheme}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      maxZoom: 19,
      minZoom: 3,
      subdomains: ['a', 'b', 'c', 'd'],
      applyDarkFilter: false,
      isNativeDark: cartoTheme === 'dark_all',
    }
  }

  // 4. Default: OpenStreetMap standard tile server
  // Compliant with OSM Tile Usage Policy: includes required attribution, standard user caching.
  return {
    providerId: 'osm',
    name: 'OpenStreetMap Standard (Development Fallback)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
    minZoom: 3,
    applyDarkFilter: true,
    isNativeDark: false,
  }
}

export const mapsConfig = {
  defaultZoom: 13,
  minZoom: 3,
  maxZoom: 19,
} as const
