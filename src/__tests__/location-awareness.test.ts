import { describe, it, expect, beforeEach } from 'vitest'
import { LocationAwarenessEngine } from '@/services/location-awareness.service'
import { truncateCoordinate } from '@/services/maps.service'
import { geocodingService } from '@/services/geocoding.service'
import type { Area } from '@/types/area'
import { Timestamp } from 'firebase/firestore'

describe('Awarely Location-Based Safety Awareness Engine', () => {
  let engine: LocationAwarenessEngine

  // Sample Monitored Areas
  const cautionArea: Area = {
    id: 'area-caution-colaba',
    name: 'Colaba Causeway',
    canonicalName: 'Colaba Causeway',
    city: 'Mumbai',
    locality: 'Colaba',
    fullName: 'Colaba Causeway, Mumbai',
    center: { latitude: 18.91, longitude: 72.82 },
    radiusMeters: 1000,
    bounds: {
      northEast: { latitude: 18.92, longitude: 72.83 },
      southWest: { latitude: 18.90, longitude: 72.81 },
    },
    polygon: 'POLYGON(...)',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    isActive: true,
    reportCount: 24,
    recentReportCount: 10,
    confidence: 'moderate',
    confidenceLevel: 'moderate',
    overallScore: 55, // Caution tier
    timeScores: { day: 70, evening: 60, night: 45 },
    lastReportAt: Timestamp.now(),
    latestReportAt: Timestamp.now(),
    topObservations: ['Poor lighting', 'Crowded'],
    dayNightSplit: { day: 65, night: 35 },
    awarenessLevel: 'mixed',
    aiSummary: null,
    aiSummaryGeneratedAt: null,
  }

  const concernArea: Area = {
    id: 'area-concern-lane',
    name: 'Industrial By-lane',
    canonicalName: 'Industrial By-lane',
    city: 'Mumbai',
    locality: 'Kurla',
    fullName: 'Industrial By-lane, Mumbai',
    center: { latitude: 19.06, longitude: 72.88 },
    radiusMeters: 800,
    bounds: {
      northEast: { latitude: 19.07, longitude: 72.89 },
      southWest: { latitude: 19.05, longitude: 72.87 },
    },
    polygon: 'POLYGON(...)',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    isActive: true,
    reportCount: 18,
    recentReportCount: 6,
    confidence: 'moderate',
    confidenceLevel: 'moderate',
    overallScore: 35, // Higher concern tier
    timeScores: { day: 50, evening: 38, night: 28 },
    lastReportAt: Timestamp.now(),
    latestReportAt: Timestamp.now(),
    topObservations: ['Poor lighting', 'Isolated'],
    dayNightSplit: { day: 40, night: 60 },
    awarenessLevel: 'quiet',
    aiSummary: null,
    aiSummaryGeneratedAt: null,
  }

  const positiveArea: Area = {
    id: 'area-positive-bandra',
    name: 'Carter Road Promenade',
    canonicalName: 'Carter Road Promenade',
    city: 'Mumbai',
    locality: 'Bandra',
    fullName: 'Carter Road Promenade, Mumbai',
    center: { latitude: 19.07, longitude: 72.82 },
    radiusMeters: 1200,
    bounds: {
      northEast: { latitude: 19.08, longitude: 72.83 },
      southWest: { latitude: 19.06, longitude: 72.81 },
    },
    polygon: 'POLYGON(...)',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    isActive: true,
    reportCount: 42,
    recentReportCount: 15,
    confidence: 'high',
    confidenceLevel: 'high',
    overallScore: 88, // Generally positive tier
    timeScores: { day: 92, evening: 88, night: 78 },
    lastReportAt: Timestamp.now(),
    latestReportAt: Timestamp.now(),
    topObservations: ['Well-lit', 'High foot traffic'],
    dayNightSplit: { day: 70, night: 30 },
    awarenessLevel: 'active',
    aiSummary: null,
    aiSummaryGeneratedAt: null,
  }

  const sparseArea: Area = {
    id: 'area-sparse-data',
    name: 'Quiet Far Sector',
    canonicalName: 'Quiet Far Sector',
    city: 'Mumbai',
    locality: 'Far Sector',
    fullName: 'Quiet Far Sector, Mumbai',
    center: { latitude: 19.15, longitude: 72.95 },
    radiusMeters: 1000,
    bounds: {
      northEast: { latitude: 19.16, longitude: 72.96 },
      southWest: { latitude: 19.14, longitude: 72.94 },
    },
    polygon: 'POLYGON(...)',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    isActive: true,
    reportCount: 1, // Only 1 report -> Insufficient data!
    recentReportCount: 1,
    confidence: 'low',
    confidenceLevel: 'low',
    overallScore: null,
    timeScores: { day: 50, evening: 50, night: 50 },
    lastReportAt: Timestamp.now(),
    latestReportAt: Timestamp.now(),
    topObservations: [],
    dayNightSplit: { day: 50, night: 50 },
    awarenessLevel: 'unknown',
    aiSummary: null,
    aiSummaryGeneratedAt: null,
  }

  const monitoredAreas = [cautionArea, concernArea, positiveArea, sparseArea]

  beforeEach(() => {
    engine = new LocationAwarenessEngine()
    engine.resetState()
    engine.setAlertsEnabled(true)
    engine.resumeAlerts()
  })

  // ── 1. AREA ENTRY ────────────────────────────────────────────────────────
  describe('1. Area Entry', () => {
    it('triggers a calm safety alert when a user enters a caution area', () => {
      const now = 1000000
      // Coordinates inside Colaba Causeway
      const coords = { latitude: 18.9105, longitude: 72.8205 }

      const event = engine.processLocationUpdate(coords, monitoredAreas, now)

      expect(event).not.toBeNull()
      expect(event?.type).toBe('ENTER')
      expect(event?.areaId).toBe(cautionArea.id)
      expect(event?.alertTriggered).toBe(true)

      const alert = event?.alert
      expect(alert).toBeDefined()
      expect(alert?.areaName).toBe('Colaba Causeway')
      expect(alert?.state).toBe('caution')
      expect(alert?.alertMessage).toContain('Safety awareness:')
      expect(alert?.alertMessage).toContain('caution in this area')
      expect(alert?.alertMessage).toContain('Confidence: Moderate')
      expect(alert?.alertMessage).toContain('Based on 24 recent reports')

      // Ensure no alarmist panic words
      expect(alert?.alertMessage).not.toContain('danger')
      expect(alert?.alertMessage).not.toContain('crime')
      expect(alert?.alertMessage).not.toContain('threat')
    })

    it('triggers a calm safety alert when entering a higher-concern area', () => {
      const now = 1000000
      // Coordinates inside Industrial By-lane
      const coords = { latitude: 19.0602, longitude: 72.8802 }

      const event = engine.processLocationUpdate(coords, monitoredAreas, now)

      expect(event?.type).toBe('ENTER')
      expect(event?.areaId).toBe(concernArea.id)
      expect(event?.alertTriggered).toBe(true)
      expect(event?.alert?.state).toBe('higher-concern')
      expect(event?.alert?.alertMessage).toContain('higher concern in this area')
    })
  })

  // ── 2. REPEATED LOCATION UPDATES ─────────────────────────────────────────
  describe('2. Repeated Location Updates (Once Per Entry)', () => {
    it('does not repeatedly alert while the user remains in the same area', () => {
      let time = 1000000
      const coords1 = { latitude: 18.9102, longitude: 72.8202 }

      // First check: Entry event
      const event1 = engine.processLocationUpdate(coords1, monitoredAreas, time)
      expect(event1?.alertTriggered).toBe(true)

      // Next check 5 minutes later: small movement within same area
      time += 5 * 60 * 1000
      const coords2 = { latitude: 18.9110, longitude: 72.8208 }
      const event2 = engine.processLocationUpdate(coords2, monitoredAreas, time)

      // Invariant: Once per area entry -> No repeated alert!
      expect(event2).toBeNull()

      // Next check 15 minutes later: still in same area
      time += 10 * 60 * 1000
      const coords3 = { latitude: 18.9105, longitude: 72.8204 }
      const event3 = engine.processLocationUpdate(coords3, monitoredAreas, time)

      expect(event3).toBeNull()
    })
  })

  // ── 3. COOLDOWN LOGIC ────────────────────────────────────────────────────
  describe('3. Cooldown Logic', () => {
    it('suppresses alerts if user re-enters the same area within the cooldown window', () => {
      let time = 1000000
      const insideCoords = { latitude: 18.9105, longitude: 72.8205 }
      const outsideCoords = { latitude: 18.8000, longitude: 72.7000 } // Outside monitored areas

      // 1. Enter Colaba -> Alert fires
      const enter1 = engine.processLocationUpdate(insideCoords, monitoredAreas, time)
      expect(enter1?.alertTriggered).toBe(true)

      // 2. Step outside 10 minutes later -> Exit event
      time += 10 * 60 * 1000
      const exit1 = engine.processLocationUpdate(outsideCoords, monitoredAreas, time)
      expect(exit1?.type).toBe('EXIT')

      // 3. Re-enter 5 minutes later (total 15 mins since alert, default cooldown is 60 mins)
      time += 5 * 60 * 1000
      const reEnterWithinCooldown = engine.processLocationUpdate(insideCoords, monitoredAreas, time)

      // Re-entry is detected, but alert is suppressed by cooldown!
      expect(reEnterWithinCooldown?.type).toBe('ENTER')
      expect(reEnterWithinCooldown?.alertTriggered).toBe(false)
      expect(reEnterWithinCooldown?.alert).toBeUndefined()
    })

    it('triggers a fresh alert when re-entering after cooldown has expired', () => {
      let time = 1000000
      const insideCoords = { latitude: 18.9105, longitude: 72.8205 }
      const outsideCoords = { latitude: 18.8000, longitude: 72.7000 }

      // 1. Enter -> Alert fires
      engine.processLocationUpdate(insideCoords, monitoredAreas, time)

      // 2. Exit 20 minutes later
      time += 20 * 60 * 1000
      engine.processLocationUpdate(outsideCoords, monitoredAreas, time)

      // 3. Re-enter 65 minutes after first alert (cooldown is 60 mins)
      time = 1000000 + 65 * 60 * 1000
      const reEnterAfterCooldown = engine.processLocationUpdate(insideCoords, monitoredAreas, time)

      expect(reEnterAfterCooldown?.type).toBe('ENTER')
      expect(reEnterAfterCooldown?.alertTriggered).toBe(true)
      expect(reEnterAfterCooldown?.alert).toBeDefined()
    })
  })

  // ── 4. LEAVING AND RE-ENTERING ───────────────────────────────────────────
  describe('4. Leaving and Re-entering Reset', () => {
    it('properly tracks transition across different monitored areas', () => {
      let time = 1000000
      const colabaCoords = { latitude: 18.9105, longitude: 72.8205 } // Colaba (Caution)
      const kurlaCoords = { latitude: 19.0602, longitude: 72.8802 }  // Kurla (Concern)

      // 1. Enter Colaba
      const eventColaba = engine.processLocationUpdate(colabaCoords, monitoredAreas, time)
      expect(eventColaba?.areaId).toBe(cautionArea.id)
      expect(eventColaba?.alertTriggered).toBe(true)
      expect(engine.getCurrentAreaId()).toBe(cautionArea.id)

      // 2. Transition directly to Kurla (Industrial By-lane)
      time += 30 * 60 * 1000
      const eventKurla = engine.processLocationUpdate(kurlaCoords, monitoredAreas, time)
      expect(eventKurla?.type).toBe('ENTER')
      expect(eventKurla?.areaId).toBe(concernArea.id)
      expect(eventKurla?.alertTriggered).toBe(true)
      expect(engine.getCurrentAreaId()).toBe(concernArea.id)
    })
  })

  // ── 5. DISABLED & PAUSED ALERTS ──────────────────────────────────────────
  describe('5. Disabled & Paused Alerts', () => {
    it('does not trigger alerts when alertsEnabled is false', () => {
      engine.setAlertsEnabled(false)

      const coords = { latitude: 19.0602, longitude: 72.8802 } // Higher concern area
      const event = engine.processLocationUpdate(coords, monitoredAreas, Date.now())

      expect(event?.type).toBe('ENTER')
      expect(event?.alertTriggered).toBe(false)
      expect(event?.alert).toBeUndefined()
    })

    it('does not trigger alerts while notifications are temporarily paused', () => {
      const now = 2000000
      // Pause for 60 minutes
      engine.pauseAlerts(60)

      const coords = { latitude: 19.0602, longitude: 72.8802 }

      // Check during pause (30 minutes in)
      const eventDuringPause = engine.processLocationUpdate(coords, monitoredAreas, now + 30 * 60 * 1000)
      expect(eventDuringPause?.alertTriggered).toBe(false)

      // Reset area state to test re-check after pause resumes
      engine.resetState()
      engine.resumeAlerts()

      const eventAfterResume = engine.processLocationUpdate(coords, monitoredAreas, now + 35 * 60 * 1000)
      expect(eventAfterResume?.alertTriggered).toBe(true)
    })
  })

  // ── 6. INSUFFICIENT DATA & POSITIVE AREAS ─────────────────────────────────
  describe('6. Insufficient Data & Positive Areas', () => {
    it('does NOT trigger a safety alert for areas with insufficient data (reportCount < 2)', () => {
      const coords = { latitude: 19.1505, longitude: 72.9505 } // Quiet Far Sector (reportCount: 1)

      const event = engine.processLocationUpdate(coords, monitoredAreas, Date.now())

      expect(event?.type).toBe('ENTER')
      expect(event?.areaId).toBe(sparseArea.id)
      // Must NOT trigger a higher-concern / caution alert!
      expect(event?.alertTriggered).toBe(false)
      expect(event?.alert).toBeUndefined()
    })

    it('does NOT trigger a safety alert for generally-positive areas', () => {
      const coords = { latitude: 19.0705, longitude: 72.8205 } // Carter Road Promenade (Score: 88)

      const event = engine.processLocationUpdate(coords, monitoredAreas, Date.now())

      expect(event?.type).toBe('ENTER')
      expect(event?.areaId).toBe(positiveArea.id)
      expect(event?.alertTriggered).toBe(false)
      expect(event?.alert).toBeUndefined()
    })
  })

  // ── 7. COORDINATE TRUNCATION & PRIVACY PRESERVATION (~111m PRECISION) ─────
  describe('7. Coordinate Truncation & Privacy Preserving (~111m precision)', () => {
    it('truncates coordinates to 3 decimal places (~111m precision)', () => {
      expect(truncateCoordinate(19.060456)).toBe(19.06)
      expect(truncateCoordinate(72.880912)).toBe(72.881)
      expect(truncateCoordinate(28.6314999)).toBe(28.631)
      expect(truncateCoordinate(12.9781234)).toBe(12.978)
      expect(truncateCoordinate(-33.886499)).toBe(-33.886)
    })

    it('strips high-precision GPS micro-location before transmission', () => {
      const rawUserLat = 18.922123456789
      const rawUserLng = 72.830987654321
      const coarseLat = truncateCoordinate(rawUserLat)
      const coarseLng = truncateCoordinate(rawUserLng)

      // Must have at most 3 decimal places
      const latDecimals = coarseLat.toString().split('.')[1] || ''
      const lngDecimals = coarseLng.toString().split('.')[1] || ''
      expect(latDecimals.length).toBeLessThanOrEqual(3)
      expect(lngDecimals.length).toBeLessThanOrEqual(3)
      expect(coarseLat).toBe(18.922)
      expect(coarseLng).toBe(72.831)
    })
  })

  // ── 8. REVERSE GEOCODING & "NEAR ME" CANONICAL AREA RESOLUTION ────────────
  describe('8. Reverse Geocoding & "Near Me" Canonical Area Resolution', () => {
    it('resolves Babu Banarasi Das Institute (BBDITM) campus vicinity to Chinhat, Lucknow', async () => {
      // BBDITM campus on Faizabad Road, Chinhat, Lucknow coordinates: ~26.89, 81.06
      const bbditmLat = 26.892
      const bbditmLng = 81.058

      const suggestion = await geocodingService.reverseGeocode(bbditmLat, bbditmLng)
      expect(suggestion).toBeDefined()
      expect(suggestion.mainText).toBe('Chinhat')
      expect(suggestion.secondaryText).toContain('Lucknow')

      const resolved = await geocodingService.resolveArea(suggestion)
      expect(resolved.area).toBeDefined()
      expect(resolved.area.city).toBe('Lucknow')
      // Must not fabricate community score
      expect(resolved.area.reportCount).toBe(0)
      expect(resolved.area.confidenceLevel).toBe('low')
    })

    it('resolves coordinates inside known seed area (Colaba Causeway) accurately', async () => {
      const colabaLat = 18.915
      const colabaLng = 72.825

      const suggestion = await geocodingService.reverseGeocode(colabaLat, colabaLng)
      expect(suggestion.mainText).toContain('Colaba')
      expect(suggestion.secondaryText).toContain('Mumbai')
    })

    it('resolves international coordinates (Shinjuku, Tokyo) to containing area', async () => {
      const tokyoLat = 35.693
      const tokyoLng = 139.703

      const suggestion = await geocodingService.reverseGeocode(tokyoLat, tokyoLng)
      expect(suggestion.mainText).toBe('Shinjuku')
      expect(suggestion.secondaryText).toContain('Tokyo')
    })

    it('resolves uncatalogued global coordinates without fabricating reports or scores', async () => {
      const remoteLat = 45.123
      const remoteLng = 9.456

      const suggestion = await geocodingService.reverseGeocode(remoteLat, remoteLng)
      expect(suggestion).toBeDefined()
      expect(suggestion.areaType).toBe('locality')

      const resolved = await geocodingService.resolveArea(suggestion)
      expect(resolved.area.reportCount).toBe(0)
      expect(resolved.area.confidenceLevel).toBe('low')
      expect(resolved.area.overallScore).toBeFalsy()
    })
  })
})
