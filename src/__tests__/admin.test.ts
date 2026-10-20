import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdminService } from '@/services/admin.service'
import type { Report } from '@/types/report'
import { Timestamp } from 'firebase/firestore'

// Mock firestoreService and scoringService
vi.mock('@/services/firestore.service', () => ({
  firestoreService: {
    updateReportModeration: vi.fn().mockResolvedValue(undefined),
    createAdminAuditLog: vi.fn().mockImplementation(() => Promise.resolve(`audit-${Date.now()}`)),
    getAdminAuditLogs: vi.fn().mockResolvedValue([]),
    getAllReportsForModeration: vi.fn().mockResolvedValue([]),
    getReportsByArea: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/services/scoring.service', () => ({
  scoringService: {
    recalculateAreaScore: vi.fn().mockResolvedValue({
      areaId: 'area-1',
      scoreResult: {
        overallScore: 68.5,
        confidence: 'high',
        safetyState: 'caution',
      },
      updatedAt: { toMillis: () => Date.now(), toDate: () => new Date() },
    }),
  },
}))

describe('Awarely Admin Governance & Moderation', () => {
  let adminService: AdminService

  const sampleAdmin = {
    uid: 'admin-usr-1',
    email: 'sarah.moderator@awarely.org',
    displayName: 'Sarah Chen (Lead Moderator)',
  }

  const sampleReport: Report = {
    id: 'rep-101',
    areaId: 'area-delhi-rail-corridor',
    areaName: 'Old Delhi Transit & Railway Perimeter',
    rating: 2,
    timeContext: 'night',
    tags: ['Poor lighting', 'Isolated'],
    note: 'Dimly lit pathway with low pedestrian volume.',
    photoUrl: 'https://example.com/photo.jpg',
    createdAt: Timestamp.now(),
    moderationStatus: 'pending',
    weight: 1.0,
    platform: 'web',
    isAnonymous: false,
    reporterUid: 'user-secret-12345',
    reporterRef: 'usr-***2345',
  }

  beforeEach(() => {
    adminService = new AdminService()
    vi.clearAllMocks()
  })

  // ── 1. MODERATION ACTIONS & DOWNSTREAM PIPELINE ───────────────────

  describe('Report Moderation Actions', () => {
    it('approves a report, logs an audit record, and triggers downstream score recalculation', async () => {
      const result = await adminService.approveReport(
        sampleAdmin,
        sampleReport.id,
        sampleReport.areaId,
        sampleReport.areaName,
      )

      expect(result.auditLog).toBeDefined()
      expect(result.auditLog.action).toBe('APPROVE_REPORT')
      expect(result.auditLog.adminUid).toBe(sampleAdmin.uid)
      expect(result.auditLog.affectedEntity).toBe(`reports/${sampleReport.id}`)
      expect(result.scoreResult).toBeDefined()
    })

    it('rejects a report with specified reason and logs an audit record', async () => {
      const reason = 'Unverified claim and promotional language detected'
      const result = await adminService.rejectReport(
        sampleAdmin,
        sampleReport.id,
        sampleReport.areaId,
        reason,
        sampleReport.areaName,
      )

      expect(result.auditLog.action).toBe('REJECT_REPORT')
      expect(result.auditLog.reason).toBe(reason)
      expect(result.auditLog.affectedEntity).toBe(`reports/${sampleReport.id}`)
      expect(result.scoreResult).toBeDefined()
    })

    it('flags a report for inappropriate content review', async () => {
      const reason = 'Suspected coordinated burst or harassment'
      const auditLog = await adminService.flagReport(
        sampleAdmin,
        sampleReport.id,
        sampleReport.areaId,
        reason,
        sampleReport.areaName,
      )

      expect(auditLog.action).toBe('FLAG_REPORT')
      expect(auditLog.reason).toBe(reason)
    })

    it('removes inappropriate content and triggers score recalculation', async () => {
      const reason = 'Offensive profanity in contextual note'
      const result = await adminService.removeReport(
        sampleAdmin,
        sampleReport.id,
        sampleReport.areaId,
        reason,
        sampleReport.areaName,
      )

      expect(result.auditLog.action).toBe('REMOVE_REPORT')
      expect(result.auditLog.reason).toBe(reason)
      expect(result.scoreResult).toBeDefined()
    })
  })

  // ── 2. AUDIT TRAIL LOGGING ─────────────────────────────────────────

  describe('Administrative Audit Trail', () => {
    it('creates and retrieves structured audit logs', async () => {
      await adminService.logAction(
        sampleAdmin,
        'APPROVE_REPORT',
        'reports/rep-202',
        {
          areaId: 'area-mumbai-colaba',
          areaName: 'Colaba Promenade',
          details: 'Verified photo and observational consensus',
        },
      )

      const logs = await adminService.getAuditLogs()
      expect(logs.length).toBeGreaterThan(0)
      const found = logs.find((l) => l.affectedEntity === 'reports/rep-202')
      expect(found).toBeDefined()
      expect(found?.adminEmail).toBe(sampleAdmin.email)
      expect(found?.action).toBe('APPROVE_REPORT')
      expect(found?.timestamp).toBeDefined()
    })
  })

  // ── 3. PRIVACY SANITIZATION & ANTI-FABRICATION ────────────────────

  describe('Privacy Safeguards & Anti-Fabrication', () => {
    it('sanitizes reports for admin view, removing private reporterUid', () => {
      const sanitized = adminService.sanitizeReportForAdmin(sampleReport)

      // Privacy guarantee: raw user ID must be stripped/nulled
      expect(sanitized.reporterUid).toBeNull()
      // Privacy-preserving pseudonymized reference remains
      expect(sanitized.reporterRef).toBe('usr-***2345')
    })

    it('generates a masked pseudonym if reporterRef was missing', () => {
      const unmasked: Report = {
        ...sampleReport,
        reporterUid: 'firebase-user-9988',
        reporterRef: undefined,
      }

      const sanitized = adminService.sanitizeReportForAdmin(unmasked)
      expect(sanitized.reporterUid).toBeNull()
      expect(sanitized.reporterRef).toBe('usr-***9988')
    })

    it('enforces that adminService contains NO fabrication/creation methods for community reports', () => {
      // Invariant check: Administrators cannot fabricate community reports
      const serviceKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(adminService))
      const hasCreateReport = serviceKeys.some((k) =>
        /createReport|fabricateReport|addReport|submitReport/i.test(k),
      )
      expect(hasCreateReport).toBe(false)
    })
  })

  // ── 4. MODERATION STATISTICS ───────────────────────────────────────

  describe('Moderation Statistics Aggregation', () => {
    it('accurately aggregates status counts across report queues', () => {
      const testQueue: Report[] = [
        { ...sampleReport, id: '1', moderationStatus: 'pending' },
        { ...sampleReport, id: '2', moderationStatus: 'pending' },
        { ...sampleReport, id: '3', moderationStatus: 'approved' },
        { ...sampleReport, id: '4', moderationStatus: 'rejected' },
        { ...sampleReport, id: '5', moderationStatus: 'flagged' },
      ]

      const stats = adminService.computeStatistics(testQueue)
      expect(stats.totalReports).toBe(5)
      expect(stats.pendingCount).toBe(2)
      expect(stats.approvedCount).toBe(1)
      expect(stats.rejectedCount).toBe(1)
      expect(stats.flaggedCount).toBe(1)
    })
  })
})
