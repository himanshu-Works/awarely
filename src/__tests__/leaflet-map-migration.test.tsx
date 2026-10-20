/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AwarelyMap } from '@/components/map/AwarelyMap'
import { getTileLayerConfig, isCartoConfigured, getCartoApiKey } from '@/config/maps.config'
import { loadGoogleMapsScript } from '@/services/maps.service'
import type { Area } from '@/types/area'
import { Timestamp } from 'firebase/firestore'
import packageJson from '../../package.json'

// Mock leaflet to enable headless DOM testing of Leaflet layers and initialization
const mockMapInstance = {
  setView: vi.fn().mockReturnThis(),
  flyTo: vi.fn().mockReturnThis(),
  flyToBounds: vi.fn().mockReturnThis(),
  panTo: vi.fn().mockReturnThis(),
  zoomIn: vi.fn().mockReturnThis(),
  zoomOut: vi.fn().mockReturnThis(),
  remove: vi.fn(),
  invalidateSize: vi.fn(),
  addLayer: vi.fn().mockReturnThis(),
  removeLayer: vi.fn().mockReturnThis(),
}

const mockTileLayer = {
  addTo: vi.fn().mockReturnThis(),
}

const mockLayerGroup = {
  addTo: vi.fn().mockReturnThis(),
  clearLayers: vi.fn().mockReturnThis(),
  addLayer: vi.fn().mockReturnThis(),
  removeLayer: vi.fn().mockReturnThis(),
}

const mockMarker = {
  on: vi.fn().mockReturnThis(),
  bindPopup: vi.fn().mockReturnThis(),
  bindTooltip: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
}

const mockPolygon = {
  on: vi.fn().mockReturnThis(),
  bindTooltip: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
}

vi.mock('leaflet', () => {
  return {
    default: {
      map: vi.fn(() => mockMapInstance),
      tileLayer: vi.fn(() => mockTileLayer),
      layerGroup: vi.fn(() => mockLayerGroup),
      marker: vi.fn(() => mockMarker),
      rectangle: vi.fn(() => mockPolygon),
      circle: vi.fn(() => mockPolygon),
      geoJSON: vi.fn(() => mockPolygon),
      latLngBounds: vi.fn(() => ({})),
      divIcon: vi.fn(() => ({})),
    },
  }
})

