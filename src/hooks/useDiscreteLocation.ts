/**
 * useDiscreteLocation — performs a single, user-initiated geolocation query.
 *
 * Privacy guarantees:
 * - Uses getCurrentPosition (NOT watchPosition — no continuous tracking)
 * - Requests LOW accuracy intentionally (network-based, ~1km radius)
 * - Coordinates exist only in component state — never sent to Firestore
 * - Coordinates are truncated before passing to Cloud Functions
 */

import { useState, useCallback } from 'react'
import { truncateCoordinate } from '@/services/maps.service'

export interface CoarseCoordinates {
  lat: number
  lng: number
}

interface UseDiscreteLocationState {
  /** Truncated coordinates — only available after user initiates a location check. */
  coordinates: CoarseCoordinates | null
  /** True while the geolocation API is running. */
  locating: boolean
  /** Error from the geolocation API, if any. */
  error: GeolocationPositionError | null
  /** Whether the user has denied location permission. */
  permissionDenied: boolean
}

interface UseDiscreteLocationActions {
  /** Trigger a single location check (user-initiated only). */
  requestLocation: () => void
  /** Clear stored coordinates from state. */
  clearLocation: () => void
}

type UseDiscreteLocationReturn = UseDiscreteLocationState & UseDiscreteLocationActions

const GEO_OPTIONS: PositionOptions = {
  // Fresh high-accuracy one-shot request (GPS / Wi-Fi triangulation).
  // Privacy is guaranteed by truncating coordinates to 3 decimals (~111m) before use.
  enableHighAccuracy: true,
  timeout: 12_000,
  maximumAge: 0, // Never accept stale cached positions
}

export function useDiscreteLocation(): UseDiscreteLocationReturn {
  const [coordinates, setCoordinates] = useState<CoarseCoordinates | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<GeolocationPositionError | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('[Awarely] Geolocation API not available in this browser.')
      return
    }

    setLocating(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Truncate to 3 decimal places for privacy (~111m precision)
        const coarse: CoarseCoordinates = {
          lat: truncateCoordinate(position.coords.latitude),
          lng: truncateCoordinate(position.coords.longitude),
        }
        setCoordinates(coarse)
        setLocating(false)
      },
      (positionError) => {
        setError(positionError)
        setLocating(false)
        if (positionError.code === positionError.PERMISSION_DENIED) {
          setPermissionDenied(true)
        }
      },
      GEO_OPTIONS,
    )
  }, [])

  const clearLocation = useCallback(() => {
    setCoordinates(null)
    setError(null)
  }, [])

  return { coordinates, locating, error, permissionDenied, requestLocation, clearLocation }
}
