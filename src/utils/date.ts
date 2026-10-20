/**
 * Awarely Central Date & Timestamp Normalization Utility
 *
 * Provides safe, robust, and bidirectional conversion between:
 * - Firestore Timestamp instances (with .toMillis() and .toDate())
 * - Serialized Firestore Timestamps from JSON/localStorage ({ seconds, nanoseconds } or { _seconds, _nanoseconds })
 * - Native JavaScript Date objects
 * - ISO-8601 strings and date strings
 * - Epoch timestamps (milliseconds or seconds)
 *
 * Prevents runtime TypeErrors (e.g. `createdAt.toMillis is not a function`)
 * across API boundaries, localStorage persistence, and Cloud Functions.
 */

import { Timestamp } from 'firebase/firestore'

/**
 * Safely extracts epoch milliseconds from any recognized timestamp or date representation.
 * Returns `fallbackMs` (defaults to Date.now()) if the input is null, undefined, or unparseable.
 */
export function normalizeToMillis(value: unknown, fallbackMs: number = Date.now()): number {
  if (value === null || value === undefined) {
    return fallbackMs
  }

  // 1. Firestore Timestamp instance (or duck-typed object with toMillis)
  if (typeof (value as any).toMillis === 'function') {
    try {
      const ms = (value as any).toMillis()
      if (typeof ms === 'number' && !isNaN(ms)) {
        return ms
      }
    } catch {
      // Fall through to other checks
    }
  }

  // 2. Object with toDate() (e.g. Firestore Timestamp or similar)
  if (typeof (value as any).toDate === 'function') {
    try {
      const date = (value as any).toDate()
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.getTime()
      }
    } catch {
      // Fall through to other checks
    }
  }

  // 3. Native JavaScript Date instance
  if (value instanceof Date) {
    const time = value.getTime()
    return isNaN(time) ? fallbackMs : time
  }

  // 4. Serialized Firestore Timestamp object (e.g. from JSON.stringify/JSON.parse or Cloud Functions)
  // Handles both client SDK { seconds, nanoseconds } and admin SDK { _seconds, _nanoseconds }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const sec = typeof obj.seconds === 'number' ? obj.seconds : typeof obj._seconds === 'number' ? obj._seconds : null
    const nsec = typeof obj.nanoseconds === 'number' ? obj.nanoseconds : typeof obj._nanoseconds === 'number' ? obj._nanoseconds : 0

    if (sec !== null && !isNaN(sec)) {
      return Math.round(sec * 1000 + (nsec || 0) / 1e6)
    }
  }

  // 5. Numeric timestamp (milliseconds or seconds)
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return fallbackMs
    }
    // If value is in seconds (e.g. 10 digits ~ 1.7e9), convert to ms
    if (value > 1e8 && value < 1e11) {
      return Math.round(value * 1000)
    }
    return Math.round(value)
  }

  // 6. ISO string or parseable date string
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!isNaN(parsed)) {
      return parsed
    }
  }

  return fallbackMs
}

/**
 * Safely converts any timestamp or date representation to a JavaScript Date object.
 */
export function normalizeToDate(value: unknown, fallbackDate: Date = new Date()): Date {
  const ms = normalizeToMillis(value, fallbackDate.getTime())
  return new Date(ms)
}

/**
 * Converts any timestamp or date representation into a guaranteed Firestore Timestamp instance.
 */
export function toFirestoreTimestamp(value: unknown): Timestamp {
  if (
    value &&
    typeof (value as any).toMillis === 'function' &&
    typeof (value as any).seconds === 'number'
  ) {
    return value as Timestamp
  }
  const ms = normalizeToMillis(value)
  return Timestamp.fromMillis(ms)
}

/**
 * Extracts normalized epoch milliseconds from a Report document,
 * checking `createdAt`, `submittedAt`, and `updatedAt` in priority order.
 */
export function getReportTimestampMs(
  report: { createdAt?: unknown; submittedAt?: unknown; updatedAt?: unknown } | null | undefined,
  fallbackMs: number = Date.now(),
): number {
  if (!report) return fallbackMs
  if (report.createdAt !== undefined && report.createdAt !== null) {
    return normalizeToMillis(report.createdAt, fallbackMs)
  }
  if (report.submittedAt !== undefined && report.submittedAt !== null) {
    return normalizeToMillis(report.submittedAt, fallbackMs)
  }
  if (report.updatedAt !== undefined && report.updatedAt !== null) {
    return normalizeToMillis(report.updatedAt, fallbackMs)
  }
  return fallbackMs
}
