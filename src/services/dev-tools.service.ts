/**
 * Awarely Developer Tools Service
 *
 * Dedicated engineering diagnostics, zone simulation, and calculation explainability.
 *
 * CRITICAL ARCHITECTURAL REQUIREMENTS:
 * 1. Zero Separate Fake Alerts: Zone simulation executes the EXACT SAME production alert
 *    pipeline as real location updates (locationAwarenessService.processLocationUpdate).
 * 2. Demo Data Isolation: All generated demo reports are strictly marked with `isDemo: true`
 *    and stored in isolated demo storage, never polluting real community statistics.
 * 3. Calculation Transparency: Explains normalized scores, recency decay, volume shrinkage,
 *    and confidence classification step-by-step.
 */

import { Timestamp } from 'firebase/firestore'
import { locationAwarenessService } from './location-awareness.service'
import {
  calculateAreaSafetyScore,
  DEFAULT_SCORING_CONFIG,
  normalizeRating,
  type AreaScoreResult,
} from '@/utils/scoring'
import { getReportTimestampMs, toFirestoreTimestamp } from '@/utils/date'
import type { Coordinates, GeofenceAreaEntryEvent } from '@/types/location-awareness'
import type { Area } from '@/types/area'
import type { Report } from '@/types/report'

export interface DemoZoneDefinition {
  id: 'danger' | 'warning' | 'safe' | 'outside'
  name: string
  areaId: string | null
  areaName: string
  category: 'higher-concern' | 'caution' | 'generally-positive' | 'outside'
  coords: Coordinates
  description: string
}

export const DEMO_ZONES: Record<'danger' | 'warning' | 'safe' | 'outside', DemoZoneDefinition> = {
  danger: {
    id: 'danger',
    name: 'Simulated Danger Zone',
    areaId: 'area-delhi-rail-corridor',
    areaName: 'Old Delhi Transit & Railway Perimeter',
    category: 'higher-concern',
    coords: { latitude: 28.659, longitude: 77.221 },
    description: 'High-concern zone with dim lighting, isolated passages, and evening caution.',
  },
  warning: {
    id: 'warning',
    name: 'Simulated Warning Zone',
    areaId: 'area-delhi-hauz-khas',
    areaName: 'Hauz Khas Village & Environs',
    category: 'caution',
    coords: { latitude: 28.552, longitude: 77.196 },
    description: 'Caution zone with mixed community feedback and night illumination concerns.',
  },
  safe: {
    id: 'safe',
    name: 'Simulated Safe Zone',
    areaId: 'area-delhi-cp',
    areaName: 'Connaught Place (Inner & Outer Circle)',
    category: 'generally-positive',
    coords: { latitude: 28.630, longitude: 77.218 },
    description: 'Generally positive zone with consistent foot traffic and commercial presence.',
  },
  outside: {
    id: 'outside',
    name: 'Outside Monitored Areas',
    areaId: null,
    areaName: 'Unmonitored Geographic Coordinates',
    category: 'outside',
    coords: { latitude: 0.0, longitude: 0.0 },
    description: 'Neutral baseline outside any defined Awarely canonical area boundaries.',
  },
}

export interface SimulationResult {
  zone: DemoZoneDefinition
  coords: Coordinates
  event: GeofenceAreaEntryEvent | null
  alertTriggered: boolean
  suppressionReason?: string
  currentAreaId: string | null
  timestamp: number
}

export interface ContributingReportDetail {
  id: string
  rating: number
  normalizedScore: number
  timeContext: string
  ageHours: number
  recencyWeight: number
  credibilityWeight: number
  effectiveWeight: number
  isIncident: boolean
  tags: string[]
  isDemo: boolean
}

export interface CalculationExplanation {
  area: {
    id: string
    name: string
    city: string
  }
  reportCount: {
    raw: number
    effectiveVolume: number
    demoCount: number
    communityCount: number
  }
  currentTimeContext: {
    currentHour: number
    resolvedContext: 'day' | 'evening' | 'night'
  }
  relevantReports: ContributingReportDetail[]
  recencyWeights: {
    formula: string
    generalHalfLifeHours: number
    incidentHalfLifeHours: number
  }
  contextWeights: {
    dayWeight: number
    eveningWeight: number
    nightWeight: number
  }
  calculatedScore: {
    overall: number | null
    dayScore: number
    eveningScore: number
    nightScore: number
  }
  confidence: {
    level: string
    score: number
    consistencyScore: number
    stdDev: number
    rationale: string
  }
  freshness: {
    lastReportAt: string | null
    freshnessLabel: string
  }
  selectedSafetyState: string
  stateReason: string
}

