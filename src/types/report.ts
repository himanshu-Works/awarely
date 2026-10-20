import type { Timestamp } from 'firebase/firestore'

export type ComfortLevel = 'yes' | 'maybe' | 'no'
export type TimeContext = 'day' | 'evening' | 'night' | 'morning' | 'afternoon'
export type VisitTime = TimeContext
export type Platform = 'web' | 'android' | 'ios'
export type ModerationStatus = 'approved' | 'pending' | 'rejected' | 'flagged' | 'archived'

/**
 * Community Report document stored at reports/{reportId} in Firestore.
 *
 * Privacy Guarantees:
 * - Precise location is never stored. Only the coarse areaId is referenced.
 * - Anonymous reports store a salted hashed reporterRef, not the actual user UID.
 */
export interface Report {
  id: string
  areaId: string
  areaName?: string
  reporterUid?: string | null             // Null if submitted anonymously
  reporterRef?: string                   // Privacy-preserving pseudonymized reference
  uid?: string                           // Client convenience alias
  isAnonymous: boolean
  rating: number                         // 1–5 scale
  timeContext?: TimeContext
  visitTime?: TimeContext                // Alias for timeContext
  tags?: string[]                         // Canonical observation tags
  observations?: string[]                // Alias for tags
  customObservation?: string | null
  comfortLevel?: ComfortLevel
  note: string | null
  photoUrl?: string | null
  photoRef?: string | null               // Firebase Storage path alias
  createdAt?: Timestamp
  submittedAt?: Timestamp                // Alias for createdAt
  expiresAt?: Timestamp                  // createdAt + 90 days (auto-expiry)
  moderationStatus?: ModerationStatus    // Server-governed only: 'pending' | 'approved' | 'flagged' | 'archived'
  weight?: number                        // Server-calculated credibility weight (e.g. 1.0)
  platform: Platform
  isDemo?: boolean                       // Explicit flag separating demo reports from real community data
  source?: 'community' | 'demo' | 'seed'
}

/**
 * Payload sent by the client to the validateReport Cloud Function / Feedback Service.
 * Server-side fields (reporterUid, moderationStatus, weight, createdAt, expiresAt)
 * are assigned exclusively by the backend data pipeline.
 */
export interface ReportSubmissionPayload {
  areaId: string
  rating: number                         // 1–5
  timeContext: TimeContext               // 'day' | 'evening' | 'night'
  tags: string[]                         // Safety & context tags
  note?: string | null                   // Max 280 chars
  photoUrl?: string | null               // Optional contextual photo
  isAnonymous?: boolean
  // Compatibility aliases
  observations?: string[]
  customObservation?: string
  comfortLevel?: ComfortLevel
  visitTime?: VisitTime
}

/**
 * Canonical observation tags.
 * Includes all required core tags: Poor lighting, Crowded, Isolated, Road blocked, Accident reported, Police presence, Felt uncomfortable
 */
export const OBSERVATION_TAGS = [
  'Poor lighting',
  'Crowded',
  'Isolated',
  'Road blocked',
  'Accident reported',
  'Police presence',
  'Felt uncomfortable',
  'Well-lit',
  'High foot traffic',
  'Businesses open',
  'Accident or disturbance',
  'Felt comfortable',
  'Low foot traffic',
  'Area deserted',
] as const

export type ObservationTag = (typeof OBSERVATION_TAGS)[number]
