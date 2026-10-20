/**
 * freshness — utilities for communicating data age to users.
 * All times are approximate and phrased to convey uncertainty, not precision.
 */

export function getRelativeTimeLabel(date: Date | null | undefined): string {
  if (!date) return 'No recent data'

  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 2) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

/**
 * Returns true if the data is considered fresh (within 48 hours).
 * Areas with stale data should show reduced confidence.
 */
export function isDataFresh(date: Date | null | undefined, thresholdHours = 48): boolean {
  if (!date) return false
  return Date.now() - date.getTime() < thresholdHours * 3_600_000
}
