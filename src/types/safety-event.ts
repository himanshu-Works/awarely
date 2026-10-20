import type { Timestamp } from 'firebase/firestore'

export type SafetyEventType =
  | 'high_concern_entry'
  | 'manual_unsafe'
  | 'safety_checkin'
  | 'checkin_timeout'
  | 'siren_triggered'
  | 'circle_checkin'
  | 'distress_alert'

export type SafetyEventStatus = 'active' | 'resolved' | 'escalated' | 'cancelled'

export type NotificationDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed'

export interface ContactNotificationAudit {
  contactId: string
  name: string
  channel: 'email' | 'sms' | 'push'
  destination: string
  status: NotificationDeliveryStatus
  sentAt: Timestamp
  messageId?: string
  error?: string
}

/**
 * Ephemeral safety event record stored at safetyEvents/{eventId}.
 *
 * PRIVACY GUARANTEES:
 * - Stores ONLY information strictly necessary for the immediate event.
 * - NEVER creates or references continuous location tracks.
 * - NEVER stores routes, turn-by-turn paths, or origin/destination tracks.
 * - NEVER stores continuous GPS breadcrumbs.
 * - Approximate location snapshot is ONLY attached if the user explicitly granted permission.
 * - Automatically expires via TTL after 24 hours.
 */
export interface SafetyEvent {
  id: string
  uid: string
  eventType: SafetyEventType
  areaId: string                 // Coarse area reference only
  areaName: string               // Coarse area name for notification display
  approximateLocation?: {
    lat: number
    lng: number
  } | null                       // Ephemeral snapshot only, if consented
  triggeredAt: Timestamp
  expiresAt: Timestamp           // TTL timestamp (triggeredAt + 24 hours)
  status: SafetyEventStatus
  notifiedContactCount: number
  notifiedContacts?: ContactNotificationAudit[]
  checkinExpiresAt?: Timestamp | null
  resolutionReason?: 'all_good' | 'need_help' | 'timed_out' | 'manual_cancelled' | null
  note?: string | null           // Optional message to circle contacts
}

export interface CreateSafetyEventPayload {
  eventType: SafetyEventType
  areaId: string
  areaName: string
  approximateLocation?: {
    lat: number
    lng: number
  } | null
  checkinExpiresAt?: Timestamp | null
  note?: string | null
}

