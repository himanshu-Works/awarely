import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  geoapifyService,
  normalizeGeoapifyFeature,
  mapGeoapifyToGeographicComponents,
  getGeoapifyApiKey,
  isGeoapifyConfigured,
  type GeoapifyFeature,
} from '@/services/geoapify.service'
import { geocodingService } from '@/services/geocoding.service'

describe('Geoapify Geocoding & Address Resolution Service', () => {
  const originalEnv = import.meta.env.VITE_GEOAPIFY_API_KEY

  beforeEach(() => {
    vi.restoreAllMocks()
    // Default test key
    vi.stubEnv('VITE_GEOAPIFY_API_KEY', 'geoapify_test_dummy_key_12345')
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      vi.stubEnv('VITE_GEOAPIFY_API_KEY', originalEnv)
    } else {
      vi.unstubAllEnvs()
    }
  })

  describe('1. Configuration & Privacy Guarantees', () => {
    it('reads the API key from VITE_GEOAPIFY_API_KEY without exposing or hardcoding it', () => {
      expect(isGeoapifyConfigured()).toBe(true)
      expect(getGeoapifyApiKey()).toBe('geoapify_test_dummy_key_12345')
    })

    it('returns empty string and isGeoapifyConfigured = false when key is missing or blank', () => {
      vi.stubEnv('VITE_GEOAPIFY_API_KEY', '   ')
      expect(isGeoapifyConfigured()).toBe(false)
      expect(getGeoapifyApiKey()).toBe('')
    })

    it('truncates coordinates to 3 decimal places (~111m) before external network request', async () => {
      let requestedUrl = ''
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        requestedUrl = url
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {
                    name: 'Indira Nagar',
                    city: 'Lucknow',
                    state: 'Uttar Pradesh',
                    country: 'India',
                    lat: 26.883,
                    lon: 80.985,
                  },
                },
              ],
            }),
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      // Raw high-precision coordinates (6 decimals)
      const rawLat = 26.883492
      const rawLng = 80.985123

      await geoapifyService.reverseGeocode(rawLat, rawLng)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(requestedUrl).toContain('lat=26.883')
      expect(requestedUrl).toContain('lon=80.985')
      expect(requestedUrl).not.toContain('26.883492')
      expect(requestedUrl).not.toContain('80.985123')
    })
  })

  describe('2. Reverse Geocoding with Realistic GeoJSON', () => {
    it('successfully reverse geocodes a coordinate to a structured AreaSuggestion', async () => {
      const mockFeature: GeoapifyFeature = {
        type: 'Feature',
        properties: {
          name: 'Indira Nagar',
          neighbourhood: 'Indira Nagar',
          suburb: 'Indira Nagar',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          country: 'India',
          country_code: 'in',
          postcode: '226016',
          place_id: 'geoapify_indira_nagar_place_1',
          lat: 26.883,
          lon: 80.985,
          bbox: [80.97, 26.87, 81.0, 26.89],
        },
      }

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            type: 'FeatureCollection',
            features: [mockFeature],
          }),
        }),
      )

      const result = await geoapifyService.reverseGeocode(26.883, 80.985)

      expect(result).not.toBeNull()
      expect(result?.mainText).toBe('Indira Nagar')
      expect(result?.secondaryText).toBe('Lucknow, Uttar Pradesh, India')
      expect(result?.areaType).toBe('neighborhood')
      expect(result?.coordinates).toEqual({ lat: 26.883, lng: 80.985 })
      expect(result?.bounds).toEqual({
        southWest: { latitude: 26.87, longitude: 80.97 },
        northEast: { latitude: 26.89, longitude: 81.0 },
      })
      expect(result?.resolutionSource).toBe('Geoapify Geocoder (OpenStreetMap)')
      expect(result?.fallbackUsed).toBe(false)
      expect(result?.placeId).toBe('geoapify-geoapify_indira_nagar_place_1')
    })

    it('handles missing neighborhood but present city/state correctly', async () => {
      const mockFeature: GeoapifyFeature = {
        type: 'Feature',
        properties: {
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          country: 'India',
          country_code: 'in',
          place_id: 'lucknow_city_center',
          lat: 26.846,
          lon: 80.946,
        },
      }

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            type: 'FeatureCollection',
            features: [mockFeature],
          }),
        }),
      )

      const result = await geoapifyService.reverseGeocode(26.846, 80.946)

      expect(result).not.toBeNull()
      expect(result?.mainText).toBe('Lucknow')
      expect(result?.secondaryText).toBe('Uttar Pradesh, India')
      expect(result?.areaType).toBe('locality')
      expect(result?.resolutionSource).toBe('Geoapify Geocoder (OpenStreetMap)')
      expect(result?.fallbackUsed).toBe(false)
    })

    it('maps Geoapify feature properties to GeographicComponents correctly', () => {
      const components = mapGeoapifyToGeographicComponents({
        name: 'Koramangala',
        neighbourhood: 'Koramangala',
        suburb: 'South Bangalore',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        country_code: 'in',
        postcode: '560034',
      })

      expect(components.neighborhood).toBe('Koramangala')
      expect(components.sublocality).toBe('South Bangalore')
      expect(components.city).toBe('Bengaluru')
      expect(components.state).toBe('Karnataka')
      expect(components.country).toBe('India')
      expect(components.countryCode).toBe('IN')
      expect(components.primaryAreaType).toBe('neighborhood')
      expect(components.isRoadDerived).toBe(false)
    })

    it('normalizes street and amenity feature types into appropriate AreaSuggestion structures', () => {
      const roadFeature: GeoapifyFeature = {
        type: 'Feature',
        properties: {
          name: 'MG Road',
          street: 'MG Road',
          suburb: 'Central District',
          city: 'Bengaluru',
          country: 'India',
          result_type: 'street',
          place_id: 'road_mg_1',
          lat: 12.975,
          lon: 77.609,
        },
      }
      const roadSuggestion = normalizeGeoapifyFeature(roadFeature)
      expect(roadSuggestion.isRoad).toBe(true)
      expect(roadSuggestion.areaType).toBe('road')
      expect(roadSuggestion.containingAreaHint).toBe('Central District')

      const stationFeature: GeoapifyFeature = {
        type: 'Feature',
        properties: {
          name: 'Central Metro Station',
          city: 'Bengaluru',
          country: 'India',
          result_type: 'amenity',
          lat: 12.976,
          lon: 77.61,
        },
      }
      const stationSuggestion = normalizeGeoapifyFeature(stationFeature)
      expect(stationSuggestion.areaType).toBe('station')
      expect(stationSuggestion.isRoad).toBe(false)
    })
  })

  describe('3. Autocomplete Search & Query Cancellation', () => {
    it('returns empty array if query length is less than 2 characters without calling fetch', async () => {
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)

      const resultsSingle = await geoapifyService.autocomplete('a')
      const resultsEmpty = await geoapifyService.autocomplete('   ')

      expect(resultsSingle).toEqual([])
      expect(resultsEmpty).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns area suggestions on successful autocomplete lookup', async () => {
      let requestedUrl = ''
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          requestedUrl = url
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {
                    name: 'Aliganj',
                    neighbourhood: 'Aliganj',
                    city: 'Lucknow',
                    state: 'Uttar Pradesh',
                    country: 'India',
                    place_id: 'aliganj_lucknow_1',
                    lat: 26.884,
                    lon: 80.941,
                  },
                },
              ],
            }),
          })
        }),
      )

      const suggestions = await geoapifyService.autocomplete('Aliganj')

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].mainText).toBe('Aliganj')
      expect(suggestions[0].secondaryText).toBe('Lucknow, Uttar Pradesh, India')
      expect(suggestions[0].resolutionSource).toBe('Geoapify Geocoder (OpenStreetMap)')
      expect(suggestions[0].fallbackUsed).toBe(false)

      // Verify supported parameters only: no type=neighbourhood in URL
      expect(requestedUrl).not.toContain('type=neighbourhood')
    })

    it('aborts prior in-flight request when user continues typing', async () => {
      let firstRequestAborted = false

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
          return new Promise((resolve, reject) => {
            if (init?.signal) {
              init.signal.addEventListener('abort', () => {
                firstRequestAborted = true
                const err = new Error('The user aborted a request.')
                err.name = 'AbortError'
                reject(err)
              })
            }
            // Delay resolution to simulate in-flight keystroke
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                json: async () => ({ type: 'FeatureCollection', features: [] }),
              })
            }, 100)
          })
        }),
      )

      // Fire first request without awaiting immediately
      const promise1 = geoapifyService.autocomplete('Haz')
      // Immediately fire second request
      const promise2 = geoapifyService.autocomplete('Hazrat')

      const [res1, res2] = await Promise.all([promise1, promise2])

      expect(firstRequestAborted).toBe(true)
      expect(res1).toEqual([])
      expect(res2).toEqual([])
    })
  })

  describe('4. Error Handling, Rate Limits, and Malformed Responses', () => {
    it('handles HTTP 401/403 unauthorized gracefully without throwing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        }),
      )

      const revResult = await geoapifyService.reverseGeocode(26.85, 80.94)
      const autoResult = await geoapifyService.autocomplete('Lucknow')

      expect(revResult).toBeNull()
      expect(autoResult).toEqual([])
    })

    it('handles HTTP 429 rate limit gracefully without throwing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        }),
      )

      const revResult = await geoapifyService.reverseGeocode(26.85, 80.94)
      const autoResult = await geoapifyService.autocomplete('Lucknow')

      expect(revResult).toBeNull()
      expect(autoResult).toEqual([])
    })

    it('handles HTTP 500 / 502 / 503 server errors gracefully', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        }),
      )

      const revResult = await geoapifyService.reverseGeocode(26.85, 80.94)
      const autoResult = await geoapifyService.autocomplete('Lucknow')

      expect(revResult).toBeNull()
      expect(autoResult).toEqual([])
    })

    it('handles network failure (fetch throws TypeError) gracefully', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch (offline or DNS error)')),
      )

      const revResult = await geoapifyService.reverseGeocode(26.85, 80.94)
      const autoResult = await geoapifyService.autocomplete('Lucknow')

      expect(revResult).toBeNull()
      expect(autoResult).toEqual([])
    })

    it('handles empty results and malformed JSON payloads gracefully', async () => {
      // 1. Empty features
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ type: 'FeatureCollection', features: [] }),
        }),
      )
      expect(await geoapifyService.reverseGeocode(26.85, 80.94)).toBeNull()
      expect(await geoapifyService.autocomplete('Lucknow')).toEqual([])

      // 2. Missing features array
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({}),
        }),
      )
      expect(await geoapifyService.reverseGeocode(26.85, 80.94)).toBeNull()
      expect(await geoapifyService.autocomplete('Lucknow')).toEqual([])

      // 3. JSON parse error
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError('Unexpected token < in JSON at position 0')
          },
        }),
      )
      expect(await geoapifyService.reverseGeocode(26.85, 80.94)).toBeNull()
      expect(await geoapifyService.autocomplete('Lucknow')).toEqual([])
    })
  })

  describe('5. Integration with GeocodingService & Fallback Invariants', () => {
    it('uses Geoapify when configured and returns genuine lookup metadata', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {
                  name: 'Mahanagar',
                  neighbourhood: 'Mahanagar',
                  city: 'Lucknow',
                  state: 'Uttar Pradesh',
                  country: 'India',
                  place_id: 'geoapify-mahanagar-1',
                  lat: 26.872,
                  lon: 80.952,
                },
              },
            ],
          }),
        }),
      )

      const suggestion = await geocodingService.reverseGeocode(26.872, 80.952)

      expect(suggestion.mainText).toBe('Mahanagar')
      expect(suggestion.secondaryText).toBe('Lucknow, Uttar Pradesh, India')
      expect(suggestion.resolutionSource).toBe('Geoapify Geocoder (OpenStreetMap)')
      expect(suggestion.fallbackUsed).toBe(false)
    })

    it('falls back to seed/catalog or dynamic synthesis if Geoapify fails, marking fallbackUsed: true', async () => {
      // Simulate Geoapify 429 rate limit
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        }),
      )

      // Inside Colaba seed bounds: 18.915-18.928, 72.824-72.836
      const seedSuggestion = await geocodingService.reverseGeocode(18.92, 72.83)
      expect(seedSuggestion.mainText).toContain('Colaba')
      expect(seedSuggestion.resolutionSource).toBe('Curated Seed Area (Geographic Bounds)')
      expect(seedSuggestion.fallbackUsed).toBe(true)

      // Inside Gomti Nagar catalog bounds: 26.83-26.87, 80.97-81.01
      const catSuggestion = await geocodingService.reverseGeocode(26.85, 80.99)
      expect(catSuggestion.mainText).toBe('Gomti Nagar')
      expect(catSuggestion.resolutionSource).toBe('Local Catalog Boundary Match')
      expect(catSuggestion.fallbackUsed).toBe(true)

      // Far outside catalog bounds (e.g. rural area / uncatalogued)
      const dynamicSuggestion = await geocodingService.reverseGeocode(28.123, 79.456)
      expect(dynamicSuggestion.placeId).toContain('rev-global-')
      expect(dynamicSuggestion.resolutionSource).toBe('Dynamic Geographic Locality Synthesis')
      expect(dynamicSuggestion.fallbackUsed).toBe(true)
    })

    it('preserves the NO-broad-catalog-snap invariant when Geoapify fails or is unconfigured', async () => {
      // Unconfigured or failed Geoapify
      vi.stubEnv('VITE_GEOAPIFY_API_KEY', '')

      // Coordinate in Barabanki outskirts ~18km from Hazratganj (26.75, 81.12)
      // Must NOT snap to Hazratganj
      const suggestion = await geocodingService.reverseGeocode(26.75, 81.12)
      expect(suggestion.mainText).not.toBe('Hazratganj')
      expect(suggestion.placeId).not.toContain('hazratganj')
      expect(suggestion.resolutionSource).toBe('Dynamic Geographic Locality Synthesis')
      expect(suggestion.fallbackUsed).toBe(true)
    })

    it('never fabricates an area name or safety score for an uncatalogued area', async () => {
      vi.stubEnv('VITE_GEOAPIFY_API_KEY', '')

      const suggestion = await geocodingService.reverseGeocode(29.123, 77.456)
      const resolved = await geocodingService.resolveArea(suggestion)

      expect(resolved.isNewArea).toBe(true)
      expect(resolved.area.overallScore ?? null).toBeNull()
      expect(resolved.area.reportCount).toBe(0)
      expect(resolved.area.confidenceLevel).toBe('low')
      expect(resolved.area.awarenessLevel).toBe('unknown')
      expect(resolved.area.aiSummary).toBeNull()
      expect(resolved.area.name).toBe('Local Area (29.12, 77.46)')
    })
  })
})
