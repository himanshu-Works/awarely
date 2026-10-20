import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type * as LeafletType from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Compass,
  Navigation,
  ZoomIn,
  ZoomOut,
  Building2,
  Loader2,
} from 'lucide-react'
import type { Area } from '@/types/area'
import { cn } from '@/utils/cn'
import { getTileLayerConfig, mapsConfig } from '@/config/maps.config'

export interface AwarelyMapProps {
  areas: Area[]
  selectedArea: Area | null
  onSelectArea: (area: Area) => void
  userCoarseLocation?: { lat: number; lng: number } | null
  onRequestLocation?: () => void
  locating?: boolean
  className?: string
}

/**
 * Default fallback coordinates for known benchmark cities.
 */
const CITY_CENTERS: Record<string, [number, number]> = {
  mumbai: [18.922, 72.834],
  lucknow: [26.85, 80.95],
  kanpur: [26.47, 80.33],
  jaipur: [26.91, 75.79],
  bengaluru: [12.97, 77.64],
  delhi: [28.63, 77.22],
  tokyo: [35.68, 139.7],
  london: [51.51, -0.13],
  paris: [48.86, 2.35],
  newyork: [40.71, -74.0],
}

/**
 * Returns Leaflet styling for area polygon/boundary overlays.
 */
function getAreaStyle(awarenessLevel: string, isSelected: boolean) {
  switch (awarenessLevel) {
    case 'active':
      return {
        color: '#2dd4bf',
        fillColor: '#2dd4bf',
        fillOpacity: isSelected ? 0.35 : 0.18,
        weight: isSelected ? 3.5 : 1.8,
        dashArray: isSelected ? undefined : '5, 4',
      }
    case 'mixed':
      return {
        color: '#fbbf24',
        fillColor: '#fbbf24',
        fillOpacity: isSelected ? 0.35 : 0.18,
        weight: isSelected ? 3.5 : 1.8,
        dashArray: isSelected ? undefined : '5, 4',
      }
    case 'quiet':
      return {
        color: '#f43f5e',
        fillColor: '#f43f5e',
        fillOpacity: isSelected ? 0.35 : 0.18,
        weight: isSelected ? 3.5 : 1.8,
        dashArray: isSelected ? undefined : '5, 4',
      }
    default:
      return {
        color: '#94a3b8',
        fillColor: '#94a3b8',
        fillOpacity: isSelected ? 0.28 : 0.12,
        weight: isSelected ? 3.5 : 1.5,
        dashArray: isSelected ? undefined : '5, 4',
      }
  }
}

/**
 * Resolves the genuine center coordinates [lat, lng] for an Area.
 */
function getAreaCenter(area: Area): [number, number] | null {
  if (
    area.center &&
    typeof area.center.latitude === 'number' &&
    typeof area.center.longitude === 'number' &&
    !isNaN(area.center.latitude) &&
    !isNaN(area.center.longitude)
  ) {
    return [area.center.latitude, area.center.longitude]
  }

  if (
    area.bounds &&
    typeof area.bounds.southWest?.latitude === 'number' &&
    typeof area.bounds.northEast?.latitude === 'number' &&
    !isNaN(area.bounds.southWest.latitude) &&
    !isNaN(area.bounds.northEast.latitude)
  ) {
    const lat = (area.bounds.southWest.latitude + area.bounds.northEast.latitude) / 2
    const lng = (area.bounds.southWest.longitude + area.bounds.northEast.longitude) / 2
    return [lat, lng]
  }

  return null
}

