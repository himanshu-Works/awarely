# Awarely Trusted Safety Circle & Distress Protocols

## 1. System Overview

The **Trusted Safety Circle** allows users to designate **1 to 3 trusted contacts** (such as family members, partners, or travel companions) to receive automated, non-alarmist notifications and check-in statuses during critical safety events.

---

## 2. Core Privacy Guarantees

1. **Zero Continuous Tracking:**
   - Awarely **never tracks, records, or stores continuous GPS trails**, journey routes, turn-by-turn vectors, or travel history.
2. **Minimal Necessary Contact Information:**
   - Contacts store only their Name, Identifier (Email or Phone Number), Relationship label, and Alert status.
3. **Ephemeral Single-Point Snapshot Only On Explicit Consent:**
   - When an event occurs (e.g. manual alert or check-in timeout), an approximate, rounded single-point coordinate snapshot (`lat`, `lng` rounded to ~100m) is attached **only** if the user has explicitly granted coarse location permission (`coarseLocationConsent`).
   - If permission is denied or absent, only the canonical area name (e.g., "Central Market Area") is transmitted.
4. **Secure Server-Side Notification Dispatch:**
   - Notifications are dispatched strictly through server-side infrastructure (Firebase Cloud Functions `sendCircleAlert` / backend API).
   - Email provider credentials (SendGrid, Resend, AWS SES, SMTP) are **never** exposed in frontend or client-side bundles.

---

## 3. The 4 Safety Event Types

| Event Type | Trigger | Actions & Escalation |
| :--- | :--- | :--- |
| `high_concern_entry` | User enters an area with recent community caution/concern. | Checks circle pause state and 1-hour per-area cooldown. Dispatches calm awareness notice. |
| `manual_unsafe` | User clicks the "I Feel Unsafe" button. | Enforces a 60-second anti-spam cooldown. Immediately dispatches alert with optional note and location snapshot. |
| `safety_checkin` | Routine or contextual check-in ("Are you okay?"). | Starts countdown timer. Prompts user with *"Yes, all good"* or *"I need help"*. |
| `checkin_timeout` | Check-in countdown elapses without user response. | Automatically escalates and dispatches priority alert to all active circle contacts. |

---

## 4. Check-In Protocol & State Machine

```
      [Initiate Check-In]
              │
              ▼
       "Are you okay?"
       (Countdown: 3m)
        /           \
       /             \
 [Yes, all good]   [I need help]  ───OR───  [Timeout: 0s]
       │                  │                      │
       ▼                  ▼                      ▼
  Status: resolved   Status: escalated      Status: escalated
  Resolution:        Resolution:            Resolution:
  'all_good'         'need_help'            'timed_out'
  (0 alerts sent)    (Alerts sent)          (Alerts sent)
```

- **Calm Resolution:** Clicking *"Yes, all good"* resolves the event immediately and records no alerts to contacts.
- **Immediate Escalation:** Clicking *"I need help"* bypasses the remaining timer and sends an immediate alert.
- **Unattended Timeout:** Reaching zero without interaction assumes potential distress and alerts the circle.

---

## 5. Anti-Spam & Cooldown Controls

- **Manual Trigger Cooldown:** 60-second lockout between consecutive manual alerts.
- **Area Entry Cooldown:** 1-hour suppression window per area ID to prevent repeated notifications while remaining in or passing through the same locality.
- **Circle Pause Toggle:** A global pause toggle allows users to silence all automated circle dispatches when traveling with trusted contacts or when privacy is preferred.
- **Per-Contact Muting:** Individual contacts can have `notifyOnAlert: false` without needing to delete their details.

---

## 6. Audit & Event Records

Every safety event produces an immutable audit record in Firestore:
- **`safetyEvents/{eventId}`**: Ephemeral record with 24-hour TTL detailing the event type, area, location snapshot (if consented), delivery status, and contact audits.
- **`users/{uid}/alertHistory/{alertId}`**: User-facing history entry tracking when alerts were sent and to how many contacts.