const DEMO_REPORTS_STORAGE_KEY = 'awarely_dev_demo_reports'

export class DevToolsService {
  private currentSimulatedZoneKey: 'danger' | 'warning' | 'safe' | 'outside' | null = null
  private currentSimulatedCoords: Coordinates | null = null

  private inMemoryDemoReports: Report[] = []

  // ── 1. ZONE SIMULATION (Uses REAL Production Pipeline) ───────────────

  /**
   * Run the real production location pipeline with simulated coordinates.
   * NEVER uses a separate fake alert implementation!
   */
  simulateZone(
    zoneKey: 'danger' | 'warning' | 'safe' | 'outside',
    monitoredAreas: Area[],
    nowMs: number = Date.now(),
  ): SimulationResult {
    const zone = DEMO_ZONES[zoneKey]
    this.currentSimulatedZoneKey = zoneKey
    this.currentSimulatedCoords = zone.coords

    const previousAreaId = locationAwarenessService.getCurrentAreaId()

    // ── RUN REAL PRODUCTION ALERT PIPELINE ──
    const event = locationAwarenessService.processLocationUpdate(
      zone.coords,
      monitoredAreas,
      nowMs,
    )

    let suppressionReason: string | undefined

    if (!event) {
      if (zoneKey === 'outside') {
        suppressionReason = 'User is outside monitored areas. No area entry event.'
      } else if (previousAreaId === zone.areaId) {
        suppressionReason = 'Once-per-entry invariant: user is already inside this area. Repeated alert suppressed.'
      } else {
        suppressionReason = 'Location update did not trigger an event.'
      }
    } else if (!event.alertTriggered) {
      if (event.type === 'EXIT') {
        suppressionReason = 'Exited monitored area to neutral space.'
      } else if (zone.category === 'generally-positive') {
        suppressionReason = 'Positive feedback zone. Production pipeline only alerts on higher-concern or caution.'
      } else if (!locationAwarenessService.isAlertActive(nowMs)) {
        suppressionReason = 'Alerts are globally disabled or paused by user preferences.'
      } else {
        suppressionReason = 'Area is currently on cooldown (cooldown active).'
      }
    }

    return {
      zone,
      coords: zone.coords,
      event,
      alertTriggered: event?.alertTriggered ?? false,
      suppressionReason,
      currentAreaId: locationAwarenessService.getCurrentAreaId(),
      timestamp: nowMs,
    }
  }

  /** Get current simulated zone state */
  getCurrentSimulationState(): {
    zoneKey: 'danger' | 'warning' | 'safe' | 'outside' | null
    zone: DemoZoneDefinition | null
    coords: Coordinates | null
  } {
    return {
      zoneKey: this.currentSimulatedZoneKey,
      zone: this.currentSimulatedZoneKey ? DEMO_ZONES[this.currentSimulatedZoneKey] : null,
      coords: this.currentSimulatedCoords,
    }
  }

  /**
   * Clear all alert cooldowns so developers can immediately re-trigger alerts.
   */
  clearAlertCooldowns(): void {
    locationAwarenessService.clearCooldowns()
    try {
      sessionStorage.removeItem('awarely_last_manual_unsafe_ms')
    } catch {
      // Ignore
    }
  }

  /**
   * Reset simulation state and clear location state.
   */
  resetSimulation(monitoredAreas: Area[]): SimulationResult {
    locationAwarenessService.resetState()
    this.currentSimulatedZoneKey = 'outside'
    this.currentSimulatedCoords = DEMO_ZONES.outside.coords

    const event = locationAwarenessService.processLocationUpdate(
      DEMO_ZONES.outside.coords,
      monitoredAreas,
    )

    return {
      zone: DEMO_ZONES.outside,
      coords: DEMO_ZONES.outside.coords,
      event,
      alertTriggered: false,
      suppressionReason: 'Simulation reset to neutral coordinates.',
      currentAreaId: null,
      timestamp: Date.now(),
    }
  }

  // ── 2. DEMO DATA GENERATION & ISOLATION ─────────────────────────────

