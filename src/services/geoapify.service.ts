/**
 * Geoapify Geocoding & Address Autocomplete Service.
 *
 * Implements privacy-first, zero-cost forward and reverse geocoding
 * backed by OpenStreetMap and Geoapify Free Tier (3,000 requests/day).
 *
 * Privacy & Security Guarantees:
 * - Reads API key from VITE_GEOAPIFY_API_KEY.
 * - Coordinates are always truncated to 3 decimal places (~111m) BEFORE network transmission.
 * - In-flight stale autocomplete requests are aborted via AbortController.
 * - Zero raw GPS persistence; transient React state only.
 * - Never prints or exposes the API key in logs.
 */

import type { AreaBounds } from '@/types/area'
import type { AreaSuggestion } from '@/services/geocoding.service'
import type { GeographicComponents } from '@/utils/area-resolution'

export interface GeoapifyFeatureProperties {
  name?: string
  formatted?: string
  address_line1?: string
  address_line2?: string
  suburb?: string
  neighbourhood?: string
  neighborhood?: string
  district?: string
  city?: string
  town?: string
  village?: string
  county?: string
  state?: string
  country?: string
  country_code?: string
  postcode?: string
  street?: string
  result_type?: string
  place_id?: string
  lat?: number
  lon?: number
  bbox?: [number, number, number, number]
}

export interface GeoapifyFeature {
  type: 'Feature'
  properties: GeoapifyFeatureProperties
  geometry?: {
    type: 'Point'
    coordinates: [number, number]
  }
  bbox?: [number, number, number, number]
}

export interface GeoapifyResponse {
  type: 'FeatureCollection'
  features?: GeoapifyFeature[]
}

const GEOAPIFY_BASE_URL = 'https://api.geoapify.com/v1/geocode'

/** Stale request cancellation controller for autocomplete. */
let inFlightAutocompleteAbort: AbortController | null = null

/**
 * Retrieves the configured Geoapify API key.
 * Never prints or hardcodes the key.
 */
export function getGeoapifyApiKey(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEOAPIFY_API_KEY) {
    return String(import.meta.env.VITE_GEOAPIFY_API_KEY).trim()
  }
  return ''
}

/**
 * Checks whether a valid-length Geoapify API key is present in environment.
 */
export function isGeoapifyConfigured(): boolean {
  return getGeoapifyApiKey().length > 0
}

/**
 * Maps a Geoapify GeoJSON feature to an Awarely AreaSuggestion.
 */
export function normalizeGeoapifyFeature(
  feature: GeoapifyFeature,
  fallbackCoords?: { lat: number; lng: number },
): AreaSuggestion {
  const p = feature.properties || {}

  const neighborhood = p.neighbourhood || p.neighborhood || null
  const sublocality = p.suburb || p.district || null
  const locality = p.city || p.town || p.village || null
  const county = p.county || null
  const state = p.state || ''
  const country = p.country || 'Global'

  const city = locality || county || sublocality || 'Local Area'

  // Primary area name selection by hierarchy
  const primaryName = p.name || neighborhood || sublocality || locality || county || p.address_line1 || 'Local Area'

  const secondaryParts = [city, state, country].filter(Boolean)
  // Deduplicate consecutive parts
  const filteredSecondary: string[] = []
  secondaryParts.forEach((part) => {
    if (!filteredSecondary.includes(part) && part !== primaryName) {
      filteredSecondary.push(part)
    }
  })
  const secondaryText = filteredSecondary.length > 0 ? filteredSecondary.join(', ') : country

  // Parse bounding box: GeoJSON bbox is [min_lon, min_lat, max_lon, max_lat]
  const bbox = p.bbox || feature.bbox
  let bounds: AreaBounds | undefined
  if (Array.isArray(bbox) && bbox.length === 4) {
    bounds = {
      southWest: { latitude: bbox[1], longitude: bbox[0] },
      northEast: { latitude: bbox[3], longitude: bbox[2] },
    }
  }

  const lat = p.lat ?? feature.geometry?.coordinates?.[1] ?? fallbackCoords?.lat ?? 0
  const lng = p.lon ?? feature.geometry?.coordinates?.[0] ?? fallbackCoords?.lng ?? 0

  const isRoad =
    p.result_type === 'street' ||
    Boolean(p.street && !neighborhood && !sublocality && !locality)

  let areaType: AreaSuggestion['areaType'] = 'locality'
  if (isRoad) {
    areaType = 'road'
  } else if (p.result_type === 'amenity') {
    areaType = 'station'
  } else if (neighborhood || p.result_type === 'neighbourhood') {
    areaType = 'neighborhood'
  } else if (sublocality || p.result_type === 'suburb') {
    areaType = 'neighborhood'
  } else if (p.postcode && p.result_type === 'postcode') {
    areaType = 'district'
  }

  return {
    placeId: p.place_id ? `geoapify-${p.place_id}` : `geoapify-${lat}-${lng}`,
    mainText: primaryName,
    secondaryText,
    areaType,
    isRoad,
    coordinates: { lat, lng },
    bounds,
    containingAreaHint: isRoad ? (sublocality || city) : undefined,
    resolutionSource: 'Geoapify Geocoder (OpenStreetMap)',
    fallbackUsed: false,
  }
}

