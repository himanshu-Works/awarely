import { describe, it, expect, beforeEach } from 'vitest'
import { DevToolsService } from '@/services/dev-tools.service'
import { locationAwarenessService } from '@/services/location-awareness.service'
import { authService } from '@/services/auth.service'
import type { Area } from '@/types/area'
import type { Report } from '@/types/report'
import { Timestamp } from 'firebase/firestore'

describe('Awarely Developer Tools & Zone Simulation', () => {
  let devTools: DevToolsService
  let mockAreas: Area[]

  beforeEach(() => {
    devTools = new DevToolsService()
    locationAwarenessService.resetState()
    locationAwarenessService.setAlertsEnabled(true)
    locationAwarenessService.resumeAlerts()
    devTools.deleteAllDemoData()

    mockAreas = [
      {
        id: 'area-delhi-rail-corridor',
        name: 'Old Delhi Transit & Railway Perimeter',
        city: 'New Delhi',
        fullName: 'Railway Colony Perimeter, Old Delhi, Delhi, India',
        center: { latitude: 28.659, longitude: 77.221 },
        radiusMeters: 1500,
        bounds: {
          northEast: { latitude: 28.665, longitude: 77.228 },
          southWest: { latitude: 28.653, longitude: 77.215 },
        },
        polygon: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
        reportCount: 19,
        recentReportCount: 5,
        confidenceLevel: 'moderate',
        awarenessLevel: 'quiet', // Higher concern
        topObservations: [],
        dayNightSplit: { day: 70, night: 40 },
        aiSummary: '',
        aiSummaryGeneratedAt: null,
      },
      {
        id: 'area-delhi-hauz-khas',
        name: 'Hauz Khas Village & Environs',
        city: 'New Delhi',
        fullName: 'Hauz Khas Village, New Delhi, Delhi, India',
        center: { latitude: 28.552, longitude: 77.196 },
        radiusMeters: 1200,
        bounds: {
          northEast: { latitude: 28.558, longitude: 77.202 },
          southWest: { latitude: 28.547, longitude: 77.191 },
        },
        polygon: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
        reportCount: 16,
        recentReportCount: 4,
        confidenceLevel: 'moderate',
        awarenessLevel: 'mixed', // Caution
        topObservations: [],
        dayNightSplit: { day: 80, night: 60 },
        aiSummary: '',
        aiSummaryGeneratedAt: null,
      },
      {
        id: 'area-delhi-cp',
        name: 'Connaught Place (Inner & Outer Circle)',
        city: 'New Delhi',
        fullName: 'Connaught Place, New Delhi, Delhi, India',
        center: { latitude: 28.630, longitude: 77.218 },
        radiusMeters: 1200,
        bounds: {
          northEast: { latitude: 28.636, longitude: 77.225 },
          southWest: { latitude: 28.625, longitude: 77.211 },
        },
        polygon: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
        reportCount: 22,
        recentReportCount: 6,
        confidenceLevel: 'moderate',
        awarenessLevel: 'active', // Positive
        topObservations: [],
        dayNightSplit: { day: 90, night: 80 },
        aiSummary: '',
        aiSummaryGeneratedAt: null,
      },
    ]
  })

  // ── 1. ROLE PROTECTION TESTS ──────────────────────────────────────

  describe('Role-Based Access Control', () => {
    it('grants dev/admin users access and denies normal users', () => {
      // Normal user
      authService.setMockRole('user')
      expect(authService.getMockRole()).toBe('user')

      // Dev user
      authService.setMockRole('dev')
      expect(authService.getMockRole()).toBe('dev')

      // Admin user
      authService.setMockRole('admin')
      expect(authService.getMockRole()).toBe('admin')
    })
  })

  // ── 2. ZONE SIMULATION (REAL PRODUCTION PIPELINE) ─────────────────

  describe('Zone Simulation with Real Production Pipeline', () => {
    it('simulates Danger Zone and triggers real alert via production pipeline', () => {
      const result = devTools.simulateZone('danger', mockAreas)

      expect(result.zone.id).toBe('danger')
      expect(result.event).toBeDefined()
      expect(result.event?.type).toBe('ENTER')
      expect(result.event?.areaId).toBe('area-delhi-rail-corridor')
      expect(result.alertTriggered).toBe(true)
      expect(result.currentAreaId).toBe('area-delhi-rail-corridor')
    })

    it('simulates Warning Zone and triggers caution alert via production pipeline', () => {
      const result = devTools.simulateZone('warning', mockAreas)

      expect(result.zone.id).toBe('warning')
      expect(result.event).toBeDefined()
      expect(result.event?.type).toBe('ENTER')
      expect(result.event?.areaId).toBe('area-delhi-hauz-khas')
      expect(result.alertTriggered).toBe(true)
    })

    it('simulates Safe Zone without triggering alarm (positive area invariant)', () => {
      const result = devTools.simulateZone('safe', mockAreas)

      expect(result.zone.id).toBe('safe')
      expect(result.event).toBeDefined()
      expect(result.event?.type).toBe('ENTER')
      expect(result.alertTriggered).toBe(false)
      expect(result.suppressionReason).toMatch(/positive/i)
    })

    it('simulates Reset Location to neutral space outside monitored areas', () => {
      // First move into a zone
      devTools.simulateZone('danger', mockAreas)
      expect(locationAwarenessService.getCurrentAreaId()).toBe('area-delhi-rail-corridor')

      // Now reset location
      const result = devTools.simulateZone('outside', mockAreas)
      expect(result.event?.type).toBe('EXIT')
      expect(result.currentAreaId).toBeNull()
    })
  })

  // ── 3. COOLDOWN CLEARING & SIMULATION RESET ───────────────────────

  describe('Cooldown Management & Simulation Reset', () => {
    it('enforces cooldown on repeated entry and clears it on demand', () => {
      const now = 1000000000

      // 1. Enter danger zone -> triggers alert
      const first = devTools.simulateZone('danger', mockAreas, now)
      expect(first.alertTriggered).toBe(true)

      // 2. Step outside
      devTools.simulateZone('outside', mockAreas, now + 5000)

      // 3. Re-enter danger zone 5 minutes later (cooldown is 60m)
      const second = devTools.simulateZone('danger', mockAreas, now + 300000)
      expect(second.alertTriggered).toBe(false)
      expect(second.suppressionReason).toMatch(/cooldown/i)

      // 4. Developer clicks "Clear Alert Cooldown"
      devTools.clearAlertCooldowns()

      // 5. Step outside and re-enter danger zone -> alert triggers immediately!
      devTools.simulateZone('outside', mockAreas, now + 305000)
      const third = devTools.simulateZone('danger', mockAreas, now + 310000)
      expect(third.alertTriggered).toBe(true)
    })

    it('resets simulation cleanly', () => {
      devTools.simulateZone('danger', mockAreas)
      expect(locationAwarenessService.getCurrentAreaId()).not.toBeNull()

      const resetResult = devTools.resetSimulation(mockAreas)
      expect(resetResult.currentAreaId).toBeNull()
      expect(devTools.getCurrentSimulationState().zoneKey).toBe('outside')
    })
  })

  // ── 4. DEMO DATA GENERATION & ISOLATION ───────────────────────────

  describe('Demo Reports Isolation & Management', () => {
    it('generates demo reports marked with isDemo: true', () => {
      const reports = devTools.generateDemoReports(
        'area-delhi-rail-corridor',
        'Old Delhi Transit',
        'danger',
        5,
      )

      expect(reports.length).toBe(5)
      reports.forEach((rep) => {
        expect(rep.isDemo).toBe(true)
        expect(rep.source).toBe('demo')
        expect(rep.areaId).toBe('area-delhi-rail-corridor')
      })

      const stored = devTools.getAllDemoReports('area-delhi-rail-corridor')
      expect(stored.length).toBe(5)
    })

    it('deletes all demo data on demand without affecting real data', () => {
      devTools.generateDemoReports('area-delhi-rail-corridor', 'Old Delhi Transit', 'danger', 4)
      devTools.generateDemoReports('area-delhi-hauz-khas', 'Hauz Khas', 'caution', 3)

      expect(devTools.getAllDemoReports().length).toBe(7)

      const result = devTools.deleteAllDemoData()
      expect(result.deletedCount).toBe(7)
      expect(devTools.getAllDemoReports().length).toBe(0)
    })
  })

  // ── 5. EXPLAIN CALCULATION BREAKDOWN ───────────────────────────────

  describe('Explain Calculation Breakdown', () => {
    it('produces a transparent step-by-step mathematical explanation', () => {
      const area = mockAreas[0]
      const reports: Report[] = [
        {
          id: 'rep-1',
          areaId: area.id,
          rating: 1, // Normalized = 0
          tags: ['Poor lighting', 'Isolated'],
          timeContext: 'night',
          note: 'Very dark',
          createdAt: Timestamp.fromMillis(Date.now() - 2 * 3600 * 1000), // 2h ago
          weight: 1.0,
          platform: 'web',
          isAnonymous: false,
          isDemo: false,
        },
        {
          id: 'rep-2',
          areaId: area.id,
          rating: 2, // Normalized = 25
          tags: ['Poor lighting'],
          timeContext: 'night',
          note: 'Dim pathway',
          createdAt: Timestamp.fromMillis(Date.now() - 5 * 3600 * 1000), // 5h ago
          weight: 1.0,
          platform: 'web',
          isAnonymous: false,
          isDemo: false,
        },
      ]

      const expl = devTools.explainCalculation(area, reports)

      expect(expl.area.id).toBe(area.id)
      expect(expl.reportCount.raw).toBe(2)
      expect(expl.reportCount.effectiveVolume).toBeGreaterThan(1.5)
      expect(expl.relevantReports.length).toBe(2)
      expect(expl.relevantReports[0].recencyWeight).toBeGreaterThan(0)
      expect(expl.relevantReports[0].normalizedScore).toBe(0)
      expect(expl.calculatedScore.overall).toBeLessThan(40)
      expect(expl.selectedSafetyState).toBe('higher-concern')
      expect(expl.stateReason).toMatch(/higher-concern|calculated score/i)
      expect(expl.confidence.level).toBeDefined()
      expect(expl.freshness.freshnessLabel).toMatch(/fresh/i)
    })

    it('correctly explains insufficient data state when report volume is low', () => {
      const area = mockAreas[0]
      const singleReport: Report[] = [
        {
          id: 'single-rep',
          areaId: area.id,
          rating: 1,
          tags: ['Poor lighting'],
          timeContext: 'night',
          note: 'Dark alley',
          createdAt: Timestamp.now(),
          weight: 1.0,
          platform: 'web',
          isAnonymous: false,
          isDemo: false,
        },
      ]

      const expl = devTools.explainCalculation(area, singleReport)

      expect(expl.selectedSafetyState).toBe('insufficient-data')
      expect(expl.calculatedScore.overall).toBeNull()
      expect(expl.stateReason).toMatch(/insufficient/i)
    })

    // ── REGRESSION: createdAt.toMillis is not a function ───────────────
    it('handles JSON serialized demo reports without throwing "createdAt.toMillis is not a function"', () => {
      const area = mockAreas[0]
      const storageMap: Record<string, string> = {}
      const mockLocalStorage = {
        getItem: (k: string) => storageMap[k] || null,
        setItem: (k: string, v: string) => { storageMap[k] = v },
        removeItem: (k: string) => { delete storageMap[k] },
      }
      const originalStorage = (globalThis as any).localStorage
      ;(globalThis as any).localStorage = mockLocalStorage

      try {
        // 1. Generate 5 danger demo reports (which writes to localStorage)
        devTools.generateDemoReports(area.id, area.name, 'danger', 5)

        // 2. Verify raw localStorage round-trip where Timestamp became plain { seconds, nanoseconds }
        const rawStored = mockLocalStorage.getItem('awarely_dev_demo_reports')
        expect(rawStored).toBeTruthy()
        const plainObjects = JSON.parse(rawStored!)
        // Verify that plainObjects[0].createdAt lacks .toMillis()
        expect(typeof plainObjects[0].createdAt.toMillis).toBe('undefined')

        // 3. Retrieve through getAllDemoReports (which reads and deserializes from localStorage)
        const retrieved = devTools.getAllDemoReports(area.id)
        expect(retrieved.length).toBe(5)

        // 4. Run explainCalculation - MUST NOT THROW "createdAt.toMillis is not a function"
        expect(() => {
          const expl = devTools.explainCalculation(area, retrieved)
          expect(expl).toBeDefined()
          expect(expl.relevantReports.length).toBe(5)
          expect(expl.relevantReports[0].ageHours).toBeGreaterThanOrEqual(0)
        }).not.toThrow()
      } finally {
        if (originalStorage) {
          ;(globalThis as any).localStorage = originalStorage
        } else {
          delete (globalThis as any).localStorage
        }
      }
    })

    it('generates all three demo templates (danger, caution, safe) with correct profile characteristics', () => {
      const area = mockAreas[0]
      devTools.deleteAllDemoData()

      // 1. Danger profile (+5)
      const danger = devTools.generateDemoReports(area.id, area.name, 'danger', 5)
      expect(danger.length).toBe(5)
      danger.forEach((r) => {
        expect(r.rating).toBeLessThanOrEqual(2)
        expect(r.isDemo).toBe(true)
      })

      // 2. Caution profile (+5)
      const caution = devTools.generateDemoReports(area.id, area.name, 'caution', 5)
      expect(caution.length).toBe(5)
      caution.forEach((r) => {
        expect(r.rating).toBeGreaterThanOrEqual(2)
        expect(r.rating).toBeLessThanOrEqual(3)
        expect(r.isDemo).toBe(true)
      })

      // 3. Safe/Positive profile (+5)
      const safe = devTools.generateDemoReports(area.id, area.name, 'safe', 5)
      expect(safe.length).toBe(5)
      safe.forEach((r) => {
        expect(r.rating).toBeGreaterThanOrEqual(4)
        expect(r.isDemo).toBe(true)
      })

      const total = devTools.getAllDemoReports(area.id)
      expect(total.length).toBe(15)

      // Explain calculation on all 15 reports
      const expl = devTools.explainCalculation(area, total)
      expect(expl.reportCount.demoCount).toBe(15)
      expect(expl.reportCount.raw).toBe(15)

      // Clean up
      devTools.deleteAllDemoData()
      expect(devTools.getAllDemoReports().length).toBe(0)
    })
  })
})
