import type { Timestamp } from 'firebase/firestore'

export type AdminActionType =
  | 'APPROVE_REPORT'
  | 'REJECT_REPORT'
  | 'FLAG_REPORT'
  | 'REMOVE_REPORT'
  | 'RECALCULATE_SCORE'
  | 'INVALIDATE_AI_SUMMARY'

export interface AdminAuditLog {
  id: string
  adminUid: string
  adminEmail: string
  adminDisplayName?: string
  action: AdminActionType
  affectedEntity: string // e.g. 'reports/rep-123'
  areaId?: string
  areaName?: string
  details?: string
  reason?: string
  timestamp: Timestamp
}