/**
 * Maps Geoapify feature properties to Awarely GeographicComponents.
 */
export function mapGeoapifyToGeographicComponents(
  properties: GeoapifyFeatureProperties,
  originalQuery = '',
): GeographicComponents {
  const neighborhood = properties.neighbourhood || properties.neighborhood || null
  const sublocality = properties.suburb || properties.district || null
  const locality = properties.city || properties.town || properties.village || null
  const postalCode = properties.postcode || null
  const city = properties.city || properties.county || locality || 'Metro Region'
  const state = properties.state || null
  const country = properties.country || 'Region'
  const countryCode = properties.country_code ? properties.country_code.toUpperCase() : 'XX'
  const route = properties.street || null

  const isRoad =
    properties.result_type === 'street' ||
    (route !== null && !neighborhood && !sublocality && !locality)

  let primaryAreaType: GeographicComponents['primaryAreaType'] = 'locality'
  if (neighborhood) {
    primaryAreaType = 'neighborhood'
  } else if (sublocality) {
    primaryAreaType = 'sublocality'
  } else if (locality) {
    primaryAreaType = 'locality'
  } else if (properties.result_type === 'amenity') {
    primaryAreaType = 'station'
  } else if (isRoad) {
    primaryAreaType = 'road_fallback'
  } else {
    primaryAreaType = 'district'
  }

  return {
    neighborhood,
    sublocality,
    locality,
    postalCode,
    city,
    state,
    country,
    countryCode,
    route,
    primaryAreaType,
    isRoadDerived: isRoad,
    originalQuery,
  }
}

export const geoapifyService = {
  /**
   * Reverse geocodes coarse coordinates using Geoapify's reverse-geocoding API.
   * Coordinate precision is client-side truncated to 3 decimals (~111m) for privacy.
   */
  async reverseGeocode(lat: number, lng: number): Promise<AreaSuggestion | null> {
    const apiKey = getGeoapifyApiKey()
    if (!apiKey) {
      return null
    }

    // Privacy truncation: truncate to 3 decimals before external transmission
    const coarseLat = Math.round(lat * 1000) / 1000
    const coarseLng = Math.round(lng * 1000) / 1000

    const url = `${GEOAPIFY_BASE_URL}/reverse?lat=${coarseLat}&lon=${coarseLng}&format=geojson&apiKey=${apiKey}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn('[Awarely] Geoapify authentication error (HTTP ' + response.status + '). Falling back.')
        } else if (response.status === 429) {
          console.warn('[Awarely] Geoapify rate limit reached (HTTP 429). Falling back to catalog/dynamic synthesis.')
        } else {
          console.warn('[Awarely] Geoapify reverse geocode HTTP ' + response.status)
        }
        return null
      }

      const data: GeoapifyResponse = await response.json()
      if (!data || !Array.isArray(data.features) || data.features.length === 0) {
        return null
      }

      return normalizeGeoapifyFeature(data.features[0], { lat: coarseLat, lng: coarseLng })
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return null
      }
      console.warn('[Awarely] Geoapify reverse geocoding network error:', err?.message || err)
      return null
    }
  },

  /**
   * Searches and autocompletes address/locality queries using Geoapify.
   * Cancels any prior in-flight autocomplete queries to avoid stale responses.
   * Enforces a minimum 2-character requirement.
   */
  async autocomplete(query: string): Promise<AreaSuggestion[]> {
    const q = query.trim()
    if (!q || q.length < 2) {
      return []
    }

    const apiKey = getGeoapifyApiKey()
    if (!apiKey) {
      return []
    }

    // Cancel in-flight request if user is still typing
    if (inFlightAutocompleteAbort) {
      inFlightAutocompleteAbort.abort()
      inFlightAutocompleteAbort = null
    }

    const controller = new AbortController()
    inFlightAutocompleteAbort = controller

    // Supported parameters only; omit `type` to search all relevant place levels
    const url = `${GEOAPIFY_BASE_URL}/autocomplete?text=${encodeURIComponent(q)}&format=geojson&apiKey=${apiKey}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn('[Awarely] Geoapify autocomplete authorization notice (HTTP ' + response.status + ')')
        } else if (response.status === 429) {
          console.warn('[Awarely] Geoapify autocomplete rate limit notice (HTTP 429)')
        }
        return []
      }

      const data: GeoapifyResponse = await response.json()
      if (!data || !Array.isArray(data.features) || data.features.length === 0) {
        return []
      }

      return data.features.map((f) => normalizeGeoapifyFeature(f))
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Query superseded by subsequent keystroke — silently ignore
        return []
      }
      console.warn('[Awarely] Geoapify autocomplete error:', err?.message || err)
      return []
    } finally {
      if (inFlightAutocompleteAbort === controller) {
        inFlightAutocompleteAbort = null
      }
    }
  },
}
