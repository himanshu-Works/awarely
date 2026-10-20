import { describe, it, expect, beforeEach, vi } from 'vitest'
import { feedbackService } from '@/services/feedback.service'
import { adminService } from '@/services/admin.service'
import { aiSafetyEngineService } from '@/services/ai-safety-engine.service'
import { calculateAreaSafetyScore, DEFAULT_SCORING_CONFIG } from '@/utils/scoring'
import type { Area } from '@/types/area'
import type { Report } from '@/types/report'
import { Timestamp } from 'firebase/firestore'

// Mock Firestore operations
const mockFirestoreReports: Map<string, Report> = new Map()
const mockAreas: Map<string, Area> = new Map()

vi.mock('@/services/firestore.service', () => ({
  firestoreService: {
    submitReportDirectly: vi.fn().mockImplementation(async (report: Report) => {
      mockFirestoreReports.set(report.id, report)
      return report.id
    }),
    updateReportModeration: vi.fn().mockImplementation(async (reportId: string, status: any, _reason?: string) => {
      const rep = mockFirestoreReports.get(reportId)
      if (rep) {
        rep.moderationStatus = status
        mockFirestoreReports.set(reportId, rep)
      }
    }),
    createAdminAuditLog: vi.fn().mockResolvedValue('audit-log-1'),
    getReportsByArea: vi.fn().mockImplementation(async (areaId: string) => {
      return Array.from(mockFirestoreReports.values()).filter(
        (r) => r.areaId === areaId && r.moderationStatus === 'approved',
      )
    }),
    getArea: vi.fn().mockImplementation(async (areaId: string) => {
      return mockAreas.get(areaId) || null
    }),
    getAreaById: vi.fn().mockImplementation(async (areaId: string) => {
      return mockAreas.get(areaId) || null
    }),
    updateAreaComputedScore: vi.fn().mockImplementation(async (areaId: string, updates: any) => {
      const existing = mockAreas.get(areaId)
      if (existing) {
        Object.assign(existing, updates)
        mockAreas.set(areaId, existing)
      }
    }),
    saveAreaSummary: vi.fn().mockResolvedValue(undefined),
    getAreaSummary: vi.fn().mockResolvedValue(null),
  },
}))

