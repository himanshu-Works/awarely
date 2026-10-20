/**
 * useAreaData — subscribes to real-time Firestore data for a single area.
 *
 * Returns the area document, loading state, and error.
 * Automatically cleans up the Firestore listener on unmount.
 */

import { useState, useEffect } from 'react'
import { firestoreService } from '@/services/firestore.service'
import type { Area } from '@/types/area'

interface UseAreaDataState {
  area: Area | null
  loading: boolean
  error: Error | null
}

export function useAreaData(areaId: string | null): UseAreaDataState {
  const [area, setArea] = useState<Area | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!areaId) {
      setArea(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const unsubscribe = firestoreService.subscribeToArea(
      areaId,
      (data) => {
        setArea(data)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [areaId])

  return { area, loading, error }
}
