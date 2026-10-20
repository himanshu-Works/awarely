import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import {
  normalizeToMillis,
  normalizeToDate,
  toFirestoreTimestamp,
  getReportTimestampMs,
} from '@/utils/date'

describe('Date & Timestamp Normalization Utility Suite', () => {
  const sampleEpochMs = 1775123456789
  const sampleEpochSec = 1775123456

  it('normalizes genuine Firestore Timestamp instances with .toMillis()', () => {
    const ts = Timestamp.fromMillis(sampleEpochMs)
    expect(normalizeToMillis(ts)).toBe(sampleEpochMs)
    expect(normalizeToDate(ts).getTime()).toBe(sampleEpochMs)
    expect(toFirestoreTimestamp(ts)).toBe(ts)
  })

  it('normalizes serialized Firestore Timestamp objects ({ seconds, nanoseconds }) lacking .toMillis()', () => {
    // This is the EXACT format created by JSON.stringify() and parsed by JSON.parse() from localStorage
    const serialized = { seconds: sampleEpochSec, nanoseconds: 789000000 }
    expect((serialized as any).toMillis).toBeUndefined()

    // Must not throw "toMillis is not a function"
    const ms = normalizeToMillis(serialized)
    expect(ms).toBe(sampleEpochMs)

    const date = normalizeToDate(serialized)
    expect(date.getTime()).toBe(sampleEpochMs)

    const restoredTs = toFirestoreTimestamp(serialized)
    expect(restoredTs).toBeInstanceOf(Timestamp)
    expect(typeof restoredTs.toMillis).toBe('function')
    expect(restoredTs.toMillis()).toBe(sampleEpochMs)
  })

  it('normalizes admin SDK serialized Timestamp objects ({ _seconds, _nanoseconds })', () => {
    const adminSerialized = { _seconds: sampleEpochSec, _nanoseconds: 789000000 }
    expect(normalizeToMillis(adminSerialized)).toBe(sampleEpochMs)
  })

  it('normalizes JavaScript Date instances', () => {
    const date = new Date(sampleEpochMs)
    expect(normalizeToMillis(date)).toBe(sampleEpochMs)
    expect(normalizeToDate(date).getTime()).toBe(sampleEpochMs)
  })

  it('normalizes numeric epoch in milliseconds and seconds', () => {
    expect(normalizeToMillis(sampleEpochMs)).toBe(sampleEpochMs)
    expect(normalizeToMillis(sampleEpochSec)).toBe(sampleEpochSec * 1000)
  })

  it('normalizes ISO 8601 strings and date strings', () => {
    const iso = '2026-04-02T09:50:56.789Z'
    const expected = Date.parse(iso)
    expect(normalizeToMillis(iso)).toBe(expected)
    expect(normalizeToDate(iso).toISOString()).toBe(iso)
  })

  it('gracefully handles null, undefined, and invalid objects with fallback', () => {
    const fallback = 123456789
    expect(normalizeToMillis(null, fallback)).toBe(fallback)
    expect(normalizeToMillis(undefined, fallback)).toBe(fallback)
    expect(normalizeToMillis({}, fallback)).toBe(fallback)
    expect(normalizeToMillis('invalid-date-string', fallback)).toBe(fallback)
  })

  it('extracts report timestamps safely regardless of serialized or live format', () => {
    const liveReport = {
      createdAt: Timestamp.fromMillis(sampleEpochMs),
    }
    expect(getReportTimestampMs(liveReport)).toBe(sampleEpochMs)

    // Serialized report (after JSON.stringify -> JSON.parse round-trip in localStorage)
    const serializedReport = {
      createdAt: { seconds: sampleEpochSec, nanoseconds: 789000000 },
    }
    expect(getReportTimestampMs(serializedReport)).toBe(sampleEpochMs)

    // Report with submittedAt alias
    const submittedReport = {
      submittedAt: { seconds: sampleEpochSec, nanoseconds: 0 },
    }
    expect(getReportTimestampMs(submittedReport)).toBe(sampleEpochSec * 1000)

    // Report without timestamps uses fallback
    expect(getReportTimestampMs({}, 99999)).toBe(99999)
  })
})
