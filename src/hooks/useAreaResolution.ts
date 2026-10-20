/**
 * useAreaResolution — resolves user coordinates to a named area via Cloud Function.
 *
 * Coordinates are truncated before sending. The function never stores them.
 * Only the returned areaId (a string) is kept in state.
 */

import { useState, useCallback } from 'react'
import { functionsService } from '@/services/functions.service'
import type { ResolvedArea } from '@/types/area'
import type { CoarseCoordinates } from './useDiscreteLocation'

interface UseAreaResolutionState {
  resolvedArea: ResolvedArea | null
  resolving: boolean
  error: Error | null
}

interface UseAreaResolutionActions {
  resolveFromCoordinates: (coords: CoarseCoordinates) => Promise<void>
  clearResolvedArea: () => void
}

type UseAreaResolutionReturn = UseAreaResolutionState & UseAreaResolutionActions

export function useAreaResolution(): UseAreaResolutionReturn {
  const [resolvedArea, setResolvedArea] = useState<ResolvedArea | null>(null)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const resolveFromCoordinates = useCallback(
    async (coords: CoarseCoordinates) => {
      setResolving(true)
      setError(null)

      try {
        // Coordinates are truncated in useDiscreteLocation before reaching here.
        // functionsService.resolveArea sends them to the Cloud Function.
        const result = await functionsService.resolveArea(coords.lat, coords.lng)
        setResolvedArea(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Area resolution failed'))
        setResolvedArea(null)
      } finally {
        setResolving(false)
      }
    },
    [],
  )

  const clearResolvedArea = useCallback(() => {
    setResolvedArea(null)
    setError(null)
  }, [])

  return { resolvedArea, resolving, error, resolveFromCoordinates, clearResolvedArea }
}
