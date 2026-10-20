# Awarely Privacy Model & Architectural Guarantees

## 1. Core Philosophy: Zero Continuous Location Tracking

The fundamental architecture of Awarely is rooted in **location minimization**:

> [!IMPORTANT]
> **Awarely NEVER continuously tracks users.**  
> The system does not store, transmit, or compute:
> - Route histories or turn-by-turn vectors
> - Continuous GPS trails or breadcrumbs
> - Origin and destination pairs
> - Velocity, trajectory, or dwell-time tracking

---

## 2. Area-Wise Granularity vs. Route Tracking

Unlike conventional navigation or tracking apps that follow a user along streets and coordinates, Awarely is strictly **AREA-WISE**:

- The system evaluates geographic containment inside canonical public areas (neighborhoods, transit hubs, market quarters, historic districts).
- When a user performs a foreground location check, their coordinates (`latitude`, `longitude`) are processed **ephemerally in client memory**:
  1. The coordinates are matched against known area boundaries (`center` + `radiusMeters` or polygon bounds).
  2. The system resolves the canonical `areaId` (e.g., `area-delhi-cp`).
  3. The raw coordinates are **immediately discarded**.
  4. Neither Firestore nor localStorage ever stores continuous coordinate feeds.

---

## 3. Ephemeral Single-Point Snapshot (Consent-Gated)

During emergency or distress events (e.g., clicking *"I feel unsafe"*, safety check-in timeouts, or high-concern area entry), trusted contacts need context to assist the traveler.

To reconcile immediate safety with privacy:
1. **Explicit Consent Gate:** The user must explicitly opt in to coarse location sharing (`coarseLocationConsent: true`).
2. **Coarse Precision Truncation:** Coordinates are rounded to 3 decimal places ($\sim 100\text{m}$ precision) to prevent pin-point surveillance while providing actionable neighborhood awareness.
3. **Event-Only Attachment:** Coordinates are captured as a **single static snapshot** at the exact moment of the event. No continuous trail precedes or follows the event.
4. **Consent Denied Fallback:** If location consent is withheld or denied, the notification transmits **only the area name** (e.g., *"Hauz Khas Village"*).

---

## 4. Community Reports & Contributor Privacy

### 4.1 Coarse Association
- Community safety observations are associated strictly with an `areaId`.
- No exact coordinates or street numbers are required or stored in report documents.

### 4.2 Pseudonymized Reporter References
- When reports are displayed to community members or reviewed by moderators in the Admin Dashboard, the author's identity is sanitized via [`adminService.sanitizeReportForAdmin`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/awarely/src/services/admin.service.ts):
  - Anonymous submissions are tagged with a salted pseudonymized hash.
  - Authenticated submissions mask the user's UID (e.g., `usr-***82a`).
  - Raw UIDs and private contact information are permanently stripped from client view.

---

## 5. Contextual Imagery & Metadata Scrubbing

- **Zero-People Guidelines:** The report submission workflow clearly instructs contributors to capture environmental context only (e.g. street lighting, barricades, signage) and **never photograph recognizable faces or license plates**.
- **EXIF / Metadata Sanitization:**
  - Standard digital photos embed EXIF tags containing exact GPS coordinates, timestamps, and camera serial numbers.
  - The production pipeline strips EXIF metadata on the client canvas before uploading to Firebase Storage, ensuring image files cannot leak contributor home locations or trajectories.

---

## 6. Trusted Safety Circle Isolation

- **User-Scoped Isolation:** Trusted contacts are stored in `users/{uid}/trustedContacts/{contactId}`.
- **Rule-Enforced Secrecy:** Firestore security rules grant read and write access **exclusively to the document owner** (`isOwner(uid)`). No public query, search index, or external API can discover who is in another user's safety circle.
- **Peer-to-Peer Notification:** Notifications are delivered directly to the designated contacts via secure server infrastructure (Cloud Functions) without public broadcasting.

---

## 7. Ephemeral Event Lifecycle & TTL Expiry

- Safety events generated at `safetyEvents/{eventId}` represent immediate distress signals.
- They are configured with an **automated 24-hour Time-To-Live (TTL)**:
  ```typescript
  expiresAt: Timestamp.fromMillis(Date.now() + 24 * 3600 * 1000)
  ```
- After 24 hours, events automatically expire and are purged by Firestore TTL policies, preventing the accumulation of historical behavioral dossiers.

---

## 8. Mobile Migration Path (Flutter OS Geofencing)

In the web prototype, location awareness uses foreground browser geolocation checks (`navigator.geolocation.getCurrentPosition`).

When migrating to the Awarely Flutter mobile application:
1. **Zero Foreground Polling:** The app will register static canonical circular regions with native mobile operating system geofencing:
   - Android: `GeofencingClient`
   - iOS: `CLCircularRegion` via CoreLocation
2. **OS-Level Boundary Crossing:** The mobile app remains completely dormant until the operating system fires a low-power boundary event (`ENTER` or `EXIT`).
3. **No Battery Drain & No Continuous GPS:** This eliminates the need for background GPS tracking altogether, preserving battery life and guaranteeing user privacy at the hardware level.

---

## 9. Prototype Limitations & Trade-Offs

1. **Client-Side Storage:** In local demo mode, temporary report drafts and demo data are stored in browser `localStorage`. Users on shared terminals should explicitly use Guest / Incognito mode or trigger *"Delete All Demo Data"*.
2. **Browser Sandbox Vulnerabilities:** If a device's browser is compromised by malicious extensions or malware, local session state could be inspected.
3. **Network Transit:** In production, all communications must use HTTPS with HTTP Strict Transport Security (HSTS) and Content Security Policy (CSP) headers enabled.
