/**
 * Awarely Admin Governance & Moderation Service
 *
 * Provides administrative controls for community reports moderation:
 * 1. Report review (pending, approved, rejected, flagged)
 * 2. Moderation actions (approve, reject, flag, remove)
 * 3. Immutable audit logging for every administrative action
 * 4. Automatic downstream recalculation (score recomputation, confidence update, AI summary invalidation)
 *
 * STRICT GOVERNANCE & PRIVACY INVARIANTS:
 * - Administrators CANNOT fabricate or invent community reports.
 * - Administrators CANNOT bypass the fundamental privacy model: no raw GPS routes,
 *   unmasked user IPs, or private credentials are ever exposed.
 * - Reporter references remain pseudonymized (e.g. `usr-***82a`).
 */

import { Timestamp } from 'firebase/firestore'
import { firestoreService } from './firestore.service'
import { scoringService } from './scoring.service'
import { aiSafetyEngineService } from './ai-safety-engine.service'
import type { Report } from '@/types/report'
import type { AdminAuditLog, AdminActionType } from '@/types/admin'

export interface AdminActor {
  uid: string
  email: string
  displayName?: string | null
}

export interface ModerationStats {
  totalReports: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  flaggedCount: number
}

// In-memory audit log store for prototype fallback
const inMemoryAuditLogs: AdminAuditLog[] = []

export class AdminService {
  /**
   * Log an administrative action to the immutable audit collection.
   */
  async logAction(
    admin: AdminActor,
    action: AdminActionType,
    affectedEntity: string,
    options?: {
      areaId?: string
      areaName?: string
      details?: string
      reason?: string
    },
  ): Promise<AdminAuditLog> {
    const now = Timestamp.now()
    const logData: Omit<AdminAuditLog, 'id'> = {
      adminUid: admin.uid,
      adminEmail: admin.email,
      adminDisplayName: admin.displayName || 'Administrator',
      action,
      affectedEntity,
      areaId: options?.areaId,
      areaName: options?.areaName,
      details: options?.details,
      reason: options?.reason,
      timestamp: now,
    }

    let id = `audit-${Date.now()}`
    try {
      id = await firestoreService.createAdminAuditLog(logData)
    } catch {
      // Fallback in-memory
    }

    const log: AdminAuditLog = { id, ...logData }
    inMemoryAuditLogs.unshift(log)
    return log
  }

  /**
   * Fetch recent administrative audit logs.
   */
  async getAuditLogs(maxCount = 50): Promise<AdminAuditLog[]> {
    try {
      const logs = await firestoreService.getAdminAuditLogs(maxCount)
      if (logs.length > 0) return logs
    } catch {
      // Fallback to in-memory
    }
    return inMemoryAuditLogs.slice(0, maxCount)
  }

  /**
   * Approve a community report.
   * Downstream: recalculates area score, updates confidence, and invalidates AI summary.
   */
  async approveReport(
    admin: AdminActor,
    reportId: string,
    areaId: string,
    areaName?: string,
  ): Promise<{ auditLog: AdminAuditLog; scoreResult?: unknown }> {
    // 1. Update report moderation status
    try {
      await firestoreService.updateReportModeration(reportId, 'approved')
    } catch {
      // Local fallback handled in UI state
    }

    // 2. Log action in audit trail
    const auditLog = await this.logAction(
      admin,
      'APPROVE_REPORT',
      `reports/${reportId}`,
      {
        areaId,
        areaName,
        details: 'Approved community report for inclusion in safety scoring.',
      },
    )

    // 3. Downstream recalculation of area score & invalidation of AI summary
    aiSafetyEngineService.invalidateCache(areaId)
    let scoreResult = undefined
    try {
      scoreResult = await scoringService.recalculateAreaScore(areaId)
    } catch {
      // Handle demo/offline gracefully
    }

    return { auditLog, scoreResult }
  }