export function AwarelyMap({
  areas,
  selectedArea,
  onSelectArea,
  userCoarseLocation,
  onRequestLocation,
  locating,
  className,
}: AwarelyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletType.Map | null>(null)
  const tileLayerRef = useRef<LeafletType.TileLayer | null>(null)
  const areasLayerGroupRef = useRef<LeafletType.LayerGroup | null>(null)
  const userMarkerRef = useRef<LeafletType.Layer | null>(null)

  const [L, setL] = useState<typeof LeafletType | null>(null)
  const [activeCity, setActiveCity] = useState<string>(selectedArea?.city || 'Mumbai')
  const [mapReady, setMapReady] = useState(false)

  // Resolve tile provider config
  const tileConfig = useMemo(() => getTileLayerConfig(), [])

  // ── Dynamically load Leaflet for Node/SSR resilience ──────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    let active = true
    import('leaflet').then((module) => {
      if (active) {
        setL(module.default || module)
      }
    })
    return () => {
      active = false
    }
  }, [])

  // Keep track of cities present in data
  const cities = useMemo(() => {
    const set = new Set<string>()
    if (selectedArea?.city) set.add(selectedArea.city)
    areas.forEach((a) => {
      if (a.city) set.add(a.city)
    })
    return Array.from(set)
  }, [areas, selectedArea])

  // Sync active city when selectedArea changes
  useEffect(() => {
    if (selectedArea?.city && selectedArea.city.toLowerCase() !== activeCity.toLowerCase()) {
      setActiveCity(selectedArea.city)
    }
  }, [selectedArea])

  // Filter areas to active city
  const filteredAreas = useMemo(() => {
    const list = areas.filter(
      (a) => a.city.toLowerCase() === activeCity.toLowerCase(),
    )
    if (list.length === 0 && selectedArea && selectedArea.city.toLowerCase() === activeCity.toLowerCase()) {
      return [selectedArea]
    }
    return list.length > 0 ? list : areas
  }, [areas, activeCity, selectedArea])

  // ── 1. Map Initialization (Strict Mode Safe) ──────────────────────────
  useEffect(() => {
    if (!L) return
    const container = mapContainerRef.current
    if (!container) return

    // If already initialized on this container, do not re-initialize
    if (mapInstanceRef.current) return

    // Clear leftover Leaflet internal container tracking ID if any
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id
    }

    // Determine initial center
    let initialCenter: [number, number] = [18.922, 72.834] // Default: Mumbai
    const cityKey = activeCity.toLowerCase().replace(/\s+/g, '')
    if (CITY_CENTERS[cityKey]) {
      initialCenter = CITY_CENTERS[cityKey]
    } else if (selectedArea) {
      const c = getAreaCenter(selectedArea)
      if (c) initialCenter = c
    }

    const tileConfig = getTileLayerConfig()

    const map = L.map(container, {
      center: initialCenter,
      zoom: mapsConfig.defaultZoom,
      minZoom: tileConfig.minZoom,
      maxZoom: tileConfig.maxZoom,
      zoomControl: false, // We render custom Accessible controls
      attributionControl: true,
    })

    // Setup tile layer with verified provider and attribution
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || 'abc',
    }).addTo(map)

    tileLayerRef.current = tileLayer

    // Setup LayerGroup for area boundaries and markers
    const areasLayerGroup = L.layerGroup().addTo(map)
    areasLayerGroupRef.current = areasLayerGroup

    mapInstanceRef.current = map
    setMapReady(true)

    // Responsive resize observer to prevent gray tile clipping
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      setMapReady(false)
    }
  }, [L])

  // ── 2. Render Geographic Overlays & Markers ───────────────────────────
  useEffect(() => {
    if (!L) return
    const map = mapInstanceRef.current
    const areasLayerGroup = areasLayerGroupRef.current
    if (!map || !areasLayerGroup || !mapReady) return

    areasLayerGroup.clearLayers()

    filteredAreas.forEach((area) => {
      const isSelected = selectedArea?.id === area.id
      const style = getAreaStyle(area.awarenessLevel, isSelected)
      const center = getAreaCenter(area)

      let overlayLayer: LeafletType.Layer | null = null

      // A. Genuine GeoJSON polygon if available
      let hasValidPolygon = false
      if (area.polygon && typeof area.polygon === 'string' && area.polygon.trim().length > 0) {
        try {
          const parsed = JSON.parse(area.polygon)
          if (parsed && (parsed.type === 'Polygon' || parsed.type === 'MultiPolygon')) {
            overlayLayer = L.geoJSON(parsed, {
              style: () => style,
            })
            hasValidPolygon = true
          }
        } catch {
          // Polygon parsing failed; fall back to bounds
        }
      }

      // B. Rectangle from genuine AreaBounds if no polygon
      if (!hasValidPolygon && area.bounds) {
        const sw = area.bounds.southWest
        const ne = area.bounds.northEast
        if (
          typeof sw?.latitude === 'number' &&
          typeof sw?.longitude === 'number' &&
          typeof ne?.latitude === 'number' &&
          typeof ne?.longitude === 'number' &&
          (sw.latitude !== 0 || sw.longitude !== 0) &&
          (ne.latitude !== 0 || ne.longitude !== 0)
        ) {
          overlayLayer = L.rectangle(
            [
              [sw.latitude, sw.longitude],
              [ne.latitude, ne.longitude],
            ],
            style,
          )
        }
      }

      // C. Approximate visualization when precise boundaries are unavailable
      // (Never fabricate boundaries! Use clearly designated circle with dashed border or pin)
      if (!overlayLayer && center) {
        const radius = area.radiusMeters || 600
        overlayLayer = L.circle(center, {
          ...style,
          radius,
          dashArray: '6, 6',
          fillOpacity: isSelected ? 0.25 : 0.1,
        })
      }

      // Attach interactions to boundary overlay
      if (overlayLayer) {
        overlayLayer.on('click', () => {
          onSelectArea(area)
        })

        // Tooltip
        overlayLayer.bindTooltip(
          `<strong>${area.name}</strong><br/><span style="font-size:11px;color:${area.reportCount === 0 ? '#fbbf24' : '#94a3b8'}">${
            area.reportCount === 0
              ? 'Limited community data (0 reports)'
              : `${area.reportCount} reports • ${area.awarenessLevel}`
          }</span>`,
          { sticky: true, className: 'awarely-map-tooltip' },
        )

        areasLayerGroup.addLayer(overlayLayer)
      }

      // Center Marker Icon with area name badge
      if (center) {
        const markerIcon = L.divIcon({
          className: 'awarely-area-marker',
          html: `
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-lg cursor-pointer transition transform hover:scale-105 select-none"
                 style="background: #0B192C; border-color: ${style.color}; color: #F8FAFC;">
              <span class="h-2 w-2 rounded-full" style="background: ${style.color}; box-shadow: 0 0 6px ${style.color};"></span>
              <span class="text-xs font-semibold whitespace-nowrap">${area.name}</span>
            </div>
          `,
          iconSize: [120, 28],
          iconAnchor: [60, 14],
        })

        const marker = L.marker(center, { icon: markerIcon })
        marker.on('click', () => {
          onSelectArea(area)
        })

        marker.bindPopup(
          `
            <div style="min-width: 170px; padding: 4px;">
              <h4 style="font-weight: 700; font-size: 14px; margin: 0 0 4px 0; color: #F8FAFC;">${area.name}</h4>
              <p style="font-size: 11px; margin: 0 0 6px 0; color: #94A3B8;">${area.fullName || area.city}</p>
              <div style="font-size: 11px; font-weight: 600; color: ${
                area.reportCount === 0 ? '#fbbf24' : style.color
              };">
                ${
                  area.reportCount === 0
                    ? 'Limited community data (0 reports)'
                    : `${area.reportCount} community reports (${area.awarenessLevel})`
                }
              </div>
            </div>
          `,
        )

        areasLayerGroup.addLayer(marker)
      }
    })
  }, [L, filteredAreas, selectedArea, mapReady, onSelectArea])

  // ── 3. Smooth Camera Navigation on selectedArea change ────────────────
  useEffect(() => {
    if (!L) return
    const map = mapInstanceRef.current
    if (!map || !mapReady || !selectedArea) return

    // If selected area has bounds, fit bounds
    if (
      selectedArea.bounds &&
      selectedArea.bounds.southWest &&
      selectedArea.bounds.northEast &&
      selectedArea.bounds.southWest.latitude !== 0
    ) {
      const sw = selectedArea.bounds.southWest
      const ne = selectedArea.bounds.northEast
      const bounds = L.latLngBounds(
        [sw.latitude, sw.longitude],
        [ne.latitude, ne.longitude],
      )
      map.flyToBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
        duration: 0.8,
      })
    } else {
      const center = getAreaCenter(selectedArea)
      if (center) {
        map.flyTo(center, 14, { duration: 0.8 })
      }
    }
  }, [L, selectedArea, mapReady])

  // ── 4. User Coarse Location Marker (Privacy-First) ───────────────────
  useEffect(() => {
    if (!L) return
    const map = mapInstanceRef.current
    if (!map || !mapReady) return

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current)
      userMarkerRef.current = null
    }

    if (userCoarseLocation) {
      const { lat, lng } = userCoarseLocation
      const pulseIcon = L.divIcon({
        className: 'user-pulse-marker',
        html: `
          <div class="user-location-pulse">
            <div class="pulse-ring"></div>
            <div class="pulse-dot"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })

      const marker = L.marker([lat, lng], { icon: pulseIcon })
      marker.bindTooltip('Your Approximate Location (~111m area-level)', {
        direction: 'top',
        offset: [0, -10],
      })

      marker.addTo(map)
      userMarkerRef.current = marker

      // Gentle pan to user location
      map.panTo([lat, lng], { animate: true })
    }
  }, [L, userCoarseLocation, mapReady])

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn()
  }, [])

  const handleZoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut()
  }, [])

  return (
    <div
      className={cn(
        'awarely-map-container relative h-full w-full overflow-hidden bg-[#070F1E] select-none',
        tileConfig.applyDarkFilter && 'dark-tiles',
        className,
      )}
    >
      {/* ── Leaflet DOM Container ───────────────────────────────────── */}
      <div
        ref={mapContainerRef}
        id="awarely-leaflet-map"
        className="h-full w-full z-0"
        tabIndex={0}
        aria-label="Interactive Awareness Safety Map"
      />

      {/* Loading overlay while cartography engine initializes */}
      {!mapReady && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#070F1E]/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-teal-400 mb-2" />
          <span className="text-xs font-medium text-slate-400">Loading interactive cartography…</span>
        </div>
      )}

      {/* ── City Switcher Bar (Top Left) ────────────────────────────── */}
      <div className="absolute left-4 top-20 z-20 flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-[#0B192C]/90 p-1 backdrop-blur-xl shadow-xl">
        <Building2 className="ml-2 h-3.5 w-3.5 text-[#EB5E28]" />
        {cities.map((city) => (
          <button
            key={city}
            onClick={() => {
              setActiveCity(city)
              const firstArea = areas.find(
                (a) => a.city.toLowerCase() === city.toLowerCase(),
              )
              if (firstArea) {
                onSelectArea(firstArea)
              } else {
                const cityKey = city.toLowerCase().replace(/\s+/g, '')
                if (CITY_CENTERS[cityKey] && mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo(CITY_CENTERS[cityKey], 13)
                }
              }
            }}
            className={cn(
              'rounded-xl px-3 py-1 text-xs font-semibold transition',
              activeCity.toLowerCase() === city.toLowerCase()
                ? 'bg-[#EB5E28] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
            )}
          >
            {city}
          </button>
        ))}
      </div>

      {/* ── Floating Map Controls (Right Side) ──────────────────────── */}
      <div className="absolute right-4 top-20 z-20 flex flex-col gap-2">
        {/* Discrete Location Check Button */}
        {onRequestLocation && (
          <button
            onClick={onRequestLocation}
            disabled={locating}
            title="Perform single discrete location area check (Privacy-first: no continuous tracking)"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#1E3550] bg-[#0B192C] text-teal-400 hover:text-white hover:border-teal-500/50 transition active:scale-95 shadow-xl"
            aria-label="Locate Current Area"
          >
            <Navigation className={cn('h-4 w-4', locating && 'animate-spin text-amber-400')} />
          </button>
        )}

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1E3550] bg-[#0B192C] text-slate-300 hover:text-white transition active:scale-95 shadow-lg"
          aria-label="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1E3550] bg-[#0B192C] text-slate-300 hover:text-white transition active:scale-95 shadow-lg"
          aria-label="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>

      {/* ── Area-Level Watermark & Privacy Banner ─────────────────────── */}
      <div className="absolute bottom-6 left-4 z-10 hidden sm:flex items-center gap-2 rounded-full border border-slate-800 bg-[#0B192C]/85 px-3.5 py-1 text-[11px] text-slate-400 backdrop-blur-md shadow-lg">
        <Compass className="h-3.5 w-3.5 text-teal-400" />
        <span>Area-level cartography • Zero continuous GPS tracking</span>
      </div>
    </div>
  )
}
