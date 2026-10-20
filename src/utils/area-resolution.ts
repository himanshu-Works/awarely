/**
 * Area Resolution Utilities for Awarely.
 *
 * Core Architectural Mandate:
 * Awarely is strictly AREA-WISE. We do NOT maintain or compute safety profiles
 * for individual streets, lanes, buildings, or route corridors.
 *
 * All searches resolve to an enclosing:
 * - locality
 * - neighborhood
 * - market
 * - station area
 * - chowk / intersection district
 * - city / municipal district
 */

import type { Area, AreaBounds } from '@/types/area'
import { Timestamp } from 'firebase/firestore'

export interface GeographicComponents {
  neighborhood?: string | null
  sublocality?: string | null
  locality?: string | null
  postalCode?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  countryCode?: string | null // ISO 2-letter (e.g., 'IN', 'GB', 'US')
  route?: string | null // If the raw input was a road/street
  primaryAreaType: 'neighborhood' | 'sublocality' | 'locality' | 'market' | 'station' | 'chowk' | 'district' | 'road_fallback'
  isRoadDerived: boolean
  originalQuery?: string
}

export interface ResolvedAreaResult {
  canonicalId: string
  displayName: string
  city: string
  country: string
  fullName: string
  bounds: AreaBounds
  center: { lat: number; lng: number }
  polygonGeoJson?: string
  components: GeographicComponents
  isRoadDerived: boolean
  originalRoadName?: string
  elevationNotice?: string
}

/**
 * Normalizes text to a URL-safe, deterministic slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // remove special characters
    .replace(/\s+/g, '-') // spaces to hyphen
    .replace(/-+/g, '-') // remove duplicate hyphens
    .replace(/^-|-$/g, '') // trim leading/trailing hyphens
}

/**
 * Extracts normalized geographic components from Google address_components
 * or manual search objects.
 *
 * Preference Hierarchy:
 * 1. Neighborhood
 * 2. Sublocality (level 1 / 2)
 * 3. Locality
 * 4. Postal Code
 * 5. City / Administrative Area Level 2
 */
export function extractGeographicComponents(
  addressComponents: Array<{ long_name: string; short_name: string; types: string[] }>,
  rawTypes: string[] = [],
  originalQuery = '',
): GeographicComponents {
  let neighborhood: string | null = null
  let sublocality: string | null = null
  let locality: string | null = null
  let postalCode: string | null = null
  let city: string | null = null
  let state: string | null = null
  let country: string | null = null
  let countryCode: string | null = null
  let route: string | null = null

  for (const comp of addressComponents) {
    const types = comp.types || []

    if (types.includes('neighborhood')) {
      neighborhood = comp.long_name
    } else if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
      sublocality = sublocality || comp.long_name
    } else if (types.includes('sublocality_level_2')) {
      sublocality = sublocality || comp.long_name
    } else if (types.includes('locality')) {
      locality = comp.long_name
    } else if (types.includes('postal_code')) {
      postalCode = comp.short_name
    } else if (types.includes('administrative_area_level_2')) {
      city = city || comp.long_name
    } else if (types.includes('administrative_area_level_1')) {
      state = comp.long_name
    } else if (types.includes('country')) {
      country = comp.long_name
      countryCode = comp.short_name
    } else if (types.includes('route') || types.includes('street_address')) {
      route = comp.long_name
    }
  }

  // Determine if the primary raw entity was a road or street
  const isRoad =
    rawTypes.includes('route') ||
    rawTypes.includes('street_address') ||
    rawTypes.includes('intersection') ||
    (route !== null && !neighborhood && !sublocality && !locality)

  // Determine primary area type based on strict preference order
  let primaryAreaType: GeographicComponents['primaryAreaType'] = 'locality'
  if (neighborhood) {
    primaryAreaType = 'neighborhood'
  } else if (sublocality) {
    primaryAreaType = 'sublocality'
  } else if (locality) {
    primaryAreaType = 'locality'
  } else if (rawTypes.some((t) => t.includes('station') || t.includes('transit'))) {
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
    city: city || locality || 'Metro Region',
    state,
    country: country || 'Region',
    countryCode: countryCode ? countryCode.toUpperCase() : 'XX',
    route,
    primaryAreaType,
    isRoadDerived: isRoad,
    originalQuery,
  }
}

/**
 * Generates the canonical, deterministic area identifier.
 *
 * Structure:
 * `area-[country_code]-[city]-[primary_area_slug]`
 *
 * Example Outputs:
 * - `area-in-mumbai-bandra-west`
 * - `area-in-mumbai-colaba`
 * - `area-in-delhi-connaught-place`
 * - `area-gb-london-soho`
 */
export function generateCanonicalAreaId(components: GeographicComponents): string {
  const cc = slugify(components.countryCode || 'xx')
  const city = slugify(components.city || 'metro')

  // Pick primary geographic component by precedence order
  const primaryName =
    components.neighborhood ||
    components.sublocality ||
    components.locality ||
    components.postalCode ||
    components.city ||
    'district'

  const areaSlug = slugify(primaryName)

  return `area-${cc}-${city}-${areaSlug}`
}

/**
 * Checks whether an area is a street/road and needs broader locality elevation.
 */
export function isRoadLevelEntity(types: string[]): boolean {
  const roadTypes = ['route', 'street_address', 'street_number', 'premise', 'subpremise']
  return types.some((t) => roadTypes.includes(t))
}

/**
 * Constructs an initial unmonitored Area representation for Firestore query misses.
 *
 * CRITICAL RULE: NEVER fabricate community reports.
 * If an area is newly discovered, all report counts are 0, awareness is unknown,
 * and confidence is low.
 */
export function createUnreportedArea(
  canonicalId: string,
  name: string,
  city: string,
  country: string,
  bounds: AreaBounds,
  _center?: { lat: number; lng: number },
  polygonGeoJson?: string,
): Area {
  const now = Timestamp.now()

  // Generate a rectangular boundary polygon if GeoJSON is not provided
  const polygon =
    polygonGeoJson ||
    JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [bounds.southWest.longitude, bounds.southWest.latitude],
          [bounds.northEast.longitude, bounds.southWest.latitude],
          [bounds.northEast.longitude, bounds.northEast.latitude],
          [bounds.southWest.longitude, bounds.northEast.latitude],
          [bounds.southWest.longitude, bounds.southWest.latitude],
        ],
      ],
    })

  return {
    id: canonicalId,
    name,
    city,
    country,
    fullName: `${name}, ${city}, ${country}`,
    bounds,
    polygon,
    createdAt: now,
    updatedAt: now,
    isActive: true,
    // 0 reports — strictly no fabricated data
    reportCount: 0,
    recentReportCount: 0,
    latestReportAt: null,
    topObservations: [],
    dayNightSplit: { day: 0, night: 0 },
    confidenceLevel: 'low',
    awarenessLevel: 'unknown',
    aiSummary: null,
    aiSummaryGeneratedAt: null,
  }
}
