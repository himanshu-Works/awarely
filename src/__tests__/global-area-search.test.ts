import { describe, it, expect, vi, beforeEach } from 'vitest'
import { geocodingService, type AreaSuggestion } from '@/services/geocoding.service'
import { SEED_AREAS } from '@/data/seedAreas'

if (typeof (globalThis as any).window === 'undefined') {
  ;(globalThis as any).window = globalThis
}

describe('Issue 1: Global Area Search & Geographic Resolution Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    if ((globalThis as any).window) {
      delete (globalThis as any).window.google
    }
  })

  // ── 1. GLOBAL CITY DISCOVERY ─────────────────────────────────────────
  describe('Global City Search Coverage (Mandatory Global Test Matrix)', () => {
    const indianMetros = [
      { name: 'Lucknow', locality: 'Gomti Nagar' },
      { name: 'Kanpur', locality: 'Civil Lines' },
      { name: 'Jaipur', locality: 'C-Scheme' },
      { name: 'Bengaluru', locality: 'Indiranagar' },
      { name: 'Mumbai', locality: 'Colaba' },
      { name: 'Delhi', locality: 'Connaught Place' },
      { name: 'Hyderabad', locality: 'HITEC City' },
      { name: 'Pune', locality: 'Koregaon Park' },
      { name: 'Chennai', locality: 'T. Nagar' },
      { name: 'Kolkata', locality: 'Park Street' },
    ]

    indianMetros.forEach(({ name, locality }) => {
      it(`discovers Indian city & locality: ${name} (${locality})`, async () => {
        const results = await geocodingService.getAreaSuggestions(name)
        expect(results.length).toBeGreaterThan(0)
        expect(results.some((r) => r.mainText.includes(locality) || r.secondaryText.includes(name))).toBe(true)
      })
    })

    const internationalMetros = [
      // Asia
      { name: 'Tokyo', locality: 'Shinjuku', region: 'Asia' },
      { name: 'Singapore', locality: 'Marina Bay', region: 'Asia' },
      { name: 'Bangkok', locality: 'Sukhumvit', region: 'Asia' },
      { name: 'Dubai', locality: 'Downtown Dubai', region: 'Asia' },
      // Europe
      { name: 'London', locality: 'Soho', region: 'Europe' },
      { name: 'Paris', locality: 'Le Marais', region: 'Europe' },
      { name: 'Berlin', locality: 'Mitte', region: 'Europe' },
      { name: 'Amsterdam', locality: 'Jordaan', region: 'Europe' },
      // North America
      { name: 'New York', locality: 'Manhattan', region: 'North America' },
      { name: 'Toronto', locality: 'Downtown Toronto', region: 'North America' },
      { name: 'Los Angeles', locality: 'Santa Monica', region: 'North America' },
      // South America
      { name: 'São Paulo', locality: 'Jardins', region: 'South America' },
      { name: 'Buenos Aires', locality: 'Palermo', region: 'South America' },
      // Africa
      { name: 'Cape Town', locality: 'City Bowl', region: 'Africa' },
      { name: 'Nairobi', locality: 'Westlands', region: 'Africa' },
      // Oceania
      { name: 'Sydney', locality: 'Surry Hills', region: 'Oceania' },
      { name: 'Melbourne', locality: 'Melbourne CBD', region: 'Oceania' },
    ]

    internationalMetros.forEach(({ name, locality, region }) => {
      it(`discovers ${region} metro & locality: ${name} (${locality})`, async () => {
        const results = await geocodingService.getAreaSuggestions(name)
        expect(results.length).toBeGreaterThan(0)
        expect(results.some((r) => r.mainText.includes(locality) || r.secondaryText.includes(name))).toBe(true)
      })
    })
  })

  // ── 2. GEOGRAPHIC ENTITY TYPES ───────────────────────────────────────
  describe('Geographic Entity Types & Granularities', () => {
    it('discovers and resolves postal areas', async () => {
      const results = await geocodingService.getAreaSuggestions('110001')
      expect(results.length).toBeGreaterThan(0)
      const postal = results[0]
      expect(postal.areaType).toBe('district')

      const resolved = await geocodingService.resolveArea(postal)
      expect(resolved.area).toBeDefined()
      expect(resolved.area.id).toContain('110001')
    })

    it('discovers market and commercial precincts', async () => {
      const results = await geocodingService.getAreaSuggestions('Hazratganj')
      expect(results.length).toBeGreaterThan(0)
      const market = results.find((r) => r.mainText.includes('Hazratganj'))
      expect(market).toBeDefined()
      expect(market?.areaType).toBe('market')
    })

    it('discovers transit and railway stations', async () => {
      const results = await geocodingService.getAreaSuggestions('CSMT')
      expect(results.length).toBeGreaterThan(0)
      const station = results.find((r) => r.areaType === 'station')
      expect(station).toBeDefined()
      expect(station?.mainText).toContain('Chhatrapati Shivaji Maharaj Terminus')
    })

    it('discovers chowk and major intersections', async () => {
      const results = await geocodingService.getAreaSuggestions('Chandni Chowk')
      expect(results.length).toBeGreaterThan(0)
      const chowk = results.find((r) => r.mainText.includes('Chandni Chowk'))
      expect(chowk).toBeDefined()
      expect(chowk?.areaType).toBe('chowk')
    })

    it('discovers international landmark and elevates to broader area', async () => {
      const results = await geocodingService.getAreaSuggestions('Burj Khalifa')
      expect(results.length).toBeGreaterThan(0)
      const landmark = results[0]
      expect(landmark).toBeDefined()

      const resolved = await geocodingService.resolveArea(landmark)
      expect(resolved.area).toBeDefined()
      expect(resolved.area.name).toContain('Downtown Dubai')
    })

    it('elevates road query (MG Road) to broader containing locality', async () => {
      const suggestions = await geocodingService.getAreaSuggestions('MG Road')
      const road = suggestions.find((s) => s.isRoad)
      expect(road).toBeDefined()

      const resolved = await geocodingService.resolveArea(road!)
      expect(resolved.elevationNotice).toBeDefined()
      expect(resolved.elevationNotice).toContain('elevated')
      expect(resolved.area.name).toContain('Bengaluru Central')
    })
  })

  // ── 3. ROAD & LANDMARK ELEVATION PROTOCOL ────────────────────────────
  describe('Street and Landmark to Area Elevation Protocol', () => {
    it('elevates street (Carter Road) to containing neighborhood (Bandra West)', async () => {
      const suggestions = await geocodingService.getAreaSuggestions('Carter Road')
      const road = suggestions.find((s) => s.isRoad)
      expect(road).toBeDefined()
      expect(road?.areaType).toBe('road')

      const resolved = await geocodingService.resolveArea(road!)
      expect(resolved.elevationNotice).toBeDefined()
      expect(resolved.elevationNotice).toContain('elevated')
      // Resolved to containing area rather than creating a road safety profile
      expect(resolved.area.name).toContain('Bandra West')
    })

    it('elevates street (Baker Street) to containing area (Marylebone)', async () => {
      const suggestions = await geocodingService.getAreaSuggestions('Baker Street')
      const road = suggestions.find((s) => s.isRoad)
      expect(road).toBeDefined()

      const resolved = await geocodingService.resolveArea(road!)
      expect(resolved.elevationNotice).toBeDefined()
      expect(resolved.elevationNotice).toContain('Baker Street')
      expect(resolved.elevationNotice).toContain('Marylebone')
    })

    it('elevates international landmark (Eiffel Tower) to containing district', async () => {
      const suggestions = await geocodingService.getAreaSuggestions('Eiffel Tower')
      const landmark = suggestions[0]
      expect(landmark).toBeDefined()

      const resolved = await geocodingService.resolveArea(landmark)
      expect(resolved.area).toBeDefined()
      expect(resolved.area.city).toContain('Paris')
    })

    it('elevates landmark (Tokyo Tower) to containing district', async () => {
      const suggestions = await geocodingService.getAreaSuggestions('Tokyo Tower')
      const landmark = suggestions[0]
      expect(landmark).toBeDefined()

      const resolved = await geocodingService.resolveArea(landmark)
      expect(resolved.area).toBeDefined()
      expect(resolved.area.city).toContain('Tokyo')
    })
  })

  // ── 4. ZERO FABRICATION MANDATE ON NEW AREAS ─────────────────────────
  describe('New/Unknown Area Discovery with Zero Fabrication', () => {
    it('resolves an uncatalogued global location without fabricating community reports or scores', async () => {
      // Dynamic fallback for any unseeded global city
      const suggestions = await geocodingService.getAreaSuggestions('Reykjavik')
      expect(suggestions.length).toBeGreaterThan(0)
      const suggestion = suggestions[0]

      const resolved = await geocodingService.resolveArea(suggestion)
      expect(resolved.isNewArea).toBe(true)

      const area = resolved.area
      // Canonical area ID derived
      expect(area.id).toMatch(/^area-/)

      // MANDATORY ZERO FABRICATION CHECKS:
      expect(area.reportCount).toBe(0)
      expect(area.recentReportCount).toBe(0)
      expect(area.latestReportAt).toBeNull()
      expect(area.confidenceLevel).toBe('low')
      expect(area.awarenessLevel).toBe('unknown')
      expect(area.aiSummary).toBeNull()
      expect(area.aiSummaryGeneratedAt).toBeNull()
      expect(area.topObservations).toEqual([])
    })

    it('preserves real community reports and AI summary for seeded areas', async () => {
      const colabaSeed = SEED_AREAS.find((a) => a.id === 'area-mumbai-colaba')!
      const suggestion: AreaSuggestion = {
        placeId: colabaSeed.id,
        mainText: colabaSeed.name,
        secondaryText: `${colabaSeed.city}, ${colabaSeed.country}`,
        areaType: 'neighborhood',
        isRoad: false,
      }

      const resolved = await geocodingService.resolveArea(suggestion)
      expect(resolved.isNewArea).toBe(false)
      expect(resolved.area.reportCount).toBe(colabaSeed.reportCount)
      expect(resolved.area.reportCount).toBeGreaterThan(0)
      expect(resolved.area.confidenceLevel).toBe(colabaSeed.confidenceLevel)
    })
  })

  // ── 5. GOOGLE MAPS PLACES AUTOCOMPLETE INTEGRATION ───────────────────
  describe('Google Maps Platform Integration', () => {
    it('uses Google Maps AutocompleteService when available on window', async () => {
      const mockPredictions = [
        {
          place_id: 'gplaces-kyoto-gion',
          description: 'Gion, Kyoto, Japan',
          structured_formatting: {
            main_text: 'Gion',
            secondary_text: 'Kyoto, Japan',
          },
          types: ['sublocality_level_1', 'sublocality', 'political'],
        },
      ]

      const getPlacePredictionsMock = vi.fn((_req, callback) => {
        callback(mockPredictions, 'OK')
      })

      function MockAutocompleteService(this: any) {
        return {
          getPlacePredictions: getPlacePredictionsMock,
        }
      }

      // Inject mock google maps into window
      ;(window as any).google = {
        maps: {
          places: {
            AutocompleteService: MockAutocompleteService,
          },
        },
      }

      const results = await geocodingService.getAreaSuggestions('Gion Kyoto')
      expect(getPlacePredictionsMock).toHaveBeenCalled()
      expect(results.length).toBe(1)
      expect(results[0].placeId).toBe('gplaces-kyoto-gion')
      expect(results[0].mainText).toBe('Gion')
      expect(results[0].areaType).toBe('neighborhood')
    })
  })
})
