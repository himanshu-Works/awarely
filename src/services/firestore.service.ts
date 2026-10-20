/**
 * Firestore Service — typed operations for Awarely data entities.
 *
 * Core Security & Architectural Rule:
 * The client is NEVER permitted to directly modify computed safety scores
 * (overallScore, timeScores, confidence, reportCount).
 * All scoring aggregations are computed exclusively server-side via Cloud Functions.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  type DocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import type { Area } from '@/types/area'
import type { UserProfile, TrustedContact, AlertHistoryEntry } from '@/types/user'
import type { Report, ModerationStatus } from '@/types/report'
import type { AreaSummaryDoc } from '@/types/area-summary'
import type { SafetyEvent, CreateSafetyEventPayload } from '@/types/safety-event'
import type { AdminAuditLog } from '@/types/admin'

// ── Firestore collection paths ──────────────────────────────────────
export const COLLECTIONS = {
  areas: 'areas',
  users: 'users',
  reports: 'reports',
  areaSummaries: 'areaSummaries',
  safetyEvents: 'safetyEvents',
  adminAuditLogs: 'adminAuditLogs',
  trustedContacts: (uid: string) => `users/${uid}/trustedContacts`,
  alertHistory: (uid: string) => `users/${uid}/alertHistory`,
} as const

// ── Converters ──────────────────────────────────────────────────────

function areaFromSnapshot(snap: DocumentSnapshot): Area | null {
  if (!snap.exists()) return null
  const data = snap.data() as any
  return {
    id: snap.id,
    canonicalName: data.canonicalName || data.name,
    name: data.name || data.canonicalName,
    city: data.city,
    locality: data.locality || data.name,
    postalCode: data.postalCode || null,
    country: data.country || 'Region',
    fullName: data.fullName || `${data.name}, ${data.city}`,
    center: data.center || { latitude: 0, longitude: 0 },
    radiusMeters: data.radiusMeters || 1200,
    placeId: data.placeId || null,
    source: data.source || 'seed',
    status: data.status || 'active',
    bounds: data.bounds,
    polygon: data.polygon,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    isActive: data.isActive ?? true,
    reportCount: data.reportCount ?? 0,
    recentReportCount: data.recentReportCount ?? 0,
    confidence: data.confidence || data.confidenceLevel || 'low',
    confidenceLevel: data.confidenceLevel || data.confidence || 'low',
    overallScore: data.overallScore ?? null,
    timeScores: data.timeScores || { day: 80, evening: 75, night: 65 },
    lastReportAt: data.lastReportAt || data.latestReportAt || null,
    latestReportAt: data.latestReportAt || data.lastReportAt || null,
    topObservations: data.topObservations || [],
    dayNightSplit: data.dayNightSplit || { day: 80, night: 65 },
    awarenessLevel: data.awarenessLevel || 'unknown',
    aiSummary: data.aiSummary || null,
    aiSummaryGeneratedAt: data.aiSummaryGeneratedAt || null,
  } as Area
}

// In-memory document caches to eliminate redundant reads
const areaDocCache = new Map<string, { data: Area | null; timestamp: number }>()
const areaSummaryDocCache = new Map<string, { data: AreaSummaryDoc | null; timestamp: number }>()
let activeAreasCache: { data: Area[]; timestamp: number } | null = null

export const firestoreService = {
  // ── AREAS ──────────────────────────────────────────────────────────

  /**
   * Subscribe to real-time updates for a single area document.
   */
  subscribeToArea(
    areaId: string,
    callback: (area: Area | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const ref = doc(db, COLLECTIONS.areas, areaId)
    return onSnapshot(
      ref,
      (snap) => callback(areaFromSnapshot(snap)),
      (err) => onError?.(err as Error),
    )
  },

  /**
   * Subscribe to all active areas in a city.
   */
  subscribeToAreasByCity(
    city: string,
    callback: (areas: Area[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.areas),
      where('isActive', '==', true),
      where('city', '==', city),
    )
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => areaFromSnapshot(d)!).filter(Boolean)),
      (err) => onError?.(err as Error),
    )
  },

  // ── IN-MEMORY DOCUMENT CACHES (Reduces redundant Firestore reads) ──
  clearCache(): void {
    areaDocCache.clear()
    areaSummaryDocCache.clear()
    activeAreasCache = null
  },

  /** Fetch a single area by canonical ID with in-memory caching. */
  async getArea(areaId: string): Promise<Area | null> {
    const cached = areaDocCache.get(areaId)
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.data
    }

    const snap = await getDoc(doc(db, COLLECTIONS.areas, areaId))
    const area = areaFromSnapshot(snap)
    areaDocCache.set(areaId, { data: area, timestamp: Date.now() })
    return area
  },

  /** Fetch all active areas with in-memory caching. */
  async getAllActiveAreas(): Promise<Area[]> {
    if (activeAreasCache && Date.now() - activeAreasCache.timestamp < 5 * 60 * 1000) {
      return activeAreasCache.data
    }

    const q = query(
      collection(db, COLLECTIONS.areas),
      where('isActive', '==', true),
    )
    const snap = await getDocs(q)
    const areas = snap.docs.map((d) => areaFromSnapshot(d)!).filter(Boolean)
    activeAreasCache = { data: areas, timestamp: Date.now() }
    return areas
  },

  /** Update computed metrics on an Area document (moderation / server only) */
  async updateAreaComputedScore(areaId: string, updates: Partial<Area>): Promise<void> {
    areaDocCache.delete(areaId)
    activeAreasCache = null
    const areaRef = doc(db, COLLECTIONS.areas, areaId)
    await updateDoc(areaRef, updates as any)
  },

  // ── AREA SUMMARIES ─────────────────────────────────────────────────

  /** Fetch AI/aggregated area summary document at areaSummaries/{areaId} with in-memory caching. */
  async getAreaSummary(areaId: string): Promise<AreaSummaryDoc | null> {
    const cached = areaSummaryDocCache.get(areaId)
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.data
    }

    const snap = await getDoc(doc(db, COLLECTIONS.areaSummaries, areaId))
    if (!snap.exists()) {
      areaSummaryDocCache.set(areaId, { data: null, timestamp: Date.now() })
      return null
    }
    const summary = { areaId: snap.id, ...snap.data() } as AreaSummaryDoc
    areaSummaryDocCache.set(areaId, { data: summary, timestamp: Date.now() })
    return summary
  },

  /** Save or update AI/aggregated area summary document at areaSummaries/{areaId}. */
  async saveAreaSummary(areaId: string, summaryDoc: Partial<AreaSummaryDoc>): Promise<void> {
    areaSummaryDocCache.delete(areaId)
    const summaryRef = doc(db, COLLECTIONS.areaSummaries, areaId)
    await setDoc(summaryRef, summaryDoc, { merge: true })
  },

  /** Subscribe to real-time area summary. */
  subscribeToAreaSummary(
    areaId: string,
    callback: (summary: AreaSummaryDoc | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const ref = doc(db, COLLECTIONS.areaSummaries, areaId)
    return onSnapshot(
      ref,
      (snap) =>
        callback(
          snap.exists()
            ? ({ areaId: snap.id, ...snap.data() } as AreaSummaryDoc)
            : null,
        ),
      (err) => onError?.(err as Error),
    )
  },

  // ── REPORTS (Read only on client — writes go to validateReport Cloud Function) ─

  /** Fetch recent approved reports for an area. */
  async getReportsByArea(areaId: string, maxReports = 20): Promise<Report[]> {
    const q = query(
      collection(db, COLLECTIONS.reports),
      where('areaId', '==', areaId),
      where('moderationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(maxReports),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report))
  },

  /** Submit a report to Firestore (tagged with moderationStatus: 'pending'). */
  async submitReportDirectly(report: Report): Promise<string> {
    const docRef = doc(db, COLLECTIONS.reports, report.id)
    await setDoc(docRef, report)
    return report.id
  },

  // ── USERS ──────────────────────────────────────────────────────────

  /** Subscribe to the current user's profile document at users/{uid}. */
  subscribeToUserProfile(
    uid: string,
    callback: (profile: UserProfile | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const ref = doc(db, COLLECTIONS.users, uid)
    return onSnapshot(
      ref,
      (snap) =>
        callback(snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null),
      (err) => onError?.(err as Error),
    )
  },

  /** Fetch user profile document once. */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.users, uid))
    if (!snap.exists()) return null
    return { uid: snap.id, ...snap.data() } as UserProfile
  },

  /** Create or initialize user profile document in Firestore. */
  async createUserProfile(profile: UserProfile): Promise<void> {
    const ref = doc(db, COLLECTIONS.users, profile.uid)
    await setDoc(ref, profile, { merge: true })
  },

  // ── TRUSTED CONTACTS (Scoped to users/{uid}/trustedContacts) ───────

  /** Fetch trusted contacts for a user. */
  async getTrustedContacts(uid: string): Promise<TrustedContact[]> {
    const q = collection(db, COLLECTIONS.trustedContacts(uid))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrustedContact))
  },

  /** Subscribe to user's trusted contacts in real time. */
  subscribeToTrustedContacts(
    uid: string,
    callback: (contacts: TrustedContact[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const q = collection(db, COLLECTIONS.trustedContacts(uid))
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrustedContact))),
      (err) => onError?.(err as Error),
    )
  },

  /** Add a trusted contact to users/{uid}/trustedContacts. */
  async addTrustedContact(uid: string, contact: Omit<TrustedContact, 'id' | 'addedAt'>): Promise<string> {
    const id = `contact-${Date.now()}`
    const ref = doc(db, COLLECTIONS.trustedContacts(uid), id)
    const newContact: TrustedContact = {
      ...contact,
      id,
      addedAt: Timestamp.now(),
    }
    await setDoc(ref, newContact)
    return id
  },

  /** Update an existing trusted contact. */
  async updateTrustedContact(
    uid: string,
    contactId: string,
    updates: Partial<Omit<TrustedContact, 'id' | 'addedAt'>>,
  ): Promise<void> {
    const ref = doc(db, COLLECTIONS.trustedContacts(uid), contactId)
    await updateDoc(ref, updates as Record<string, unknown>)
  },

  /** Remove a trusted contact from users/{uid}/trustedContacts. */
  async removeTrustedContact(uid: string, contactId: string): Promise<void> {
    const ref = doc(db, COLLECTIONS.trustedContacts(uid), contactId)
    await deleteDoc(ref)
  },

  /** Set safety circle paused state for a user. */
  async setSafetyCirclePaused(uid: string, paused: boolean): Promise<void> {
    const ref = doc(db, COLLECTIONS.users, uid)
    await updateDoc(ref, {
      safetyCirclePaused: paused,
      updatedAt: serverTimestamp(),
    })
  },

  // ── SAFETY EVENTS (safetyEvents/{eventId}) ─────────────────────────

  /**
   * Records an ephemeral safety event.
   * STRICT PRIVACY: Stores only necessary coarse area reference and event type.
   * No routes or continuous location trails.
   */
  async createSafetyEvent(
    uid: string,
    payload: CreateSafetyEventPayload & {
      notifiedContactCount?: number
      notifiedContacts?: import('@/types/safety-event').ContactNotificationAudit[]
      status?: import('@/types/safety-event').SafetyEventStatus
    },
  ): Promise<string> {
    const eventId = `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const ref = doc(db, COLLECTIONS.safetyEvents, eventId)
    const now = Timestamp.now()

    const event: SafetyEvent = {
      id: eventId,
      uid,
      eventType: payload.eventType,
      areaId: payload.areaId,
      areaName: payload.areaName,
      approximateLocation: payload.approximateLocation || null,
      triggeredAt: now,
      expiresAt: Timestamp.fromMillis(Date.now() + 24 * 3600 * 1000), // 24-hour TTL
      status: payload.status || 'active',
      notifiedContactCount: payload.notifiedContactCount ?? 0,
      notifiedContacts: payload.notifiedContacts || [],
      checkinExpiresAt: payload.checkinExpiresAt || null,
      note: payload.note || null,
    }

    await setDoc(ref, event)
    return eventId
  },

  /** Update an existing safety event (e.g., resolve check-in, update status). */
  async updateSafetyEvent(eventId: string, updates: Partial<SafetyEvent>): Promise<void> {
    const ref = doc(db, COLLECTIONS.safetyEvents, eventId)
    await updateDoc(ref, updates as Record<string, unknown>)
  },

  /** Fetch active safety events for a user. */
  async getUserSafetyEvents(uid: string): Promise<SafetyEvent[]> {
    const q = query(
      collection(db, COLLECTIONS.safetyEvents),
      where('uid', '==', uid),
      orderBy('triggeredAt', 'desc'),
      limit(10),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SafetyEvent))
  },

  /** Fetch alert history for a user (one-time read). */
  async getAlertHistory(uid: string): Promise<AlertHistoryEntry[]> {
    const q = query(
      collection(db, COLLECTIONS.alertHistory(uid)),
      orderBy('triggeredAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AlertHistoryEntry))
  },

  /** Add an entry to users/{uid}/alertHistory. */
  async addAlertHistoryEntry(uid: string, entry: Omit<AlertHistoryEntry, 'id'>): Promise<string> {
    const id = `alert-${Date.now()}`
    const ref = doc(db, COLLECTIONS.alertHistory(uid), id)
    await setDoc(ref, { id, ...entry })
    return id
  },

  // ── ADMIN GOVERNANCE & AUDIT LOGS ─────────────────────────────────

  /** Update moderation status of a community report. */
  async updateReportModeration(
    reportId: string,
    status: ModerationStatus,
    reason?: string,
  ): Promise<void> {
    const ref = doc(db, COLLECTIONS.reports, reportId)
    await updateDoc(ref, {
      moderationStatus: status,
      moderationReason: reason || null,
      moderatedAt: serverTimestamp(),
    })
  },

  /** Create an immutable administrative audit log record. */
  async createAdminAuditLog(log: Omit<AdminAuditLog, 'id'>): Promise<string> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const ref = doc(db, COLLECTIONS.adminAuditLogs, id)
    await setDoc(ref, { id, ...log })
    return id
  },

  /** Fetch recent administrative audit logs. */
  async getAdminAuditLogs(maxCount = 50): Promise<AdminAuditLog[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.adminAuditLogs),
        orderBy('timestamp', 'desc'),
        limit(maxCount),
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminAuditLog))
    } catch {
      return []
    }
  },

  /** Fetch reports for moderation queue with optional status filtering. */
  async getAllReportsForModeration(
    statusFilter?: ModerationStatus | 'all',
    maxCount = 100,
  ): Promise<Report[]> {
    try {
      let q
      if (statusFilter && statusFilter !== 'all') {
        q = query(
          collection(db, COLLECTIONS.reports),
          where('moderationStatus', '==', statusFilter),
          orderBy('createdAt', 'desc'),
          limit(maxCount),
        )
      } else {
        q = query(
          collection(db, COLLECTIONS.reports),
          orderBy('createdAt', 'desc'),
          limit(maxCount),
        )
      }
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Report))
    } catch {
      return []
    }
  },
}