  /**
   * Reject a community report.
   * Downstream: recalculates area score, updates confidence, and invalidates AI summary.
   */
  async rejectReport(
    admin: AdminActor,
    reportId: string,
    areaId: string,
    reason: string = 'Violates community contribution veracity standards',
    areaName?: string,
  ): Promise<{ auditLog: AdminAuditLog; scoreResult?: unknown }> {
    // 1. Update report status
    try {
      await firestoreService.updateReportModeration(reportId, 'rejected', reason)
    } catch {
      // Local fallback handled in UI state
    }

    // 2. Log action in audit trail
    const auditLog = await this.logAction(
      admin,
      'REJECT_REPORT',
      `reports/${reportId}`,
      {
        areaId,
        areaName,
        details: 'Rejected report from public consensus.',
        reason,
      },
    )

    // 3. Downstream recalculation
    aiSafetyEngineService.invalidateCache(areaId)
    let scoreResult = undefined
    try {
      scoreResult = await scoringService.recalculateAreaScore(areaId)
    } catch {
      // Handle demo/offline gracefully
    }

    return { auditLog, scoreResult }
  }

  /**
   * Flag inappropriate content with an administrative reason.
   */
  async flagReport(
    admin: AdminActor,
    reportId: string,
    areaId: string,
    reason: string,
    areaName?: string,
  ): Promise<AdminAuditLog> {
    try {
      await firestoreService.updateReportModeration(reportId, 'flagged', reason)
    } catch {
      // Local fallback
    }

    return this.logAction(
      admin,
      'FLAG_REPORT',
      `reports/${reportId}`,
      {
        areaId,
        areaName,
        details: 'Report flagged for content violation review.',
        reason,
      },
    )
  }

  /**
   * Remove inappropriate content where appropriate.
   */
  async removeReport(
    admin: AdminActor,
    reportId: string,
    areaId: string,
    reason: string,
    areaName?: string,
  ): Promise<{ auditLog: AdminAuditLog; scoreResult?: unknown }> {
    try {
      await firestoreService.updateReportModeration(reportId, 'rejected', reason)
    } catch {
      // Local fallback
    }

    const auditLog = await this.logAction(
      admin,
      'REMOVE_REPORT',
      `reports/${reportId}`,
      {
        areaId,
        areaName,
        details: 'Inappropriate content removed by administrator.',
        reason,
      },
    )

    aiSafetyEngineService.invalidateCache(areaId)
    let scoreResult = undefined
    try {
      scoreResult = await scoringService.recalculateAreaScore(areaId)
    } catch {
      // Offline fallback
    }

    return { auditLog, scoreResult }
  }

  /**
   * Calculate moderation statistics across a list of reports.
   */
  computeStatistics(reports: Report[]): ModerationStats {
    let pendingCount = 0
    let approvedCount = 0
    let rejectedCount = 0
    let flaggedCount = 0

    reports.forEach((r) => {
      const status = r.moderationStatus || 'pending'
      if (status === 'pending') pendingCount++
      else if (status === 'approved') approvedCount++
      else if (status === 'rejected') rejectedCount++
      else if (status === 'flagged') flaggedCount++
    })

    return {
      totalReports: reports.length,
      pendingCount,
      approvedCount,
      rejectedCount,
      flaggedCount,
    }
  }

  /**
   * Privacy sanitizer: ensures private user identifiers are never leaked to the admin UI.
   * Masks reporter UID into a pseudonymized reference.
   */
  sanitizeReportForAdmin(report: Report): Report {
    let maskedRef = report.reporterRef
    if (!maskedRef && report.reporterUid) {
      maskedRef = `usr-***${report.reporterUid.slice(-4)}`
    } else if (!maskedRef) {
      maskedRef = 'Anonymous Contributor'
    }

    return {
      ...report,
      reporterUid: null, // Strictly nulled out for privacy
      reporterRef: maskedRef,
    }
  }
}

export const adminService = new AdminService()
