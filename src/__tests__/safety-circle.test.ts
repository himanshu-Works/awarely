import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SafetyCircleService,
  MAX_TRUSTED_CONTACTS,
  MANUAL_ALERT_COOLDOWN_SECONDS,
} from '@/services/safety-circle.service'
import type { TrustedContact } from '@/types/user'
import { Timestamp } from 'firebase/firestore'

// Mock firestoreService and functionsService
vi.mock('@/services/firestore.service', () => ({
  firestoreService: {
    createSafetyEvent: vi.fn().mockResolvedValue('test-event-id'),
    updateSafetyEvent: vi.fn().mockResolvedValue(undefined),
    addAlertHistoryEntry: vi.fn().mockResolvedValue('test-alert-id'),
    getTrustedContacts: vi.fn().mockResolvedValue([]),
    getUserSafetyEvents: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/services/functions.service', () => ({
  functionsService: {
    sendCircleAlert: vi.fn().mockResolvedValue({
      success: true,
      contactsNotified: 2,
      alertId: 'fn-alert-1',
      remainingAlerts: 10,
    }),
  },
}))

describe('Trusted Safety Circle Service', () => {
  let service: SafetyCircleService

  const sampleContacts: TrustedContact[] = [
    {
      id: 'c-1',
      name: 'Elena Rostova',
      email: 'elena@example.com',
      phone: null,
      relationship: 'Family',
      notifyOnAlert: true,
      addedAt: Timestamp.now(),
    },
    {
      id: 'c-2',
      name: 'Marcus Vance',
      email: null,
      phone: '+15551234567',
      relationship: 'Travel Companion',
      notifyOnAlert: true,
      addedAt: Timestamp.now(),
    },
  ]

  beforeEach(() => {
    service = new SafetyCircleService()
    vi.clearAllMocks()
  })

  // ── 1. CONTACT VALIDATION & LIMIT CHECKS ──────────────────────────

  describe('Contact Validation', () => {
    it('validates a valid contact with email', () => {
      const result = service.validateContactInput(
        {
          name: 'Maya Lin',
          identifier: 'maya.lin@example.com',
          relationship: 'Friend',
        },
        1,
      )
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('validates a valid contact with phone number', () => {
      const result = service.validateContactInput(
        {
          name: 'Maya Lin',
          identifier: '+91 98765 43210',
          relationship: 'Partner',
        },
        2,
      )
      expect(result.valid).toBe(true)
    })

    it('rejects an empty contact name', () => {
      const result = service.validateContactInput(
        {
          name: '   ',
          identifier: 'test@example.com',
          relationship: 'Friend',
        },
        0,
      )
      expect(result.valid).toBe(false)
      expect(result.errors.name).toBeDefined()
    })

    it('rejects an invalid identifier that is neither email nor phone', () => {
      const result = service.validateContactInput(
        {
          name: 'Jane Doe',
          identifier: 'not-an-email-or-phone',
          relationship: 'Friend',
        },
        0,
      )
      expect(result.valid).toBe(false)
      expect(result.errors.identifier).toBeDefined()
    })

    it(`enforces maximum of ${MAX_TRUSTED_CONTACTS} trusted contacts`, () => {
      const result = service.validateContactInput(
        {
          name: 'Fourth Contact',
          identifier: 'fourth@example.com',
          relationship: 'Friend',
        },
        MAX_TRUSTED_CONTACTS,
      )
      expect(result.valid).toBe(false)
      expect(result.errors.limit).toBeDefined()
    })
  })

  // ── 2. MANUAL "I FEEL UNSAFE" TRIGGER & COOLDOWN ──────────────────

  describe('Manual "I feel unsafe" Trigger', () => {
    it('triggers manual alert and returns cooldown and notification audit', async () => {
      const now = 1000000000
      const result = await service.triggerManualUnsafe({
        uid: 'user-123',
        userAlias: 'Alice',
        areaId: 'area-central',
        areaName: 'Central District',
        contacts: sampleContacts,
        isCirclePaused: false,
        locationConsent: true,
        currentCoords: { lat: 12.9716, lng: 77.5946 },
        note: 'Poor lighting in back alley',
        nowMs: now,
      })

      expect(result.event).toBeDefined()
      expect(result.event.eventType).toBe('manual_unsafe')
      expect(result.event.notifiedContactCount).toBe(2)
      expect(result.cooldownSeconds).toBe(MANUAL_ALERT_COOLDOWN_SECONDS)
      expect(result.event.approximateLocation).toEqual({ lat: 12.972, lng: 77.595 })
    })

    it('enforces location privacy: does NOT include coordinates if locationConsent is false', async () => {
      const result = await service.triggerManualUnsafe({
        uid: 'user-123',
        areaId: 'area-central',
        areaName: 'Central District',
        contacts: sampleContacts,
        isCirclePaused: false,
        locationConsent: false, // NO consent
        currentCoords: { lat: 12.9716, lng: 77.5946 },
        nowMs: 1000000000,
      })

      expect(result.event.approximateLocation).toBeNull()
    })

    it('prevents notification spam by rejecting triggers during active cooldown', async () => {
      const startMs = 1000000000
      // First trigger
      await service.triggerManualUnsafe({
        uid: 'user-123',
        areaId: 'area-central',
        areaName: 'Central District',
        contacts: sampleContacts,
        isCirclePaused: false,
        locationConsent: true,
        nowMs: startMs,
      })

      // Immediate second trigger 10 seconds later (within 60s cooldown)
      await expect(
        service.triggerManualUnsafe({
          uid: 'user-123',
          areaId: 'area-central',
          areaName: 'Central District',
          contacts: sampleContacts,
          isCirclePaused: false,
          locationConsent: true,
          nowMs: startMs + 10000,
        }),
      ).rejects.toThrow(/cooldown active/i)
    })

    it('rejects manual alert if Safety Circle is paused', async () => {
      await expect(
        service.triggerManualUnsafe({
          uid: 'user-123',
          areaId: 'area-central',
          areaName: 'Central District',
          contacts: sampleContacts,
          isCirclePaused: true, // PAUSED
          locationConsent: true,
        }),
      ).rejects.toThrow(/paused/i)
    })
  })

  // ── 3. SAFETY CHECK-IN WORKFLOW ("Are you okay?") ─────────────────

  describe('Safety Check-in Workflow', () => {
    it('initiates a check-in event with an active timeout timestamp', async () => {
      const now = 2000000000
      const event = await service.initiateSafetyCheckin({
        uid: 'user-123',
        areaId: 'area-south',
        areaName: 'South Market',
        timeoutSeconds: 120,
        nowMs: now,
      })

      expect(event.eventType).toBe('safety_checkin')
      expect(event.status).toBe('active')
      expect(event.checkinExpiresAt).toBeDefined()
    })

    it('resolves check-in calmly when user responds "all_good" with 0 alerts sent', async () => {
      const response = await service.respondToCheckin({
        eventId: 'checkin-1',
        uid: 'user-123',
        response: 'all_good',
        areaId: 'area-south',
        areaName: 'South Market',
        contacts: sampleContacts,
        isCirclePaused: false,
        locationConsent: true,
      })

      expect(response.status).toBe('resolved')
      expect(response.notifiedCount).toBe(0)
    })

    it('escalates immediately and notifies circle when user responds "need_help"', async () => {
      const response = await service.respondToCheckin({
        eventId: 'checkin-1',
        uid: 'user-123',
        response: 'need_help',
        areaId: 'area-south',
        areaName: 'South Market',
        contacts: sampleContacts,
        isCirclePaused: false,
        locationConsent: true,
      })

      expect(response.status).toBe('escalated')
      expect(response.notifiedCount).toBe(2)
    })
  })

  // ── 4. CHECK-IN TIMEOUT (NO RESPONSE ESCALATION) ──────────────────

  describe('Check-in Timeout Escalation', () => {
    it('dispatches checkin_timeout alert to contacts if user fails to respond', async () => {
      const result = await service.handleCheckinTimeout({
        eventId: 'checkin-timeout-1',
        uid: 'user-123',
        userAlias: 'Bob',
        areaId: 'area-north',
        areaName: 'North Station',
        contacts: sampleContacts,
        isCirclePaused: false,
        locationConsent: true,
      })

      expect(result.notifiedCount).toBe(2)
      expect(result.audits.length).toBe(2)
      expect(result.audits[0].status).toBe('sent')
    })

    it('does not dispatch timeout alerts if Safety Circle is paused', async () => {
      const result = await service.handleCheckinTimeout({
        eventId: 'checkin-timeout-2',
        uid: 'user-123',
        areaId: 'area-north',
        areaName: 'North Station',
        contacts: sampleContacts,
        isCirclePaused: true, // PAUSED
        locationConsent: true,
      })

      expect(result.notifiedCount).toBe(0)
      expect(result.audits.length).toBe(0)
    })
  })

  // ── 5. HIGH-CONCERN AREA ENTRY ───────────────────────────────────

  describe('High-Concern Area Entry', () => {
    it('triggers area entry alert and enforces 1-hour cooldown per area', async () => {
      const now = 3000000000

      // First entry
      const first = await service.handleHighConcernAreaEntry({
        uid: 'user-123',
        areaId: 'area-high-risk',
        areaName: 'Old Market Area',
        contacts: sampleContacts,
        isCirclePaused: false,
        autoNotifyCircle: true,
        locationConsent: true,
        nowMs: now,
      })

      expect(first.triggered).toBe(true)
      expect(first.notifiedCount).toBe(2)

      // Re-entry 15 minutes later (cooldown active)
      const second = await service.handleHighConcernAreaEntry({
        uid: 'user-123',
        areaId: 'area-high-risk',
        areaName: 'Old Market Area',
        contacts: sampleContacts,
        isCirclePaused: false,
        autoNotifyCircle: true,
        locationConsent: true,
        nowMs: now + 15 * 60 * 1000,
      })

      expect(second.triggered).toBe(false)
      expect(second.notifiedCount).toBe(0)
    })
  })

  // ── 6. CONTACT ACTIVE / MUTED PREFERENCES ─────────────────────────

  describe('Contact Notification Preferences', () => {
    it('skips contacts with notifyOnAlert set to false', async () => {
      const mixedContacts: TrustedContact[] = [
        {
          id: 'c-1',
          name: 'Active Contact',
          email: 'active@example.com',
          phone: null,
          relationship: 'Friend',
          notifyOnAlert: true,
          addedAt: Timestamp.now(),
        },
        {
          id: 'c-2',
          name: 'Muted Contact',
          email: 'muted@example.com',
          phone: null,
          relationship: 'Colleague',
          notifyOnAlert: false, // MUTED
          addedAt: Timestamp.now(),
        },
      ]

      const result = await service.triggerManualUnsafe({
        uid: 'user-123',
        areaId: 'area-test',
        areaName: 'Test Area',
        contacts: mixedContacts,
        isCirclePaused: false,
        locationConsent: true,
      })

      expect(result.event.notifiedContactCount).toBe(1)
    })
  })
})
