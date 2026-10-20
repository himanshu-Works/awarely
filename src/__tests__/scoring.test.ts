import { describe, it, expect } from 'vitest'
import {
  normalizeRating,
  calculateRecencyWeight,
  isIncidentReport,
  computeShrunkScore,
  calculateWeightedStats,
  calculateConfidence,
  classifySafetyState,
  calculateAreaSafetyScore,
  resolveReportTimeContext,
} from '@/utils/scoring'
import type { Report } from '@/types/report'
import { Timestamp } from 'firebase/firestore'

describe('Awarely Safety Scoring Engine', () => {
  // ── 1. BASE SCORE NORMALIZATION ──────────────────────────────────────────
  describe('1. Normalization', () => {
    it('converts discrete 1–5 ratings to continuous 0–100 scale correctly', () => {
      expect(normalizeRating(1)).toBe(0)
      expect(normalizeRating(2)).toBe(25)
      expect(normalizeRating(3)).toBe(50)
      expect(normalizeRating(4)).toBe(75)
      expect(normalizeRating(5)).toBe(100)
    })

    it('clamps values below 1 and above 5', () => {
      expect(normalizeRating(0)).toBe(0)
      expect(normalizeRating(-5)).toBe(0)
      expect(normalizeRating(6)).toBe(100)
      expect(normalizeRating(10)).toBe(100)
    })
  })

  // ── 2. RECENCY & TIME DECAY ──────────────────────────────────────────────
  describe('2. Recency & Time Decay', () => {
    it('calculates recency weight = 1.0 for immediate reports (0 hours old)', () => {
      const weight = calculateRecencyWeight(0, false)
      expect(weight).toBeCloseTo(1.0, 4)
    })

    it('calculates exp(-1) ≈ 0.3679 at age equal to half-life hours', () => {
      // General half-life is 720h
      const generalWeightAtHalfLife = calculateRecencyWeight(720, false)
      expect(generalWeightAtHalfLife).toBeCloseTo(Math.exp(-1), 4)

      // Incident half-life is 72h
      const incidentWeightAtHalfLife = calculateRecencyWeight(72, true)
      expect(incidentWeightAtHalfLife).toBeCloseTo(Math.exp(-1), 4)
    })

    it('decays incident-like reports significantly faster than general reports', () => {
      const ageHours = 72 // 3 days
      const generalWeight = calculateRecencyWeight(ageHours, false) // 72 / 720 = 0.1 -> exp(-0.1) ≈ 0.9048
      const incidentWeight = calculateRecencyWeight(ageHours, true) // 72 / 72 = 1.0 -> exp(-1) ≈ 0.3679

      expect(generalWeight).toBeGreaterThan(0.9)
      expect(incidentWeight).toBeLessThan(0.4)
      expect(incidentWeight).toBeLessThan(generalWeight)
    })

    it('detects incident tags properly', () => {
      expect(isIncidentReport(['Well-lit', 'High foot traffic'])).toBe(false)
      expect(isIncidentReport(['Road blocked'])).toBe(true)
      expect(isIncidentReport(['Accident reported'])).toBe(true)
      expect(isIncidentReport(['Police presence'])).toBe(true)
      expect(isIncidentReport(['Felt uncomfortable'])).toBe(true)
    })
  })

  // ── 3. TIME CONTEXT SEPARATION ───────────────────────────────────────────
  describe('3. Time Context', () => {
    it('resolves time contexts into day, evening, or night', () => {
      expect(resolveReportTimeContext({ timeContext: 'night' })).toBe('night')
      expect(resolveReportTimeContext({ visitTime: 'evening' })).toBe('evening')
      expect(resolveReportTimeContext({ timeContext: 'morning' })).toBe('day')
      expect(resolveReportTimeContext({ visitTime: 'afternoon' })).toBe('day')
      expect(resolveReportTimeContext({ timeContext: 'day' })).toBe('day')
    })

    it('disaggregates day, evening, and night scores independently', () => {
      const now = Date.now()
      const mockReports: Report[] = [
        // 3 positive day reports (rating 5 -> score 100)
        {
          id: 'rep-d1',
          areaId: 'area-1',
          rating: 5,
          timeContext: 'day',
          isAnonymous: true,
          platform: 'web',
          note: null,
          createdAt: Timestamp.fromMillis(now),
        },
        {
          id: 'rep-d2',
          areaId: 'area-1',
          rating: 5,
          timeContext: 'day',
          isAnonymous: true,
          platform: 'web',
          note: null,
          createdAt: Timestamp.fromMillis(now),
        },
        {
          id: 'rep-d3',
          areaId: 'area-1',
          rating: 5,
          timeContext: 'day',
          isAnonymous: true,
          platform: 'web',
          note: null,
          createdAt: Timestamp.fromMillis(now),
        },
        // 3 concern night reports (rating 1 -> score 0)
        {
          id: 'rep-n1',
          areaId: 'area-1',
          rating: 1,
          timeContext: 'night',
          isAnonymous: true,
          platform: 'web',
          note: null,
          createdAt: Timestamp.fromMillis(now),
        },
        {
          id: 'rep-n2',
          areaId: 'area-1',
          rating: 1,
          timeContext: 'night',
          isAnonymous: true,
          platform: 'web',
          note: null,
          createdAt: Timestamp.fromMillis(now),
        },
        {
          id: 'rep-n3',
          areaId: 'area-1',
          rating: 1,
          timeContext: 'night',
          isAnonymous: true,
          platform: 'web',
          note: null,
          createdAt: Timestamp.fromMillis(now),
        },
      ]

      const result = calculateAreaSafetyScore(mockReports, now)

      // Day score should be high (pulled toward 100)
      expect(result.timeScores.day).toBeGreaterThan(70)
      // Night score should be low (pulled toward 0)
      expect(result.timeScores.night).toBeLessThan(35)
      // Evening had no reports, so it stays at the neutral prior mean (50)
      expect(result.timeScores.evening).toBe(50)
    })
  })

  // ── 4. SINGLE-REPORT SCENARIOS & BAYESIAN SHRINKAGE ──────────────────────
  describe('4. Single-Report Scenarios & Volume Shrinkage', () => {
    it('ensures a single 5-star report shrinks toward the neutral prior and does not dominate', () => {
      // Prior mean 50, weight 3; 1 report with score 100, weight 1
      // (3 * 50 + 1 * 100) / (3 + 1) = 250 / 4 = 62.5
      const items = [{ score: 100, weight: 1.0 }]
      const shrunk = computeShrunkScore(items)

      expect(shrunk).toBe(62.5)
      expect(shrunk).toBeLessThan(100) // Does not dominate to 100!
    })

    it('ensures a single 1-star report shrinks toward the neutral prior and does not dominate', () => {
      // (3 * 50 + 1 * 0) / (3 + 1) = 150 / 4 = 37.5
      const items = [{ score: 0, weight: 1.0 }]
      const shrunk = computeShrunkScore(items)

      expect(shrunk).toBe(37.5)
      expect(shrunk).toBeGreaterThan(0) // Does not drop to 0!
    })

    it('classifies a single-report scenario as insufficient data with low confidence', () => {
      const now = Date.now()
      const singleReport: Report[] = [
        {
          id: 'rep-single',
          areaId: 'area-1',
          rating: 5,
          timeContext: 'day',
          isAnonymous: true,
          platform: 'web',
          note: null,
          createdAt: Timestamp.fromMillis(now),
        },
      ]

      const result = calculateAreaSafetyScore(singleReport, now)

      expect(result.hasSufficientData).toBe(false)
      expect(result.safetyState).toBe('insufficient-data')
      expect(result.overallScore).toBeNull() // No definitive score assigned
      expect(result.confidence).toBe('low')
    })
  })

  // ── 5. CONFLICTING REPORTS & CONSISTENCY PENALTY ─────────────────────────
  describe('5. Conflicting Reports & Consistency Penalty', () => {
    it('penalizes confidence when reports strongly conflict without discarding minority opinions', () => {
      // Group A: High consensus (all score 50)
      const consensusItems = [
        { score: 50, weight: 1.0, recencyWeight: 1.0 },
        { score: 50, weight: 1.0, recencyWeight: 1.0 },
        { score: 50, weight: 1.0, recencyWeight: 1.0 },
        { score: 50, weight: 1.0, recencyWeight: 1.0 },
        { score: 50, weight: 1.0, recencyWeight: 1.0 },
        { score: 50, weight: 1.0, recencyWeight: 1.0 },
      ]

      // Group B: Severe conflict (half score 0, half score 100)
      const conflictingItems = [
        { score: 0, weight: 1.0, recencyWeight: 1.0 },
        { score: 0, weight: 1.0, recencyWeight: 1.0 },
        { score: 0, weight: 1.0, recencyWeight: 1.0 },
        { score: 100, weight: 1.0, recencyWeight: 1.0 },
        { score: 100, weight: 1.0, recencyWeight: 1.0 },
        { score: 100, weight: 1.0, recencyWeight: 1.0 },
      ]

      const consensusStats = calculateWeightedStats(consensusItems)
      const conflictingStats = calculateWeightedStats(conflictingItems)

      expect(consensusStats.mean).toBe(50)
      expect(conflictingStats.mean).toBe(50)

      expect(consensusStats.stdDev).toBe(0)
      expect(conflictingStats.stdDev).toBeGreaterThan(45) // High standard deviation

      const confConsensus = calculateConfidence(consensusItems)
      const confConflict = calculateConfidence(conflictingItems)

      // Consistency factor should be much lower for the conflicting group
      expect(confConsensus.consistencyFactor).toBe(1.0)
      expect(confConflict.consistencyFactor).toBeLessThan(0.2)

      // Overall confidence score is penalized
      expect(confConflict.confidenceScore).toBeLessThan(confConsensus.confidenceScore)
    })
  })

  // ── 6. CONFIDENCE CALCULATION ────────────────────────────────────────────
  describe('6. Confidence Calculation', () => {
    it('assigns Low, Medium, and High confidence based on volume, recency, and agreement', () => {
      // Small volume (2 reports) -> low
      const lowItems = [
        { score: 75, weight: 1.0, recencyWeight: 1.0 },
        { score: 75, weight: 1.0, recencyWeight: 1.0 },
      ]
      const lowConf = calculateConfidence(lowItems)
      expect(lowConf.level).toBe('low')

      // Moderate volume (6 reports) -> medium
      const medItems = Array.from({ length: 6 }, () => ({
        score: 75,
        weight: 1.0,
        recencyWeight: 1.0,
      }))
      const medConf = calculateConfidence(medItems)
      expect(medConf.level).toBe('medium')

      // Robust volume (15 recent, consistent reports) -> high
      const highItems = Array.from({ length: 15 }, () => ({
        score: 80,
        weight: 1.0,
        recencyWeight: 1.0,
      }))
      const highConf = calculateConfidence(highItems)
      expect(highConf.level).toBe('high')
    })
  })

  // ── 7. INSUFFICIENT DATA & SAFETY STATES ─────────────────────────────────
  describe('7. Insufficient Data & Safety States', () => {
    it('returns Insufficient Data when reportCount < 2', () => {
      const state0 = classifySafetyState(null, 0, 0)
      expect(state0.isInsufficient).toBe(true)
      expect(state0.state).toBe('insufficient-data')

      const state1 = classifySafetyState(80, 1, 1.0)
      expect(state1.isInsufficient).toBe(true)
      expect(state1.state).toBe('insufficient-data')
    })

    it('returns Insufficient Data when reports are too old (effective weight < 1.5)', () => {
      // 3 reports but heavily decayed (sum of weights = 0.5)
      const stateOld = classifySafetyState(80, 3, 0.5)
      expect(stateOld.isInsufficient).toBe(true)
      expect(stateOld.state).toBe('insufficient-data')
    })

    it('classifies Higher Concern (0 to < 40) when evidence is sufficient', () => {
      const state = classifySafetyState(32, 5, 4.5)
      expect(state.isInsufficient).toBe(false)
      expect(state.state).toBe('higher-concern')
      expect(state.label).toBe('Higher concern')
    })

    it('classifies Caution (40 to < 70) when evidence is sufficient', () => {
      const state = classifySafetyState(55, 6, 5.0)
      expect(state.isInsufficient).toBe(false)
      expect(state.state).toBe('caution')
      expect(state.label).toBe('Caution')
    })

    it('classifies Generally Positive Community Feedback (70 to 100) when evidence is sufficient', () => {
      const state = classifySafetyState(82, 10, 9.2)
      expect(state.isInsufficient).toBe(false)
      expect(state.state).toBe('generally-positive')
      expect(state.label).toBe('Generally positive community feedback')
    })
  })

  // ── 8. DISCLAIMER ATTACHED ───────────────────────────────────────────────
  describe('8. Ethics & Non-Crime Disclaimer', () => {
    it('always includes explicit prototype disclaimer in calculation result', () => {
      const result = calculateAreaSafetyScore([])
      expect(result.disclaimer).toContain('NOT an objective measure of crime or actual safety')
      expect(result.disclaimer).toContain('community-perceived comfort')
    })
  })
})