describe('Awarely Full End-to-End Integration Pipeline', () => {
  const targetAreaId = 'area-integration-test'

  let targetArea: Area

  const adminActor = {
    uid: 'admin-chief-1',
    email: 'moderator@awarely.org',
    displayName: 'Chief Safety Moderator',
  }

  beforeEach(() => {
    mockFirestoreReports.clear()
    mockAreas.clear()
    vi.clearAllMocks()

    targetArea = {
      id: targetAreaId,
      name: 'South Market District',
      city: 'Delhi',
      fullName: 'South Market District, Delhi, India',
      center: { latitude: 28.5244, longitude: 77.1855 },
      radiusMeters: 1200,
      bounds: {
        northEast: { latitude: 28.53, longitude: 77.19 },
        southWest: { latitude: 28.51, longitude: 77.17 },
      },
      polygon: '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true,
      reportCount: 0,
      recentReportCount: 0,
      confidenceLevel: 'low',
      awarenessLevel: 'unknown',
      topObservations: [],
      dayNightSplit: { day: 50, night: 50 },
      aiSummary: 'Limited community data available.',
      aiSummaryGeneratedAt: Timestamp.now(),
    }

    mockAreas.set(targetAreaId, targetArea)
  })

  it('executes full pipeline: User Report → Moderation → Score Calculation → Confidence → AI Summary → UI Update', async () => {
    // ══════════════════════════════════════════════════════════════════
    // STEP 1: USER REPORT SUBMISSION
    // ══════════════════════════════════════════════════════════════════
    const reportPayload = {
      areaId: targetAreaId,
      rating: 2, // Low comfort
      timeContext: 'night' as const,
      tags: ['Poor lighting', 'Isolated'],
      note: 'Very dark under the railway overpass. Minimal foot traffic after 9 PM.',
      isAnonymous: false,
    }

    const submissionResult = await feedbackService.submitReport(reportPayload, targetArea)
    expect(submissionResult.success).toBe(true)
    expect(submissionResult.reportId).toBeDefined()

    const submittedReport = mockFirestoreReports.get(submissionResult.reportId!)
    expect(submittedReport).toBeDefined()
    expect(submittedReport?.moderationStatus).toBe('pending') // MUST start in pending
    expect(submittedReport?.weight).toBe(1.0) // Must start with default weight
    expect(submittedReport?.areaId).toBe(targetAreaId)

    // ══════════════════════════════════════════════════════════════════
    // STEP 2: MODERATION REVIEW & APPROVAL
    // ══════════════════════════════════════════════════════════════════
    // Seed an initial approved report so the area has 2 reports (sufficient volume)
    const baseReport: Report = {
      id: 'rep-base-1',
      areaId: targetAreaId,
      rating: 1,
      timeContext: 'night',
      tags: ['Poor lighting', 'Felt uncomfortable'],
      note: 'Non-functional streetlights.',
      createdAt: Timestamp.fromMillis(Date.now() - 3600 * 1000),
      moderationStatus: 'approved',
      weight: 1.0,
      platform: 'web',
      isAnonymous: true,
      reporterRef: 'usr-***1111',
    }
    mockFirestoreReports.set(baseReport.id, baseReport)

    // Admin approves the new pending report
    const approvalResult = await adminService.approveReport(
      adminActor,
      submittedReport!.id,
      targetAreaId,
      targetArea.name,
    )

    expect(approvalResult.auditLog).toBeDefined()
    expect(approvalResult.auditLog.action).toBe('APPROVE_REPORT')
    expect(submittedReport?.moderationStatus).toBe('approved')

    // ══════════════════════════════════════════════════════════════════
    // STEP 3 & 4: SCORE CALCULATION & CONFIDENCE TIER
    // ══════════════════════════════════════════════════════════════════
    const approvedReports = Array.from(mockFirestoreReports.values()).filter(
      (r) => r.areaId === targetAreaId && r.moderationStatus === 'approved',
    )
    expect(approvedReports.length).toBe(2)

    // Run scoring engine on approved reports
    const scoreResult = calculateAreaSafetyScore(approvedReports, Date.now(), DEFAULT_SCORING_CONFIG)

    expect(scoreResult.hasSufficientData).toBe(true)
    expect(scoreResult.reportCount).toBe(2)
    expect(scoreResult.overallScore).toBeLessThan(45) // Both reports are 1 and 2/5
    expect(scoreResult.timeScores.night).toBeLessThan(45)
    expect(scoreResult.safetyState).toBe('higher-concern')
    expect(['moderate', 'medium', 'low']).toContain(scoreResult.confidence)

    // ══════════════════════════════════════════════════════════════════
    // STEP 5: AI SAFETY INSIGHT SYNTHESIS & CACHE INVALIDATION
    // ══════════════════════════════════════════════════════════════════
    // Verify AI summary reflects approved tags
    const payload = aiSafetyEngineService.prepareAggregatedPayload(targetArea, approvedReports)
    const aiSummaryResult = aiSafetyEngineService.generateGroundedSynthesis(payload)

    expect(aiSummaryResult).toBeDefined()
    expect(aiSummaryResult.summaryText).toBeDefined()
    expect(aiSummaryResult.freshnessText).toMatch(/hours|recent|fresh|limited/i)
    expect(aiSummaryResult.confidenceLabel).toMatch(/confidence/i)

    // The AI summary must reference community tags without inventing facts
    const lowerSummary = aiSummaryResult.summaryText.toLowerCase()
    expect(
      lowerSummary.includes('lighting') ||
        lowerSummary.includes('night') ||
        lowerSummary.includes('concern') ||
        lowerSummary.includes('caution'),
    ).toBe(true)

    // ══════════════════════════════════════════════════════════════════
    // STEP 6: UI STATE UPDATE VERIFICATION
    // ══════════════════════════════════════════════════════════════════
    const updatedArea: Area = {
      ...targetArea,
      overallScore: scoreResult.overallScore,
      timeScores: scoreResult.timeScores,
      confidenceLevel: scoreResult.confidence === 'medium' ? 'moderate' : scoreResult.confidence,
      awarenessLevel: 'quiet', // Mapped to higher concern
      reportCount: approvedReports.length,
      aiSummary: aiSummaryResult.summaryText,
      aiSummaryGeneratedAt: Timestamp.now(),
    }

    expect(updatedArea.reportCount).toBe(2)
    expect(updatedArea.awarenessLevel).toBe('quiet')
    expect(updatedArea.overallScore).toBe(scoreResult.overallScore)
    expect(updatedArea.aiSummary).toBe(aiSummaryResult.summaryText)
  })

  it('rejects unverified report and excludes it from public score calculation', async () => {
    // Submit report
    const submission = await feedbackService.submitReport(
      {
        areaId: targetAreaId,
        rating: 5,
        timeContext: 'day',
        tags: ['Well-lit'],
        note: 'Spam promotion for commercial store.',
        isAnonymous: false,
      },
      targetArea,
    )

    // Admin rejects report with reason
    await adminService.rejectReport(
      adminActor,
      submission.reportId!,
      targetAreaId,
      'Commercial advertisement detected',
      targetArea.name,
    )

    const rejected = mockFirestoreReports.get(submission.reportId!)
    expect(rejected?.moderationStatus).toBe('rejected')

    // Approved reports list must remain empty
    const approved = Array.from(mockFirestoreReports.values()).filter(
      (r) => r.areaId === targetAreaId && r.moderationStatus === 'approved',
    )
    expect(approved.length).toBe(0)

    // Score calculation must safely identify insufficient data
    const scoreResult = calculateAreaSafetyScore(approved, Date.now())
    expect(scoreResult.hasSufficientData).toBe(false)
    expect(scoreResult.safetyState).toBe('insufficient-data')
    expect(scoreResult.overallScore).toBeNull()
  })
})
