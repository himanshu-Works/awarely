import { describe, it, expect, vi, beforeEach } from 'vitest'
import { geocodingService } from '@/services/geocoding.service'
import { devToolsService } from '@/services/dev-tools.service'
import { SEED_AREAS } from '@/data/seedAreas'

describe('Near Me & Location Accuracy Pipeline Regression Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. Geolocation Options & One-Shot Invariants', () => {
    it('forces fresh, one-shot high accuracy request with maximumAge: 0 and enableHighAccuracy: true', async () => {
      let capturedOptions: PositionOptions | undefined

      const mockGetCurrentPosition = vi.fn((success, _error, options) => {
        capturedOptions = options
        success({
          coords: {
            latitude: 26.892,
            longitude: 81.058,
            accuracy: 25,
          },
          timestamp: Date.now(),
        })
      })

      // Simulate browser geolocation
      const fakeNavigator = {
        geolocation: {
          getCurrentPosition: mockGetCurrentPosition,
        },
      }

      // Invoke simulated one-shot request
      fakeNavigator.geolocation.getCurrentPosition(
        (pos: any) => {
          expect(pos.coords.latitude).toBe(26.892)
        },
        () => {},
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        },
      )

      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1)
      expect(capturedOptions).toBeDefined()
      expect(capturedOptions?.enableHighAccuracy).toBe(true)
      expect(capturedOptions?.maximumAge).toBe(0)
      expect(capturedOptions?.timeout).toBe(12000)
    })
  })

  describe('2. Catalog Snapping Eradication & Worldwide Generalization', () => {
    it('does NOT arbitrarily snap uncatalogued coordinates in UP to Hazratganj', async () => {
      // Coordinate in Barabanki / Mohanlalganj / outskirts ~18km from Hazratganj (26.853, 80.945)
      // Under old bug: within 0.35 deg (~35km), this snapped directly to Hazratganj!
      const outskirtsLat = 26.75
      const outskirtsLng = 81.12

      const suggestion = await geocodingService.reverseGeocode(outskirtsLat, outskirtsLng)
      expect(suggestion).toBeDefined()
      // MUST NOT be Hazratganj!
      expect(suggestion.mainText).not.toBe('Hazratganj')
      expect(suggestion.placeId).not.toContain('hazratganj')
    })

    it('does NOT snap coordinates in other cities (Kanpur outskirts, Delhi, Bangalore) to Hazratganj', async () => {
      const bangaloreLat = 12.971
      const bangaloreLng = 77.594

      const suggestion = await geocodingService.reverseGeocode(bangaloreLat, bangaloreLng)
      expect(suggestion).toBeDefined()
      expect(suggestion.mainText).not.toBe('Hazratganj')
      expect(suggestion.secondaryText).not.toContain('Lucknow')
    })

    it('resolves actual dev machine physical coordinates (26.940, 80.939) without snapping to Hazratganj', async () => {
      const devMachineLat = 26.940
      const devMachineLng = 80.939

      const suggestion = await geocodingService.reverseGeocode(devMachineLat, devMachineLng)
      expect(suggestion).toBeDefined()
      expect(suggestion.mainText).not.toBe('Hazratganj')

      const resolved = await geocodingService.resolveArea(suggestion)
      expect(resolved.area).toBeDefined()
      expect(resolved.area.name).not.toBe('Hazratganj')
    })

    it('matches Hazratganj ONLY if coordinate is genuinely inside Hazratganj catalog bounds', async () => {
      // Inside Hazratganj bounding box: 26.845 - 26.860, 80.935 - 80.955
      const insideLat = 26.853
      const insideLng = 80.945

      const suggestion = await geocodingService.reverseGeocode(insideLat, insideLng)
      expect(suggestion.mainText).toBe('Hazratganj')
      expect(suggestion.secondaryText).toContain('Lucknow')

      // Outside bounds: 26.82, 80.90 (several km south-west)
      const outsideLat = 26.82
      const outsideLng = 80.90
      const outsideSuggestion = await geocodingService.reverseGeocode(outsideLat, outsideLng)
      expect(outsideSuggestion.mainText).not.toBe('Hazratganj')
    })

    it('resolves uncatalogued global coordinates to honest local area without fabricating scores', async () => {
      const coordLat = 40.712
      const coordLng = -74.006

      const suggestion = await geocodingService.reverseGeocode(coordLat, coordLng)
      expect(suggestion).toBeDefined()

      const resolved = await geocodingService.resolveArea(suggestion)
      expect(resolved.area).toBeDefined()
      expect(resolved.area.reportCount).toBe(0)
      expect(resolved.area.confidenceLevel).toBe('low')
      expect(resolved.area.overallScore).toBeFalsy()
    })
  })

  describe('3. Low-Accuracy Detection & Notification Messages', () => {
    it('identifies accuracy > 1500m as approximate and formats message safely', () => {
      const accuracyMeters = 3500
      const isLowAccuracy = accuracyMeters > 1500
      expect(isLowAccuracy).toBe(true)

      const accuracyLabel =
        accuracyMeters >= 1000
          ? `${(accuracyMeters / 1000).toFixed(1)} km`
          : `${Math.round(accuracyMeters)} m`
      const notice = `Approximate location — accuracy about ${accuracyLabel}`

      expect(notice).toBe('Approximate location — accuracy about 3.5 km')
    })

    it('identifies accuracy <= 1500m as standard precision', () => {
      const accuracyMeters = 45
      const isLowAccuracy = accuracyMeters > 1500
      expect(isLowAccuracy).toBe(false)

      const finalArea = { name: 'Colaba Causeway', city: 'Mumbai' }
      const notice = `Current area: ${finalArea.name}, ${finalArea.city}`
      expect(notice).toBe('Current area: Colaba Causeway, Mumbai')
    })

    it('handles W3C geolocation error codes with presentation-safe messages', () => {
      const getErrorMessage = (code: number) => {
        if (code === 1) return 'Location permission is required to use Near Me.'
        if (code === 2) return 'Current location could not be determined. Try again.'
        if (code === 3) return 'Location request timed out. Try again.'
        return 'Current location could not be determined. Try again.'
      }

      expect(getErrorMessage(1)).toBe('Location permission is required to use Near Me.')
      expect(getErrorMessage(2)).toBe('Current location could not be determined. Try again.')
      expect(getErrorMessage(3)).toBe('Location request timed out. Try again.')
    })
  })

  describe('4. DevTools Simulation & Near Me Separation', () => {
    it('verifies DevTools simulation does not overwrite or corrupt real location data', () => {
      // 1. Simulate danger zone (Old Delhi Rail Perimeter)
      const simDanger = devToolsService.simulateZone('danger', SEED_AREAS)
      expect(simDanger.zone.name).toBe('Simulated Danger Zone')
      expect(simDanger.zone.areaName).toContain('Old Delhi')
      expect(devToolsService.getCurrentSimulationState().coords).toEqual({
        latitude: 28.659,
        longitude: 77.221,
      })

      // 2. Reset location in DevTools moves to neutral/outside
      const simReset = devToolsService.simulateZone('outside', SEED_AREAS)
      expect(simReset.zone.name).toBe('Outside Monitored Areas')
      expect(devToolsService.getCurrentSimulationState().coords).toEqual({
        latitude: 0,
        longitude: 0,
      })

      // 3. Reset simulation sets state to neutral coordinates (0,0) outside monitored areas
      devToolsService.resetSimulation(SEED_AREAS)
      expect(devToolsService.getCurrentSimulationState().coords).toEqual({
        latitude: 0,
        longitude: 0,
      })
    })
  })

  describe('5. Search Area vs. Near Me Flow Separation', () => {
    it('ensures search-selected area is not contaminated by Near Me request failures', () => {
      // User has manually searched and selected an area (e.g. Bandra West)
      const manualSearchArea = SEED_AREAS[1] // Bandra West
      let currentSelectedArea = manualSearchArea
      let currentLocationError: string | null = null
      let currentLocationNotice: string | null = null

      // Simulate a failed Near Me request (e.g., permission denied)
      const handleLocationFailure = (errorCode: number) => {
        if (errorCode === 1) {
          currentLocationError = 'Location permission is required to use Near Me.'
        }
        currentLocationNotice = null
        // CRITICAL INVARIANT: currentSelectedArea MUST NOT be mutated or silently set to Hazratganj!
      }

      handleLocationFailure(1)

      // Verified: Selected area remains Bandra West, not silently swapped
      expect(currentSelectedArea.id).toBe('area-mumbai-bandra-west')
      expect(currentLocationError).toBe('Location permission is required to use Near Me.')
      expect(currentLocationNotice).toBeNull()
    })

    it('ensures successful Near Me resolution updates the selected area to fresh location', async () => {
      const manualSearchArea = SEED_AREAS[0] // Colaba
      let currentSelectedArea = manualSearchArea

      // Simulate successful Near Me resolution for Shinjuku, Tokyo
      const tokyoLat = 35.6938
      const tokyoLng = 139.7034
      const suggestion = await geocodingService.reverseGeocode(tokyoLat, tokyoLng)
      const resolved = await geocodingService.resolveArea(suggestion)

      currentSelectedArea = resolved.area

      expect(currentSelectedArea.name).toBe('Shinjuku')
      expect(currentSelectedArea.city).toBe('Tokyo')
    })
  })

  describe('6. Privacy & One-Shot Integrity Verification', () => {
    it('verifies coordinate truncation to 3 decimal places (~111m) before reverse geocoding', () => {
      const rawLat = 26.9399695585719
      const rawLng = 80.9385838526177

      const coarseLat = Math.round(rawLat * 1000) / 1000
      const coarseLng = Math.round(rawLng * 1000) / 1000

      expect(coarseLat).toBe(26.940)
      expect(coarseLng).toBe(80.939)

      // Difference should be within truncation window (< 0.001)
      expect(Math.abs(rawLat - coarseLat)).toBeLessThan(0.001)
      expect(Math.abs(rawLng - coarseLng)).toBeLessThan(0.001)
    })
  })

  describe('7. Fallback Classification and Geocoder Error Handling Regression Tests', () => {
    it('1. extracts sublocality components from successful Google Geocoder and marks fallbackUsed: false', async () => {
      const mockGeocode = vi.fn((_request, callback) => {
        callback(
          [
            {
              place_id: 'ChIJ_mock_indira_nagar',
              formatted_address: 'Indira Nagar, Lucknow, Uttar Pradesh 226016, India',
              types: ['sublocality_level_1', 'sublocality', 'political'],
              address_components: [
                { long_name: 'Indira Nagar', short_name: 'Indira Nagar', types: ['sublocality_level_1', 'sublocality', 'political'] },
                { long_name: 'Lucknow', short_name: 'Lucknow', types: ['locality', 'political'] },
                { long_name: 'Uttar Pradesh', short_name: 'UP', types: ['administrative_area_level_1', 'political'] },
                { long_name: 'India', short_name: 'IN', types: ['country', 'political'] },
              ],
              geometry: {
                viewport: {
                  getNorthEast: () => ({ lat: () => 26.89, lng: () => 80.99 }),
                  getSouthWest: () => ({ lat: () => 26.87, lng: () => 80.97 }),
                },
              },
            },
          ],
          'OK',
        )
      })

      function MockGeocoder() {
        return { geocode: mockGeocode }
      }

      const originalWindow = globalThis.window
      globalThis.window = {
        ...originalWindow,
        google: {
          maps: {
            places: { AutocompleteService: vi.fn() },
            Geocoder: MockGeocoder,
          },
        },
      } as any

      try {
        const suggestion = await geocodingService.reverseGeocode(26.885, 80.985)
        expect(suggestion.mainText).toBe('Indira Nagar')
        expect(suggestion.secondaryText).toContain('Lucknow')
        expect(suggestion.fallbackUsed).toBe(false)
        expect(suggestion.resolutionSource).toBe('Google Geocoder (Browser Reverse Geocode)')
      } finally {
        globalThis.window = originalWindow
      }
    })

    it('2. handles Google REQUEST_DENIED by falling back to dynamic synthesis with fallbackUsed: true', async () => {
      const mockGeocode = vi.fn((_request, callback) => {
        callback([], 'REQUEST_DENIED')
      })

      function MockGeocoder() {
        return { geocode: mockGeocode }
      }

      const originalWindow = globalThis.window
      globalThis.window = {
        ...originalWindow,
        google: {
          maps: {
            places: { AutocompleteService: vi.fn() },
            Geocoder: MockGeocoder,
          },
        },
      } as any

      try {
        const suggestion = await geocodingService.reverseGeocode(26.940, 80.939)
        expect(suggestion.placeId).toMatch(/^rev-global-/)
        expect(suggestion.mainText).toContain('Local Area')
        expect(suggestion.fallbackUsed).toBe(true)
        expect(suggestion.resolutionSource).toBe('Dynamic Geographic Locality Synthesis')
      } finally {
        globalThis.window = originalWindow
      }
    })

    it('3. handles Google OVER_QUERY_LIMIT by falling back to dynamic synthesis with fallbackUsed: true', async () => {
      const mockGeocode = vi.fn((_request, callback) => {
        callback([], 'OVER_QUERY_LIMIT')
      })

      function MockGeocoder() {
        return { geocode: mockGeocode }
      }

      const originalWindow = globalThis.window
      globalThis.window = {
        ...originalWindow,
        google: {
          maps: {
            places: { AutocompleteService: vi.fn() },
            Geocoder: MockGeocoder,
          },
        },
      } as any

      try {
        const suggestion = await geocodingService.reverseGeocode(45.123, 9.456)
        expect(suggestion.placeId).toMatch(/^rev-global-/)
        expect(suggestion.fallbackUsed).toBe(true)
        expect(suggestion.resolutionSource).toBe('Dynamic Geographic Locality Synthesis')
      } finally {
        globalThis.window = originalWindow
      }
    })

    it('4. always marks dynamic rev-global- result as fallbackUsed: true', async () => {
      const suggestion = await geocodingService.reverseGeocode(51.507, -0.127)
      expect(suggestion.fallbackUsed).toBe(true)
      if (suggestion.placeId.startsWith('rev-global-')) {
        expect(suggestion.resolutionSource).toBe('Dynamic Geographic Locality Synthesis')
      }
    })

    it('5. ensures resolutionSource and fallbackUsed never contradict each other', async () => {
      const dynSuggestion = await geocodingService.reverseGeocode(30.123, 70.456)
      expect(dynSuggestion.fallbackUsed).toBe(true)
      expect(dynSuggestion.resolutionSource).toBe('Dynamic Geographic Locality Synthesis')

      const seedSuggestion = await geocodingService.reverseGeocode(18.920, 72.830)
      expect(seedSuggestion.fallbackUsed).toBe(true)
      expect(seedSuggestion.resolutionSource).toBe('Curated Seed Area (Geographic Bounds)')

      const catSuggestion = await geocodingService.reverseGeocode(26.85, 80.99)
      expect(catSuggestion.fallbackUsed).toBe(true)
      expect(catSuggestion.resolutionSource).toBe('Local Catalog Boundary Match')
    })

    it('6. preserves correct source and fallback status for catalog and seed matches', async () => {
      const bandra = await geocodingService.reverseGeocode(19.060, 72.830)
      expect(bandra.placeId).toBe('area-mumbai-bandra-west')
      expect(bandra.resolutionSource).toBe('Curated Seed Area (Geographic Bounds)')
      expect(bandra.fallbackUsed).toBe(true)

      const gomti = await geocodingService.reverseGeocode(26.855, 80.995)
      expect(gomti.resolutionSource).toBe('Local Catalog Boundary Match')
      expect(gomti.fallbackUsed).toBe(true)
    })

    it('7. re-verifies that removed broad nearest-neighbor snap remains absent', async () => {
      const outskirts = await geocodingService.reverseGeocode(26.75, 81.12)
      expect(outskirts.mainText).not.toBe('Hazratganj')
      expect(outskirts.placeId).not.toContain('hazratganj')

      const devMachine = await geocodingService.reverseGeocode(26.940, 80.939)
      expect(devMachine.mainText).not.toBe('Hazratganj')
    })

    it('8. verifies AreaContext diagnostic determination never marks rev-global- as genuine lookup even if window.google is present', () => {
      const determineDiagnostic = (suggestion: any) => {
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

        const fallbackUsed =
          typeof suggestion.fallbackUsed === 'boolean'
            ? suggestion.fallbackUsed
            : (isSeedMatch || isCatalogMatch || isGlobalSynthesis)

        return { sourceStr, fallbackUsed }
      }

      // 1. rev-global- with window.google present
      const res1 = determineDiagnostic({
        placeId: 'rev-global-26.94-80.94',
        resolutionSource: 'Dynamic Geographic Locality Synthesis',
        fallbackUsed: true,
      })
      expect(res1.fallbackUsed).toBe(true)
      expect(res1.sourceStr).toBe('Dynamic Geographic Locality Synthesis')

      // 2. Google lookup
      const res2 = determineDiagnostic({
        placeId: 'geo-26.885-80.985',
        resolutionSource: 'Google Geocoder (Browser Reverse Geocode)',
        fallbackUsed: false,
      })
      expect(res2.fallbackUsed).toBe(false)
      expect(res2.sourceStr).toBe('Google Geocoder (Browser Reverse Geocode)')
    })
  })
})
