import { describe, it, expect } from 'vitest'
import {
  aiSafetyEngineService,
  AI_ENGINE_MODEL_VERSION,
  type AggregatedInsightPayload,
} from '@/services/ai-safety-engine.service'
import type { Area } from '@/types/area'
import type { Report } from '@/types/report'
import type { AreaSummaryDoc } from '@/types/area-summary'
import { Timestamp } from 'firebase/firestore'

describe('Awarely AI Safety Insight Engine', () => {
  const baseArea: Area = {
    id: 'area-mumbai-bandra',
    name: 'Bandra West',
    canonicalName: 'Bandra West',
    city: 'Mumbai',
    locality: 'Bandra',
    fullName: 'Bandra West, Mumbai',
    bounds: {
      northEast: { latitude: 19.07, longitude: 72.84 },
      southWest: { latitude: 19.05, longitude: 72.82 },
    },
    polygon: 'POLYGON(...)',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    isActive: true,
    reportCount: 12,
    recentReportCount: 5,
    confidence: 'high',
    confidenceLevel: 'high',
    overallScore: 78,
    timeScores: { day: 85, evening: 75, night: 48 },
    lastReportAt: Timestamp.now(),
    latestReportAt: Timestamp.now(),
    topObservations: ['Well-lit', 'High foot traffic', 'Poor lighting'],
    dayNightSplit: { day: 70, night: 30 },
    awarenessLevel: 'active',
    aiSummary: null,
    aiSummaryGeneratedAt: null,
  }

  // ── 1. FRESHNESS PHRASING ────────────────────────────────────────────────
  describe('1. Freshness Language', () => {
    it('returns "Limited recent community data." when report count is 0', () => {
      expect(aiSafetyEngineService.deriveFreshnessText(0, null)).toBe('Limited recent community data.')
    })

    it('returns "Based on reports from the last 3 hours." when latest report is within 3 hours', () => {
      expect(aiSafetyEngineService.deriveFreshnessText(10, 1.5)).toBe(
        'Based on reports from the last 3 hours.',
      )
      expect(aiSafetyEngineService.deriveFreshnessText(5, 3.0)).toBe(
        'Based on reports from the last 3 hours.',
      )
    })

    it('returns "Based on reports from the last 24 hours." when latest report is within 24 hours', () => {
      expect(aiSafetyEngineService.deriveFreshnessText(8, 12.0)).toBe(
        'Based on reports from the last 24 hours.',
      )
      expect(aiSafetyEngineService.deriveFreshnessText(8, 24.0)).toBe(
        'Based on reports from the last 24 hours.',
      )
    })

    it('returns "No recent reports in the past 12 hours..." when reports are older than 24 hours', () => {
      const text = aiSafetyEngineService.deriveFreshnessText(4, 48.0)
      expect(text).toContain('No recent reports in the past 12 hours')
      expect(text).toContain('2d ago')
    })
  })

  // ── 2. PROMPT TEMPLATE NEGATIVE GUARDRAILS ───────────────────────────────
  describe('2. Server-Side Prompt Negative Guardrails', () => {
    it('embeds all mandatory negative constraints in the prompt template', () => {
      const payload: AggregatedInsightPayload = {
        areaId: 'area-1',
        areaName: 'Downtown',
        city: 'Metropolis',
        reportCount: 15,
        overallScore: 80,
        timeScores: { day: 85, evening: 75, night: 50 },
        confidence: 'high',
        confidenceLabel: 'High confidence',
        observedTagsWithCount: { 'Well-lit': 10, 'High foot traffic': 8 },
        latestReportAgeHours: 2.0,
        disagreementLevel: 'low',
      }

      const prompt = aiSafetyEngineService.buildPromptTemplate(payload)

      // Verify strict negative constraints are present
      expect(prompt.systemInstruction).toContain('DO NOT invent incidents')
      expect(prompt.systemInstruction).toContain('DO NOT predict crimes')
      expect(prompt.systemInstruction).toContain('DO NOT claim certainty')
      expect(prompt.systemInstruction).toContain('DO NOT override community evidence')
      expect(prompt.systemInstruction).toContain('DO NOT create facts that are not present')
      expect(prompt.systemInstruction).toContain('DO NOT identify private individuals')
      expect(prompt.systemInstruction).toContain('structured JSON')
    })
  })

  // ── 3. GUARDRAIL & ANTI-HALLUCINATION VERIFIER ───────────────────────────
  describe('3. Guardrail & Unsupported Fact Verification', () => {
    const validPayload: AggregatedInsightPayload = {
      areaId: 'area-1',
      areaName: 'Pali Hill',
      city: 'Mumbai',
      reportCount: 10,
      overallScore: 75,
      timeScores: { day: 80, evening: 70, night: 50 },
      confidence: 'high',
      confidenceLabel: 'High confidence',
      observedTagsWithCount: { 'Well-lit': 8, 'High foot traffic': 6 },
      latestReportAgeHours: 1.0,
      disagreementLevel: 'low',
    }

    it('approves compliant grounded synthesis matching source observations', () => {
      const validDoc = aiSafetyEngineService.generateGroundedSynthesis(validPayload)
      const check = aiSafetyEngineService.verifyOutputGuardrails(validDoc, validPayload)

      expect(check.isValid).toBe(true)
      expect(check.violationReason).toBeUndefined()
    })

    it('rejects output containing prohibited crime prediction or certainty claims', () => {
      const hallucinatedDoc: AreaSummaryDoc = {
        ...aiSafetyEngineService.generateGroundedSynthesis(validPayload),
        summaryText: 'This neighborhood has a rising crime prediction and is a danger zone after dark.',
      }

      const check = aiSafetyEngineService.verifyOutputGuardrails(hallucinatedDoc, validPayload)
      expect(check.isValid).toBe(false)
      expect(check.violationReason).toContain('prohibited speculative or crime-prediction phrase')
    })

    it('rejects output claiming 100% safety certainty', () => {
      const certaintyDoc: AreaSummaryDoc = {
        ...aiSafetyEngineService.generateGroundedSynthesis(validPayload),
        summaryText: 'This area is guaranteed safe and completely safe for all tourists.',
      }

      const check = aiSafetyEngineService.verifyOutputGuardrails(certaintyDoc, validPayload)
      expect(check.isValid).toBe(false)
      expect(check.violationReason).toContain('prohibited speculative or crime-prediction phrase')
    })

    it('rejects output containing ungrounded observation tags not in source data', () => {
      const ungroundedDoc: AreaSummaryDoc = {
        ...aiSafetyEngineService.generateGroundedSynthesis(validPayload),
        night: {
          summaryText: 'Nighttime report notes.',
          freshnessText: 'Fresh',
          confidenceLabel: 'High confidence',
          comfortScore: 50,
          topObservations: ['Pickpocketing Incident'], // Not in source tags!
        },
      }

      const check = aiSafetyEngineService.verifyOutputGuardrails(ungroundedDoc, validPayload)
      expect(check.isValid).toBe(false)
      expect(check.violationReason).toContain('ungrounded observation tag')
    })

    it('flags failure to communicate low confidence when report volume is sparse (< 2 reports)', () => {
      const sparsePayload: AggregatedInsightPayload = {
        areaId: 'area-sparse',
        areaName: 'Remote Sector',
        city: 'Mumbai',
        reportCount: 0,
        overallScore: null,
        timeScores: { day: 50, evening: 50, night: 50 },
        confidence: 'low',
        confidenceLabel: 'Low confidence',
        observedTagsWithCount: {},
        latestReportAgeHours: null,
        disagreementLevel: 'low',
      }

      // If text fails to mention limited data or low confidence
      const badSparseDoc: AreaSummaryDoc = {
        ...aiSafetyEngineService.generateGroundedSynthesis(sparsePayload),
        summaryText: 'Everything is normal here.',
        day: { ...aiSafetyEngineService.generateGroundedSynthesis(sparsePayload).day, summaryText: 'Active area.' },
        evening: { ...aiSafetyEngineService.generateGroundedSynthesis(sparsePayload).evening, summaryText: 'Active area.' },
        night: { ...aiSafetyEngineService.generateGroundedSynthesis(sparsePayload).night, summaryText: 'Active area.' },
      }

      const check = aiSafetyEngineService.verifyOutputGuardrails(badSparseDoc, sparsePayload)
      expect(check.isValid).toBe(false)
      expect(check.violationReason).toContain('Failed to communicate low confidence')
    })
  })

  // ── 4. SEPARATE TIME CONTEXT BREAKDOWNS ──────────────────────────────────
  describe('4. Time-of-Day Context Breakdowns (Day, Evening, Night)', () => {
    it('generates distinct structured summaries for Day, Evening, and Night', () => {
      const reports: Report[] = [
        {
          id: 'r1',
          areaId: baseArea.id,
          rating: 5,
          timeContext: 'day',
          tags: ['Well-lit', 'High foot traffic'],
          isAnonymous: true,
          platform: 'web',
          note: null,
          createdAt: Timestamp.now(),
        },
        {
          id: 'r2',
          areaId: baseArea.id,
          rating: 2,
          timeContext: 'night',
          tags: ['Poor lighting'],
          isAnonymous: true,
          platform: 'web',
          note: null,
          createdAt: Timestamp.now(),
        },
      ]

      const payload = aiSafetyEngineService.prepareAggregatedPayload(baseArea, reports)
      const synthesis = aiSafetyEngineService.generateGroundedSynthesis(payload)

      // Verify all required structured keys exist
      expect(synthesis.day).toBeDefined()
      expect(synthesis.evening).toBeDefined()
      expect(synthesis.night).toBeDefined()

      // Day breakdown
      expect(synthesis.day.comfortScore).toBe(85)
      expect(synthesis.day.summaryText).toContain('Daytime')

      // Night breakdown
      expect(synthesis.night.comfortScore).toBe(48)
      expect(synthesis.night.summaryText).toContain('caution at night')

      // Metadata
      expect(synthesis.modelVersion).toBe(AI_ENGINE_MODEL_VERSION)
      expect(synthesis.sourceReportCount).toBe(2)
    })
  })
})
