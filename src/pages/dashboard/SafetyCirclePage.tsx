import { useState, useEffect, useRef } from 'react'
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  Volume2,
  VolumeX,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  PhoneCall,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Send,
  Lock,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useArea } from '@/contexts/AreaContext'
import { sirenService } from '@/services/siren.service'
import {
  safetyCircleService,
  MAX_TRUSTED_CONTACTS,
  MANUAL_ALERT_COOLDOWN_SECONDS,
} from '@/services/safety-circle.service'
import { firestoreService } from '@/services/firestore.service'
import { Button } from '@/components/design-system/Button'
import { Input } from '@/components/design-system/Input'
import { Badge } from '@/components/design-system/Badge'
import { EmptyState } from '@/components/design-system/EmptyState'
import type { TrustedContact } from '@/types/user'
import type { SafetyEvent } from '@/types/safety-event'
import { Timestamp } from 'firebase/firestore'

export function SafetyCirclePage() {
  const { user, userProfile } = useAuth()
  const { selectedArea } = useArea()

  // ── STATE ──────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<TrustedContact[]>([
    {
      id: 'c-1',
      name: 'Elena Rostova',
      email: null,
      phone: '+1 (555) 234-8901',
      relationship: 'Family / Primary',
      notifyOnAlert: true,
      addedAt: Timestamp.now(),
    },
    {
      id: 'c-2',
      name: 'Marcus Vance',
      email: 'marcus.vance@example.com',
      phone: null,
      relationship: 'Travel Companion',
      notifyOnAlert: true,
      addedAt: Timestamp.now(),
    },
  ])

  const [isCirclePaused, setIsCirclePaused] = useState<boolean>(
    userProfile?.safetyCirclePaused ?? false,
  )
  const [hasConsent, setHasConsent] = useState<boolean>(true)
  const [sirenPlaying, setSirenPlaying] = useState(sirenService.isPlaying)

  // Manual "I feel unsafe" state
  const [manualNote, setManualNote] = useState('')
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const [isDispatchingUnsafe, setIsDispatchingUnsafe] = useState(false)
  const [unsafeTriggerSuccess, setUnsafeTriggerSuccess] = useState<string | null>(null)
  const [unsafeError, setUnsafeError] = useState<string | null>(null)

  // Check-in workflow state ("Are you okay?")
  const [activeCheckinEvent, setActiveCheckinEvent] = useState<SafetyEvent | null>(null)
  const [checkinRemainingSeconds, setCheckinRemainingSeconds] = useState<number>(0)
  const [checkinFeedback, setCheckinFeedback] = useState<string | null>(null)
  const checkinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Contact Form (Add/Edit)
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactIdentifier, setContactIdentifier] = useState('')
  const [contactRelation, setContactRelation] = useState('Family / Primary')
  const [contactNotifyOnAlert, setContactNotifyOnAlert] = useState(true)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Event audit history
  const [eventsHistory, setEventsHistory] = useState<SafetyEvent[]>([])

  // ── INITIAL DATA & COOLDOWN TIMER ──────────────────────────────────
  useEffect(() => {
    // Check initial cooldown
    const remaining = safetyCircleService.getManualCooldownRemainingSeconds()
    setCooldownRemaining(remaining)

    const interval = setInterval(() => {
      const rem = safetyCircleService.getManualCooldownRemainingSeconds()
      setCooldownRemaining(rem)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Synchronize siren playback state
  useEffect(() => {
    return sirenService.subscribe((playing) => {
      setSirenPlaying(playing)
    })
  }, [])

  // Checkin countdown timer
  useEffect(() => {
    if (activeCheckinEvent && checkinRemainingSeconds > 0) {
      checkinTimerRef.current = setTimeout(() => {
        setCheckinRemainingSeconds((prev) => prev - 1)
      }, 1000)
    } else if (activeCheckinEvent && checkinRemainingSeconds === 0) {
      // Trigger timeout escalation
      handleCheckinTimeout()
    }

    return () => {
      if (checkinTimerRef.current) clearTimeout(checkinTimerRef.current)
    }
  }, [activeCheckinEvent, checkinRemainingSeconds])

  // Load from Firestore if user is authenticated
  useEffect(() => {
    if (!user) return
    firestoreService
      .getTrustedContacts(user.uid)
      .then((data) => {
        if (data.length > 0) {
          setContacts(data)
        }
      })
      .catch(() => {
        // Fallback to local default
      })

    firestoreService
      .getUserSafetyEvents(user.uid)
      .then((events) => {
        if (events.length > 0) {
          setEventsHistory(events)
        }
      })
      .catch(() => {
        // Keep initial empty
      })
  }, [user])

  // ── CONTACT MANAGEMENT HANDLERS ────────────────────────────────────

  function openAddModal() {
    setEditingContactId(null)
    setContactName('')
    setContactIdentifier('')
    setContactRelation('Family / Primary')
    setContactNotifyOnAlert(true)
    setFormErrors({})
    setShowContactModal(true)
  }

  function openEditModal(contact: TrustedContact) {
    setEditingContactId(contact.id)
    setContactName(contact.name)
    setContactIdentifier(contact.email || contact.phone || '')
    setContactRelation(contact.relationship)
    setContactNotifyOnAlert(contact.notifyOnAlert)
    setFormErrors({})
    setShowContactModal(true)
  }

  async function handleSaveContact(e: React.FormEvent) {
    e.preventDefault()

    const validation = safetyCircleService.validateContactInput(
      {
        name: contactName,
        identifier: contactIdentifier,
        relationship: contactRelation,
        notifyOnAlert: contactNotifyOnAlert,
      },
      editingContactId ? contacts.length - 1 : contacts.length,
    )

    if (!validation.valid) {
      setFormErrors(validation.errors)
      return
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactIdentifier.trim())
    const email = isEmail ? contactIdentifier.trim() : null
    const phone = !isEmail ? contactIdentifier.trim() : null

    if (editingContactId) {
      // Update existing
      const updated = contacts.map((c) =>
        c.id === editingContactId
          ? {
              ...c,
              name: contactName.trim(),
              email,
              phone,
              relationship: contactRelation,
              notifyOnAlert: contactNotifyOnAlert,
            }
          : c,
      )
      setContacts(updated)

      if (user) {
        await firestoreService.updateTrustedContact(user.uid, editingContactId, {
          name: contactName.trim(),
          email,
          phone,
          relationship: contactRelation,
          notifyOnAlert: contactNotifyOnAlert,
        })
      }
    } else {
      // Add new contact
      const newContact: TrustedContact = {
        id: `contact-${Date.now()}`,
        name: contactName.trim(),
        email,
        phone,
        relationship: contactRelation,
        notifyOnAlert: contactNotifyOnAlert,
        addedAt: Timestamp.now(),
      }

      setContacts([...contacts, newContact])

      if (user) {
        await firestoreService.addTrustedContact(user.uid, {
          name: newContact.name,
          email: newContact.email,
          phone: newContact.phone,
          relationship: newContact.relationship,
          notifyOnAlert: newContact.notifyOnAlert,
        })
      }
    }

    setShowContactModal(false)
  }

  async function handleRemoveContact(contactId: string) {
    if (!confirm('Are you sure you want to remove this trusted contact?')) return

    setContacts(contacts.filter((c) => c.id !== contactId))
    if (user) {
      await firestoreService.removeTrustedContact(user.uid, contactId)
    }
  }

  async function togglePauseCircle() {
    const nextState = !isCirclePaused
    setIsCirclePaused(nextState)
    if (user) {
      await firestoreService.setSafetyCirclePaused(user.uid, nextState)
    }
  }

  // ── SIREN AUDIO TRIGGER ────────────────────────────────────────────

  async function toggleSiren() {
    await sirenService.toggle()
  }

  // ── MANUAL "I FEEL UNSAFE" TRIGGER ─────────────────────────────────

  async function handleTriggerManualUnsafe() {
    if (cooldownRemaining > 0) return
    if (isCirclePaused) {
      setUnsafeError('Safety Circle is currently paused. Please unpause above to send alerts.')
      return
    }
    if (!hasConsent) {
      setUnsafeError('Safety Circle notification consent is required before triggering alerts.')
      return
    }

    setIsDispatchingUnsafe(true)
    setUnsafeError(null)
    setUnsafeTriggerSuccess(null)

    try {
      const areaId = selectedArea?.id || 'current-area'
      const areaName = selectedArea?.name || 'Local Area'
      const locationConsent = userProfile?.preferences.coarseLocationConsent ?? true
      const currentCoords = selectedArea?.center
        ? { lat: selectedArea.center.latitude, lng: selectedArea.center.longitude }
        : null

      const result = await safetyCircleService.triggerManualUnsafe({
        uid: user?.uid || 'guest-user',
        userAlias: userProfile?.displayName || user?.displayName || 'Awarely User',
        areaId,
        areaName,
        contacts,
        isCirclePaused,
        locationConsent,
        currentCoords,
        note: manualNote.trim() || null,
      })

      setEventsHistory([result.event, ...eventsHistory])
      setCooldownRemaining(result.cooldownSeconds)
      setUnsafeTriggerSuccess(
        `Safety notification dispatched to ${result.event.notifiedContactCount} trusted contact(s). Cooldown active (${result.cooldownSeconds}s).`,
      )
      setManualNote('')
    } catch (err) {
      setUnsafeError((err as Error).message || 'Failed to dispatch safety alert.')
    } finally {
      setIsDispatchingUnsafe(false)
    }
  }

  // ── CHECK-IN WORKFLOW ("Are you okay?") ────────────────────────────

  async function handleStartCheckin(timeoutSeconds = 60) {
    if (isCirclePaused) {
      setCheckinFeedback('Safety Circle is paused. Unpause to run check-ins.')
      return
    }

    const areaId = selectedArea?.id || 'current-area'
    const areaName = selectedArea?.name || 'Local Area'

    const event = await safetyCircleService.initiateSafetyCheckin({
      uid: user?.uid || 'guest-user',
      areaId,
      areaName,
      timeoutSeconds,
    })

    setActiveCheckinEvent(event)
    setCheckinRemainingSeconds(timeoutSeconds)
    setCheckinFeedback(null)
  }

  async function handleRespondAllGood() {
    if (!activeCheckinEvent) return

    await safetyCircleService.respondToCheckin({
      eventId: activeCheckinEvent.id,
      uid: user?.uid || 'guest-user',
      response: 'all_good',
      areaId: activeCheckinEvent.areaId,
      areaName: activeCheckinEvent.areaName,
      contacts,
      isCirclePaused,
      locationConsent: true,
    })

    setEventsHistory([
      { ...activeCheckinEvent, status: 'resolved', resolutionReason: 'all_good' },
      ...eventsHistory,
    ])
    setActiveCheckinEvent(null)
    setCheckinRemainingSeconds(0)
    setCheckinFeedback('Check-in confirmed: "All good". No alerts were sent to your circle.')
  }

  async function handleRespondNeedHelp() {
    if (!activeCheckinEvent) return

    const currentCoords = selectedArea?.center
      ? { lat: selectedArea.center.latitude, lng: selectedArea.center.longitude }
      : null

    const result = await safetyCircleService.respondToCheckin({
      eventId: activeCheckinEvent.id,
      uid: user?.uid || 'guest-user',
      userAlias: userProfile?.displayName || user?.displayName || 'Awarely User',
      response: 'need_help',
      areaId: activeCheckinEvent.areaId,
      areaName: activeCheckinEvent.areaName,
      contacts,
      isCirclePaused,
      locationConsent: true,
      currentCoords,
    })

    setEventsHistory([
      {
        ...activeCheckinEvent,
        status: 'escalated',
        resolutionReason: 'need_help',
        notifiedContactCount: result.notifiedCount,
      },
      ...eventsHistory,
    ])
    setActiveCheckinEvent(null)
    setCheckinRemainingSeconds(0)
    setCheckinFeedback(
      `Help requested! Immediate alert dispatched to ${result.notifiedCount} trusted contact(s).`,
    )
  }

  async function handleCheckinTimeout() {
    if (!activeCheckinEvent) return

    const currentCoords = selectedArea?.center
      ? { lat: selectedArea.center.latitude, lng: selectedArea.center.longitude }
      : null

    const result = await safetyCircleService.handleCheckinTimeout({
      eventId: activeCheckinEvent.id,
      uid: user?.uid || 'guest-user',
      userAlias: userProfile?.displayName || user?.displayName || 'Awarely User',
      areaId: activeCheckinEvent.areaId,
      areaName: activeCheckinEvent.areaName,
      contacts,
      isCirclePaused,
      locationConsent: true,
      currentCoords,
    })

    setEventsHistory([
      {
        ...activeCheckinEvent,
        status: 'escalated',
        resolutionReason: 'timed_out',
        notifiedContactCount: result.notifiedCount,
        notifiedContacts: result.audits,
      },
      ...eventsHistory,
    ])
    setActiveCheckinEvent(null)
    setCheckinFeedback(
      `Check-in timed out. Automatic safety alert dispatched to ${result.notifiedCount} trusted contact(s).`,
    )
  }

  // ── HIGH CONCERN AREA ENTRY SIMULATION ─────────────────────────────

  async function handleSimulateHighConcernEntry() {
    if (isCirclePaused) {
      alert('Safety Circle is paused. Unpause to test high-concern entry alerts.')
      return
    }

    const areaId = selectedArea?.id || 'demo-caution-area'
    const areaName = selectedArea?.name || 'Central Market Area'

    const currentCoords = selectedArea?.center
      ? { lat: selectedArea.center.latitude, lng: selectedArea.center.longitude }
      : null

    const result = await safetyCircleService.handleHighConcernAreaEntry({
      uid: user?.uid || 'guest-user',
      userAlias: userProfile?.displayName || user?.displayName || 'Awarely User',
      areaId,
      areaName,
      contacts,
      isCirclePaused: false,
      autoNotifyCircle: true,
      locationConsent: true,
      currentCoords,
    })

    if (result.triggered) {
      alert(
        `High-concern entry alert simulated! Dispatched notice to ${result.notifiedCount} contact(s). 1-hour per-area cooldown started.`,
      )
    } else {
      alert('High-concern alert suppressed by cooldown or circle preferences.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Users className="h-6 w-6 text-[var(--primary)]" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
              Trusted Safety Circle
            </h1>
            <Badge variant="navy" className="text-xs border-[var(--border)] text-[var(--foreground-secondary)]">
              {contacts.length}/{MAX_TRUSTED_CONTACTS} Contacts
            </Badge>
          </div>
          <p className="text-sm text-[var(--foreground-secondary)]">
            Designate up to 3 trusted contacts to receive non-alarmist check-ins and emergency alerts.
          </p>
        </div>

        {/* Global Pause / Resume Switch */}
        <button
          onClick={togglePauseCircle}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition border ${
            isCirclePaused
              ? 'bg-amber-950/40 border-amber-600/50 text-amber-300 hover:bg-amber-900/40'
              : 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/40'
          }`}
          title={isCirclePaused ? 'Click to resume alerts' : 'Click to pause alerts'}
        >
          {isCirclePaused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
          <span>{isCirclePaused ? 'Circle Paused — Click to Resume' : 'Circle Active — Click to Pause'}</span>
        </button>
      </div>

      {/* ── Privacy & Notification Consent Banner ───────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--foreground-secondary)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--foreground)] font-bold">
            <Lock className="h-4 w-4 text-[var(--primary)]" />
            <span>Strict Privacy & Notification Consent</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasConsent}
              onChange={(e) => setHasConsent(e.target.checked)}
              className="rounded border-[var(--border)] bg-[var(--surface-muted)] text-[var(--primary)] focus:ring-0"
            />
            <span className="text-[11px] font-medium text-[var(--foreground-secondary)]">Consent Active</span>
          </label>
        </div>
        <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
          Awarely <strong>never tracks or stores continuous GPS trails</strong> or route history. When an
          event occurs (manual alert, check-in timeout, or high-concern entry), your contacts receive a calm,
          non-alarmist email/SMS notification with only the area name and an approximate snapshot.
        </p>
      </div>

      {/* ── ACTIVE CHECK-IN WORKFLOW CARD ("Are you okay?") ─────────── */}
      {activeCheckinEvent && (
        <div className="rounded-2xl border-2 border-amber-500 bg-amber-950/30 p-5 space-y-4 shadow-2xl animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>Safety Check-in Active</span>
              </span>
              <h2 className="text-xl font-black text-white">Are you okay?</h2>
              <p className="text-xs text-amber-200/90">
                Area: <strong className="text-white">{activeCheckinEvent.areaName}</strong>. If you do not
                confirm your safety before the timer expires, your {contacts.length} trusted contacts will be
                notified.
              </p>
            </div>
            <div className="rounded-xl bg-amber-900/60 border border-amber-500/40 px-3 py-1.5 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-300 block">Timeout</span>
              <span className="text-lg font-black text-white">
                {Math.floor(checkinRemainingSeconds / 60)}:
                {(checkinRemainingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleRespondAllGood}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 text-xs uppercase tracking-wider transition shadow-lg"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Yes, All Good</span>
            </button>
            <button
              onClick={handleRespondNeedHelp}
              className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 text-xs uppercase tracking-wider transition shadow-lg"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>I Need Help — Notify Circle</span>
            </button>
          </div>
        </div>
      )}

      {/* Checkin Feedback banner if present */}
      {checkinFeedback && (
        <div className="rounded-xl border border-teal-500/40 bg-teal-950/30 p-3.5 text-xs text-teal-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-400" />
            <span>{checkinFeedback}</span>
          </span>
          <button onClick={() => setCheckinFeedback(null)} className="text-teal-400 hover:text-white">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── CORE EVENT TRIGGER CONTROLS ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MANUAL "I FEEL UNSAFE" TRIGGER CARD */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" />
              <span>Manual Discomfort Trigger</span>
            </span>
            <h3 className="text-base font-bold text-[var(--foreground)]">"I Feel Unsafe" Action</h3>
            <p className="text-xs text-[var(--foreground-secondary)]">
              Instantly notifies your trusted contacts with your current area (
              <strong className="text-[var(--foreground)]">{selectedArea?.name || 'Local Area'}</strong>). Includes spam
              cooldown prevention ({MANUAL_ALERT_COOLDOWN_SECONDS}s).
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Optional short context note (e.g. Dark street, following)"
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-background)] px-3 py-2 text-xs text-[var(--input-foreground)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-rose-500"
              maxLength={120}
            />

            {unsafeError && <p className="text-xs text-rose-500 dark:text-rose-400">{unsafeError}</p>}
            {unsafeTriggerSuccess && <p className="text-xs text-emerald-600 dark:text-emerald-400">{unsafeTriggerSuccess}</p>}

            <button
              onClick={handleTriggerManualUnsafe}
              disabled={isDispatchingUnsafe || cooldownRemaining > 0 || isCirclePaused || !hasConsent}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition ${
                cooldownRemaining > 0
                  ? 'bg-[var(--surface-muted)] text-[var(--foreground-muted)] border border-[var(--border)] cursor-not-allowed'
                  : 'bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-950/40 disabled:opacity-50'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>
                {isDispatchingUnsafe
                  ? 'Dispatching...'
                  : cooldownRemaining > 0
                  ? `Cooldown Active (${cooldownRemaining}s)`
                  : 'I Feel Unsafe — Notify Circle'}
              </span>
            </button>
          </div>
        </div>

        {/* WORKFLOW SIMULATION & AUDIO CONTROLS */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>Safety Check-in & Siren</span>
            </span>
            <h3 className="text-base font-bold text-[var(--foreground)]">Interactive Protocols</h3>
            <p className="text-xs text-[var(--foreground-secondary)]">
              Test safety check-in prompt workflows, high-concern entry notifications, or sound the deterrent
              acoustic siren.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Start Check-in button */}
            <button
              onClick={() => handleStartCheckin(60)}
              disabled={activeCheckinEvent !== null || isCirclePaused}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-teal-500/40 bg-[var(--surface-muted)] px-3 py-2.5 text-xs font-bold text-teal-600 dark:text-teal-300 hover:bg-teal-500/10 transition disabled:opacity-50"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Test Check-in</span>
            </button>

            {/* High-concern entry test button */}
            <button
              onClick={handleSimulateHighConcernEntry}
              disabled={isCirclePaused}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-[var(--surface-muted)] px-3 py-2.5 text-xs font-bold text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 transition disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Test Area Entry</span>
            </button>

            {/* Siren button */}
            <button
              onClick={toggleSiren}
              className={`col-span-2 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                sirenPlaying
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-[var(--surface-muted)] text-rose-600 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/10'
              }`}
            >
              {sirenPlaying ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span>{sirenPlaying ? 'Stop Emergency Siren' : 'Trigger Acoustic Siren'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── DESIGNATED CONTACTS (1–3 CONTACTS) ───────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Designated Contacts ({contacts.length}/{MAX_TRUSTED_CONTACTS})
            </h2>
            <p className="text-xs text-[var(--foreground-muted)]">
              Only necessary contact info is stored. Contacts receive email/SMS notifications during safety
              events.
            </p>
          </div>

          {contacts.length < MAX_TRUSTED_CONTACTS && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={openAddModal}
            >
              Add Contact
            </Button>
          )}
        </div>

        {contacts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col justify-between space-y-3 shadow-md hover:border-[var(--border-strong)] transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      {contact.relationship}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(contact)}
                        className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] p-1 transition"
                        title="Edit contact"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveContact(contact.id)}
                        className="text-[var(--foreground-muted)] hover:text-rose-500 p-1 transition"
                        title="Remove contact"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--foreground)] mt-1">{contact.name}</h4>
                  <p className="text-xs text-[var(--foreground-secondary)] mt-0.5 break-all">
                    {contact.email || contact.phone}
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--foreground-muted)]">
                  <span
                    className={`flex items-center gap-1 ${
                      contact.notifyOnAlert ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--foreground-muted)]'
                    }`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    <span>{contact.notifyOnAlert ? 'Active' : 'Muted'}</span>
                  </span>
                  <span className="text-[10px] text-[var(--foreground-muted)]">
                    {contact.email ? 'Email Dispatch' : 'SMS Dispatch'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No trusted contacts yet"
            description="Add 1 to 3 emergency contacts to activate automated check-ins and emergency alerts."
            action={
              <Button variant="primary" size="sm" onClick={openAddModal}>
                Add First Contact
              </Button>
            }
          />
        )}
      </div>

      {/* ── NOTIFICATION AUDIT / EVENT RECORDS ──────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          Safety Event Audit Records
        </h3>

        {eventsHistory.length > 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden">
            {eventsHistory.slice(0, 5).map((ev) => (
              <div key={ev.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--foreground)] capitalize">
                      {ev.eventType.replace(/_/g, ' ')}
                    </span>
                    <Badge
                      variant={
                        ev.status === 'resolved'
                          ? 'positive'
                          : ev.status === 'escalated'
                          ? 'concern'
                          : 'caution'
                      }
                      className="text-[10px] py-0 px-1.5"
                    >
                      {ev.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    Area: <span className="text-[var(--foreground-secondary)]">{ev.areaName}</span>
                    {ev.note && <span> · "{ev.note}"</span>}
                  </p>
                </div>

                <div className="text-right sm:text-right text-[11px] text-[var(--foreground-muted)]">
                  <span className="text-teal-600 dark:text-teal-400 font-semibold">
                    {ev.notifiedContactCount} Contact(s) Notified
                  </span>
                  <div className="text-[10px] text-[var(--foreground-muted)]">Server-side dispatch audit logged</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--foreground-muted)] italic">
            No safety events triggered yet. All event actions maintain secure audit records here.
          </p>
        )}
      </div>

      {/* ── EMERGENCY SERVICES DISCLAIMER ──────────────────────────── */}
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-200 leading-relaxed flex items-start gap-3">
        <PhoneCall className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-[var(--foreground)]">Emergency Services Precedence: </strong>
          Awarely Safety Circle is a peer notification feature and does not dispatch emergency first
          responders. In an active medical, criminal, or life-threatening emergency, always contact civic
          emergency services immediately (e.g. 112 in India/EU, 999 in UK, 911 in USA).
        </div>
      </div>

      {/* ── ADD / EDIT CONTACT MODAL ─────────────────────────────────── */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <form
            onSubmit={handleSaveContact}
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-[var(--foreground)]">
                {editingContactId ? 'Edit Trusted Contact' : 'Add Trusted Contact'}
              </h3>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--foreground-secondary)] mb-1 block">Full Name</label>
                <Input
                  id="contact-name"
                  placeholder="e.g. Elena Rostova"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  error={formErrors.name}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--foreground-secondary)] mb-1 block">
                  Email Address or Phone Number
                </label>
                <Input
                  id="contact-identifier"
                  placeholder="name@example.com or +1 (555) 000-0000"
                  value={contactIdentifier}
                  onChange={(e) => setContactIdentifier(e.target.value)}
                  error={formErrors.identifier}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--foreground-secondary)] mb-1 block">Relationship</label>
                <select
                  value={contactRelation}
                  onChange={(e) => setContactRelation(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                >
                  <option value="Family / Primary">Family / Primary</option>
                  <option value="Partner / Spouse">Partner / Spouse</option>
                  <option value="Travel Companion">Travel Companion</option>
                  <option value="Friend / Neighbor">Friend / Neighbor</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Emergency Contact">Emergency Contact</option>
                </select>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactNotifyOnAlert}
                  onChange={(e) => setContactNotifyOnAlert(e.target.checked)}
                  className="rounded border-[var(--border)] bg-[var(--surface)] text-[var(--primary)] focus:ring-0"
                />
                <span className="text-xs text-[var(--foreground-secondary)]">
                  Notify this contact when safety alerts or check-in timeouts trigger
                </span>
              </label>

              {formErrors.limit && <p className="text-xs text-rose-500">{formErrors.limit}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setShowContactModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                {editingContactId ? 'Save Changes' : 'Add Contact'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
