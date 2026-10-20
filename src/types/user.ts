import type { Timestamp } from 'firebase/firestore'
import type { Platform } from './report'

export type UserRole = 'user' | 'admin' | 'dev'

export interface UserPreferences {
  notificationsEnabled: boolean
  theme: 'dark' | 'light' | 'system'
  coarseLocationConsent: boolean
}

export interface ConsentFlags {
  termsAccepted: boolean
  termsAcceptedAt: Timestamp
  privacyAccepted: boolean
  privacyAcceptedAt: Timestamp
  dataRetentionPolicyAcknowledged: boolean
}

export interface FCMToken {
  token: string
  platform: Platform
  updatedAt: Timestamp
}

/**
 * Full user profile document in Firestore at users/{uid}
 */
export interface UserProfile {
  uid: string
  displayName: string | null
  email: string | null
  photoURL?: string | null
  isAnonymous: boolean
  role: UserRole
  preferences: UserPreferences
  alertEnabled: boolean
  safetyCirclePaused: boolean
  alertPreference?: {
    notifyCircleOnCheckin: boolean
    soundAlarmOnDistress: boolean
  }
  safetyCirclePreference?: {
    maxContacts: number
    autoShareArea: boolean
  }
  consent: ConsentFlags
  createdAt: Timestamp
  updatedAt: Timestamp
  lastSeenAt?: Timestamp
  preferredAlias?: string | null
  fcmTokens?: FCMToken[]
  reportCount: number
}

/**
 * Trusted contact stored in users/{uid}/trustedContacts/{contactId}
 */
export interface TrustedContact {
  id: string
  name: string
  email: string | null
  phone: string | null
  relationship: string
  addedAt: Timestamp
  notifyOnAlert: boolean
}

/**
 * Alert history entry stored in users/{uid}/alertHistory
 */
export interface AlertHistoryEntry {
  id: string
  areaId: string
  areaName: string
  triggeredAt: Timestamp
  contactCount: number
  personalMessage: string | null
  expiresAt: Timestamp
}