  /**
   * Generate realistic demo reports strictly isolated with `isDemo: true`.
   */
  generateDemoReports(
    areaId: string,
    areaName: string,
    template: 'danger' | 'caution' | 'safe' = 'danger',
    count: number = 6,
  ): Report[] {
    const newReports: Report[] = []
    const now = Date.now()

    for (let i = 0; i < count; i++) {
      const minutesAgo = (i + 1) * 45 // staggered recency
      let rating = 1
      let tags: string[] = []
      let note = 'Demo generated observation'
      let timeContext: 'day' | 'evening' | 'night' = 'night'

      if (template === 'danger') {
        rating = Math.random() > 0.4 ? 1 : 2
        tags = ['Poor lighting', 'Isolated', 'Felt uncomfortable']
        note = 'DEMO: Intermittent street lighting and minimal foot traffic in side alleys.'
        timeContext = 'night'
      } else if (template === 'caution') {
        rating = Math.random() > 0.5 ? 2 : 3
        tags = ['Poor lighting', 'Crowded']
        note = 'DEMO: Moderate congestion around transit exit, lighting varies by lane.'
        timeContext = i % 2 === 0 ? 'evening' : 'night'
      } else {
        rating = Math.random() > 0.2 ? 5 : 4
        tags = ['Well-lit', 'High foot traffic', 'Police presence', 'Businesses open']
        note = 'DEMO: Wide open promenade, active retail shops, and frequent patrols.'
        timeContext = 'day'
      }

      newReports.push({
        id: `demo-${areaId}-${Date.now()}-${i}`,
        areaId,
        areaName,
        reporterUid: 'dev-simulator',
        reporterRef: 'demo-user-ref',
        isAnonymous: false,
        rating,
        timeContext,
        tags,
        note,
        createdAt: Timestamp.fromMillis(now - minutesAgo * 60 * 1000),
        moderationStatus: 'approved',
        weight: 1.0,
        platform: 'web',
        isDemo: true, // STRICTLY MARKED AS DEMO
        source: 'demo',
      })
    }

    // Persist to in-memory store and localStorage if available
    this.inMemoryDemoReports = [...this.inMemoryDemoReports, ...newReports]
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(DEMO_REPORTS_STORAGE_KEY)
        const existing: Report[] = raw ? JSON.parse(raw) : []
        const updated = [...existing, ...newReports]
        localStorage.setItem(DEMO_REPORTS_STORAGE_KEY, JSON.stringify(updated))
      }
    } catch {
      // Ignore
    }

    return newReports
  }

  /**
   * Retrieve all demo reports from isolated storage.
   */
  getAllDemoReports(areaId?: string): Report[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(DEMO_REPORTS_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          const reports: Report[] = Array.isArray(parsed)
            ? parsed.map((r: any) => ({
                ...r,
                createdAt: r.createdAt ? toFirestoreTimestamp(r.createdAt) : undefined,
                submittedAt: r.submittedAt ? toFirestoreTimestamp(r.submittedAt) : undefined,
                expiresAt: r.expiresAt ? toFirestoreTimestamp(r.expiresAt) : undefined,
              }))
            : []
          return areaId ? reports.filter((r) => r.areaId === areaId) : reports
        }
      }
    } catch {
      // Fallback to in-memory
    }
    return areaId
      ? this.inMemoryDemoReports.filter((r) => r.areaId === areaId)
      : [...this.inMemoryDemoReports]
  }

  /**
   * Delete ALL demo reports to prevent mixing with real production stats.
   */
  deleteAllDemoData(): { deletedCount: number } {
    const count = this.getAllDemoReports().length
    this.inMemoryDemoReports = []
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(DEMO_REPORTS_STORAGE_KEY)
      }
    } catch {
      // Ignore
    }
    return { deletedCount: count }
  }

  // ── 3. EXPLAIN CALCULATION BREAKDOWN ────────────────────────────────

  /**
   * Detailed mathematical explainability breakdown for an area's score.
   */
  explainCalculation(
    area: Area,
    reports: Report[],
    nowMs: number = Date.now(),
  ): CalculationExplanation {
    const config = DEFAULT_SCORING_CONFIG
    const currentHour = new Date(nowMs).getHours()
    let resolvedTimeContext: 'day' | 'evening' | 'night' = 'day'
    if (currentHour >= 18 && currentHour < 22) {
      resolvedTimeContext = 'evening'
    } else if (currentHour >= 22 || currentHour < 6) {
      resolvedTimeContext = 'night'
    }

    // Run scoring engine
    const scoreResult: AreaScoreResult = calculateAreaSafetyScore(reports, nowMs, config)

    // Analyze individual contributing reports
    const demoReportsCount = reports.filter((r) => r.isDemo === true).length
    const communityReportsCount = reports.length - demoReportsCount

    const relevantReports: ContributingReportDetail[] = reports.map((rep) => {
      const repTime = getReportTimestampMs(rep, nowMs)
      const ageHours = Math.max(0, (nowMs - repTime) / (3600 * 1000))
      const tags = rep.tags || rep.observations || []
      const isIncident = tags.some((t) => config.recency.incidentTags.includes(t))
      const halfLife = isIncident
        ? config.recency.incidentHalfLifeHours
        : config.recency.generalHalfLifeHours
      const recencyWeight = Math.round(Math.exp(-ageHours / halfLife) * 1000) / 1000
      const credibilityWeight = rep.weight ?? 1.0
      const effectiveWeight = Math.round(recencyWeight * credibilityWeight * 1000) / 1000
      const normalizedScore = normalizeRating(rep.rating)

      return {
        id: rep.id,
        rating: rep.rating,
        normalizedScore,
        timeContext: rep.timeContext || rep.visitTime || 'day',
        ageHours: Math.round(ageHours * 10) / 10,
        recencyWeight,
        credibilityWeight,
        effectiveWeight,
        isIncident,
        tags,
        isDemo: rep.isDemo === true,
      }
    })

    // Human-readable reason for the selected safety state
    let stateReason = ''
    if (!scoreResult.hasSufficientData) {
      stateReason = `Insufficient community reports (${reports.length} total, need ≥ ${config.evidence.minReports} reports and ≥ ${config.evidence.minEffectiveWeight} effective volume). System safely defaults to 'insufficient-data'.`
    } else if (scoreResult.safetyState === 'higher-concern') {
      stateReason = `Calculated score of ${scoreResult.overallScore?.toFixed(
        1,
      )} is below ${config.safetyStates.higherConcernMax} with ${
        scoreResult.confidence
      } confidence. Community observations reflect elevated concern, particularly during ${
        scoreResult.timeScores.night < 50 ? 'night hours' : 'recent visits'
      }.`
    } else if (scoreResult.safetyState === 'caution') {
      stateReason = `Calculated score of ${scoreResult.overallScore?.toFixed(1)} sits between ${
        config.safetyStates.higherConcernMax
      } and ${config.safetyStates.cautionMax}. Mixed perceptions suggest situational caution.`
    } else {
      stateReason = `Calculated score of ${scoreResult.overallScore?.toFixed(1)} meets or exceeds ${
        config.safetyStates.positiveMin
      }. Consistent positive community perception indicates comfort.`
    }

    // Freshness
    let lastReportAtStr: string | null = null
    let freshnessLabel = 'No recent reports'
    if (reports.length > 0) {
      const timestamps = reports
        .map((r) => getReportTimestampMs(r, 0))
        .filter((t) => t > 0)
      if (timestamps.length > 0) {
        const newest = Math.max(...timestamps)
        const hoursAgo = Math.floor((nowMs - newest) / (3600 * 1000))
        lastReportAtStr = new Date(newest).toLocaleString()
        freshnessLabel =
          hoursAgo < 24
            ? `Updated ${hoursAgo}h ago (Fresh)`
            : hoursAgo < 168
            ? `Updated ${Math.floor(hoursAgo / 24)}d ago (Moderate)`
            : 'Older community data (> 7 days)'
      }
    }

    return {
      area: {
        id: area.id,
        name: area.name,
        city: area.city,
      },
      reportCount: {
        raw: reports.length,
        effectiveVolume: scoreResult.effectiveVolume,
        demoCount: demoReportsCount,
        communityCount: communityReportsCount,
      },
      currentTimeContext: {
        currentHour,
        resolvedContext: resolvedTimeContext,
      },
      relevantReports,
      recencyWeights: {
        formula: 'weight = exp(-ageHours / halfLifeHours)',
        generalHalfLifeHours: config.recency.generalHalfLifeHours,
        incidentHalfLifeHours: config.recency.incidentHalfLifeHours,
      },
      contextWeights: {
        dayWeight: config.timeContextWeights.day,
        eveningWeight: config.timeContextWeights.evening,
        nightWeight: config.timeContextWeights.night,
      },
      calculatedScore: {
        overall: scoreResult.overallScore,
        dayScore: scoreResult.timeScores.day,
        eveningScore: scoreResult.timeScores.evening,
        nightScore: scoreResult.timeScores.night,
      },
      confidence: {
        level: scoreResult.confidence,
        score: Math.round(scoreResult.confidenceScore * 100) / 100,
        consistencyScore: Math.round(scoreResult.consistencyScore * 100) / 100,
        stdDev: Math.round(scoreResult.uncertaintyScore * 10) / 10,
        rationale: `Sample effective volume (${scoreResult.effectiveVolume}) combined with perception variance (std dev: ${scoreResult.uncertaintyScore.toFixed(
          1,
        )}) yields ${scoreResult.confidence} confidence.`,
      },
      freshness: {
        lastReportAt: lastReportAtStr,
        freshnessLabel,
      },
      selectedSafetyState: scoreResult.safetyState,
      stateReason,
    }
  }
}

export const devToolsService = new DevToolsService()