describe('Leaflet Map Migration & Cartography Suite (Phase 2)', () => {
  const sampleAreas: Area[] = [
    {
      id: 'area-mumbai-colaba',
      name: 'Colaba',
      city: 'Mumbai',
      fullName: 'Colaba, Mumbai, India',
      center: { latitude: 18.922, longitude: 72.834 },
      radiusMeters: 600,
      bounds: {
        northEast: { latitude: 18.928, longitude: 72.836 },
        southWest: { latitude: 18.915, longitude: 72.824 },
      },
      polygon: JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [72.824, 18.915],
            [72.836, 18.915],
            [72.836, 18.928],
            [72.824, 18.928],
            [72.824, 18.915],
          ],
        ],
      }),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true,
      reportCount: 38,
      recentReportCount: 12,
      confidenceLevel: 'high',
      awarenessLevel: 'active',
      topObservations: ['Well-lit', 'High foot traffic'],
      dayNightSplit: { day: 80, night: 70 },
      aiSummary: 'Safe promenade',
      aiSummaryGeneratedAt: Timestamp.now(),
    },
    {
      id: 'area-mumbai-unreported',
      name: 'Unreported Area',
      city: 'Mumbai',
      fullName: 'Unreported Area, Mumbai, India',
      center: { latitude: 18.95, longitude: 72.85 },
      bounds: {
        northEast: { latitude: 0, longitude: 0 },
        southWest: { latitude: 0, longitude: 0 },
      },
      polygon: '', // No precise boundary available
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true,
      reportCount: 0, // Honest zero data state
      recentReportCount: 0,
      confidenceLevel: 'low',
      awarenessLevel: 'unknown',
      topObservations: [],
      dayNightSplit: { day: 50, night: 50 },
      aiSummary: null,
      aiSummaryGeneratedAt: null,
    },
    {
      id: 'area-lucknow-gomtinagar',
      name: 'Gomti Nagar',
      city: 'Lucknow',
      fullName: 'Gomti Nagar, Lucknow, India',
      center: { latitude: 26.85, longitude: 80.99 },
      bounds: {
        northEast: { latitude: 26.87, longitude: 81.01 },
        southWest: { latitude: 26.83, longitude: 80.97 },
      },
      polygon: '', // Bounds only, no GeoJSON polygon
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true,
      reportCount: 15,
      recentReportCount: 5,
      confidenceLevel: 'moderate',
      awarenessLevel: 'active',
      topObservations: ['Residential'],
      dayNightSplit: { day: 85, night: 65 },
      aiSummary: null,
      aiSummaryGeneratedAt: null,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock ResizeObserver for JSDOM
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any
  })

  // ── 1. Map Initialization, Cleanup & Strict Mode ──────────────────────
  describe('1. Map Initialization and Cleanup Safety', () => {
    it('renders the Leaflet container and initializes map instance with dark cartography class', async () => {
      const onSelect = vi.fn()
      const { container, unmount } = render(
        <AwarelyMap
          areas={sampleAreas}
          selectedArea={sampleAreas[0]}
          onSelectArea={onSelect}
        />,
      )

      const mapContainer = container.querySelector('#awarely-leaflet-map')
      expect(mapContainer).toBeDefined()
      expect((container.firstChild as HTMLElement).className).toContain('awarely-map-container')
      expect((container.firstChild as HTMLElement).className).toContain('dark-tiles')

      await waitFor(() => {
        expect(mockMapInstance.invalidateSize).toBeDefined()
      })

      // Clean unmount does not throw and tears down map
      unmount()
      expect(mockMapInstance.remove).toHaveBeenCalled()
    })

    it('safely handles empty areas array without throwing', () => {
      const onSelect = vi.fn()
      expect(() => {
        render(
          <AwarelyMap
            areas={[]}
            selectedArea={null}
            onSelectArea={onSelect}
          />,
        )
      }).not.toThrow()
    })
  })

  // ── 2. Boundary Overlays and No-Fabrication Invariants ────────────────
  describe('2. Boundary Rendering & Missing-Boundary Invariants', () => {
    it('uses GeoJSON polygon for areas with valid polygon property', async () => {
      const leaflet = (await import('leaflet')).default
      render(
        <AwarelyMap
          areas={sampleAreas}
          selectedArea={sampleAreas[0]}
          onSelectArea={vi.fn()}
        />,
      )

      await waitFor(() => {
        expect(leaflet.geoJSON).toHaveBeenCalled()
      })
    })

    it('uses genuine bounds rectangle when polygon is absent but bounds exist', async () => {
      const leaflet = (await import('leaflet')).default
      render(
        <AwarelyMap
          areas={[sampleAreas[2]]} // Lucknow area with bounds only
          selectedArea={sampleAreas[2]}
          onSelectArea={vi.fn()}
        />,
      )

      await waitFor(() => {
        expect(leaflet.rectangle).toHaveBeenCalled()
      })
    })

    it('does NOT fabricate precise boundaries when polygon and bounds are unavailable', async () => {
      const leaflet = (await import('leaflet')).default
      render(
        <AwarelyMap
          areas={[sampleAreas[1]]} // Unreported area with 0,0 bounds
          selectedArea={sampleAreas[1]}
          onSelectArea={vi.fn()}
        />,
      )

      await waitFor(() => {
        // Did not fabricate a polygon
        expect(leaflet.geoJSON).not.toHaveBeenCalled()
        // Uses approximate circle visualization instead of fabricated boundary polygon
        expect(leaflet.circle).toHaveBeenCalled()
      })
    })
  })

  // ── 3. Controls, City Switcher & Zoom ─────────────────────────────────
  describe('3. City Switcher and Navigation Controls', () => {
    it('renders city buttons for Mumbai and Lucknow and selects first area upon click', async () => {
      const onSelect = vi.fn()
      render(
        <AwarelyMap
          areas={sampleAreas}
          selectedArea={sampleAreas[0]}
          onSelectArea={onSelect}
        />,
      )

      const lucknowBtn = screen.getByRole('button', { name: 'Lucknow' })
      expect(lucknowBtn).toBeDefined()

      fireEvent.click(lucknowBtn)
      expect(onSelect).toHaveBeenCalledWith(sampleAreas[2])
    })

    it('triggers zoomIn and zoomOut on button clicks', async () => {
      render(
        <AwarelyMap
          areas={sampleAreas}
          selectedArea={sampleAreas[0]}
          onSelectArea={vi.fn()}
        />,
      )

      const zoomInBtn = screen.getByRole('button', { name: 'Zoom In' })
      const zoomOutBtn = screen.getByRole('button', { name: 'Zoom Out' })

      await waitFor(() => {
        fireEvent.click(zoomInBtn)
        expect(mockMapInstance.zoomIn).toHaveBeenCalled()
      })

      await waitFor(() => {
        fireEvent.click(zoomOutBtn)
        expect(mockMapInstance.zoomOut).toHaveBeenCalled()
      })
    })
  })

  // ── 4. Privacy & Discrete Location Invariants ────────────────────────
  describe('4. Privacy & Location Invariants', () => {
    it('displays the zero-continuous-tracking privacy banner', () => {
      render(
        <AwarelyMap
          areas={sampleAreas}
          selectedArea={sampleAreas[0]}
          onSelectArea={vi.fn()}
        />,
      )

      expect(
        screen.getByText(/Zero continuous GPS tracking/i),
      ).toBeDefined()
    })

    it('renders one-shot location check button when onRequestLocation is provided', () => {
      const onLocate = vi.fn()
      render(
        <AwarelyMap
          areas={sampleAreas}
          selectedArea={sampleAreas[0]}
          onSelectArea={vi.fn()}
          onRequestLocation={onLocate}
        />,
      )

      const locateBtn = screen.getByRole('button', { name: 'Locate Current Area' })
      expect(locateBtn).toBeDefined()

      fireEvent.click(locateBtn)
      expect(onLocate).toHaveBeenCalledTimes(1)
    })

    it('renders coarse user location marker at genuine truncated coordinate', async () => {
      const leaflet = (await import('leaflet')).default
      render(
        <AwarelyMap
          areas={sampleAreas}
          selectedArea={sampleAreas[0]}
          onSelectArea={vi.fn()}
          userCoarseLocation={{ lat: 18.922, lng: 72.834 }}
        />,
      )

      await waitFor(() => {
        expect(leaflet.marker).toHaveBeenCalledWith(
          [18.922, 72.834],
          expect.any(Object),
        )
      })
    })
  })

  // ── 5. Tile Provider Configuration & Attribution ─────────────────────
  describe('5. Verified Tile Provider & Mandatory Attribution', () => {
    it('returns compliant OpenStreetMap tile URL and mandatory attribution by default', () => {
      const config = getTileLayerConfig()
      expect(config.url).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
      expect(config.attribution).toContain('OpenStreetMap')
      expect(config.attribution).toContain('contributors')
      expect(config.maxZoom).toBe(19)
    })

    it('supports custom tile provider and attribution via environment override', () => {
      vi.stubEnv('VITE_MAP_TILE_URL', 'https://custom-tiles.example.com/{z}/{x}/{y}.png')
      vi.stubEnv('VITE_MAP_TILE_ATTRIBUTION', '&copy; Custom Cartography Engine')

      const config = getTileLayerConfig()
      expect(config.url).toBe('https://custom-tiles.example.com/{z}/{x}/{y}.png')
      expect(config.attribution).toBe('&copy; Custom Cartography Engine')

      vi.unstubAllEnvs()
    })

    it('does not enable Geoapify tiles by default to protect credit quota unless explicitly opted-in', () => {
      vi.stubEnv('VITE_GEOAPIFY_API_KEY', 'geoapify_key_xyz')
      // VITE_USE_GEOAPIFY_TILES is NOT set to 'true'
      const config = getTileLayerConfig()
      expect(config.url).not.toContain('geoapify.com')

      // Opt in explicitly
      vi.stubEnv('VITE_USE_GEOAPIFY_TILES', 'true')
      const configWithTiles = getTileLayerConfig()
      expect(configWithTiles.url).toContain('geoapify.com')
      expect(configWithTiles.attribution).toContain('Geoapify')

      vi.unstubAllEnvs()
    })

    // ── CARTO Basemaps Integration Tests ──────────────────────────────
    it('detects when CARTO API key is configured and reads it safely', () => {
      vi.stubEnv('VITE_CARTO_API_KEY', 'carto_test_key_abc123')
      expect(isCartoConfigured()).toBe(true)
      expect(getCartoApiKey()).toBe('carto_test_key_abc123')

      vi.stubEnv('VITE_CARTO_API_KEY', '   ')
      expect(isCartoConfigured()).toBe(false)
      expect(getCartoApiKey()).toBe('')

      vi.unstubAllEnvs()
    })

    it('selects CARTO Voyager as default primary provider when VITE_CARTO_API_KEY is supplied', () => {
      vi.stubEnv('VITE_CARTO_API_KEY', 'carto_secret_token_789')
      const config = getTileLayerConfig()

      expect(config.providerId).toBe('carto')
      expect(config.name).toBe('CARTO Voyager')
      expect(config.url).toBe(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=carto_secret_token_789',
      )
      expect(config.subdomains).toEqual(['a', 'b', 'c', 'd'])
      expect(config.applyDarkFilter).toBe(false)
      expect(config.attribution).toContain('OpenStreetMap')
      expect(config.attribution).toContain('CARTO')

      vi.unstubAllEnvs()
    })

    it('falls back cleanly to OpenStreetMap when VITE_CARTO_API_KEY is empty or unset', () => {
      vi.stubEnv('VITE_CARTO_API_KEY', '')
      const config = getTileLayerConfig()

      expect(config.providerId).toBe('osm')
      expect(config.url).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
      expect(config.attribution).toContain('OpenStreetMap')
      expect(config.attribution).not.toContain('CARTO')
      expect(config.applyDarkFilter).toBe(true)

      vi.unstubAllEnvs()
    })

    it('supports CARTO theme override via VITE_CARTO_THEME (dark_all, light_all)', () => {
      vi.stubEnv('VITE_CARTO_API_KEY', 'carto_key_xyz')
      
      // Override to dark_all (Dark Matter)
      vi.stubEnv('VITE_CARTO_THEME', 'dark_all')
      const darkConfig = getTileLayerConfig()
      expect(darkConfig.providerId).toBe('carto')
      expect(darkConfig.name).toBe('CARTO Dark Matter')
      expect(darkConfig.url).toContain('/rastertiles/dark_all/')
      expect(darkConfig.applyDarkFilter).toBe(false)
      expect(darkConfig.isNativeDark).toBe(true)

      // Override to light_all (Positron)
      vi.stubEnv('VITE_CARTO_THEME', 'light_all')
      const lightConfig = getTileLayerConfig()
      expect(lightConfig.providerId).toBe('carto')
      expect(lightConfig.name).toBe('CARTO Positron')
      expect(lightConfig.url).toContain('/rastertiles/light_all/')
      expect(lightConfig.applyDarkFilter).toBe(false)

      vi.unstubAllEnvs()
    })

    it('ensures CARTO Voyager renders with original colors and without the dark-tiles filter', () => {
      vi.stubEnv('VITE_CARTO_API_KEY', 'carto_key_test_color')
      const config = getTileLayerConfig()
      expect(config.applyDarkFilter).toBe(false)

      const onSelect = vi.fn()
      const { container } = render(
        <AwarelyMap
          areas={sampleAreas}
          selectedArea={sampleAreas[0]}
          onSelectArea={onSelect}
        />,
      )

      const mapWrapper = container.querySelector('.awarely-map-container')
      expect(mapWrapper).toBeDefined()
      // Voyager must NOT have the dark-tiles filter applied
      expect(mapWrapper?.className).not.toContain('dark-tiles')

      vi.unstubAllEnvs()
    })

    it('ensures VITE_CARTO_API_KEY is never printed to console logs during config resolution', () => {
      const logSpy = vi.spyOn(console, 'log')
      const infoSpy = vi.spyOn(console, 'info')
      const warnSpy = vi.spyOn(console, 'warn')
      const errorSpy = vi.spyOn(console, 'error')

      const sensitiveKey = 'super_secret_carto_key_do_not_leak_999'
      vi.stubEnv('VITE_CARTO_API_KEY', sensitiveKey)

      const config = getTileLayerConfig()
      expect(config.url).toContain(sensitiveKey) // present in URL query param for tile requests

      const allLogs = [
        ...logSpy.mock.calls,
        ...infoSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
      ].flat().join(' ')

      expect(allLogs).not.toContain(sensitiveKey)

      vi.unstubAllEnvs()
    })
  })

  // ── 6. Removal of Runtime Google Maps Dependencies ───────────────────
  describe('6. Runtime Google Maps Removal Verification', () => {
    it('confirms @vis.gl/react-google-maps is completely removed from package.json dependencies', () => {
      const deps = (packageJson as any).dependencies || {}
      expect(deps['@vis.gl/react-google-maps']).toBeUndefined()
    })

    it('confirms leaflet is installed as a primary runtime dependency', () => {
      const deps = (packageJson as any).dependencies || {}
      expect(deps['leaflet']).toBeDefined()
    })

    it('ensures loadGoogleMapsScript returns false and does not inject google maps script tag', async () => {
      const result = await loadGoogleMapsScript()
      expect(result).toBe(false)
      const scriptTag = document.querySelector('script[src*="maps.googleapis.com"]')
      expect(scriptTag).toBeNull()
    })
  })
})
