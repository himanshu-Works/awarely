# Awarely — Firestore Database Architecture & Data Model

**Version:** 2.0.0  
**Status:** Approved Architecture  
**Database:** Cloud Firestore (Native Mode)

---

## 1. Architectural Philosophy & Privacy Principles

1. **Area-Centric, Never Route- or Street-Centric:**  
   The fundamental unit of observation is a **bounded geographic area** (`neighborhood`, `locality`, `market`, `station area`, `chowk`). Awarely never creates entities for individual roads or routes.
2. **Write-Protection of Computed Safety Scores:**  
   All safety scores (`overallScore`, `timeScores`, `confidence`, `reportCount`) are computed strictly server-side (via Cloud Functions and scheduled aggregators). **Clients are cryptographically and rule-enforced prevented from mutating safety scores.**
3. **Zero Location Tracking / Zero Routes:**  
   Awarely does **NOT** maintain continuous location trails, breadcrumbs, travel paths, or route collections. Safety events store only coarse area references.
4. **Zero-Fabrication Data Integrity:**  
   When an area has no community submissions, it is flagged as `Limited community data` with `reportCount: 0`. No synthetic or assumed scores are generated.

---

## 2. Collection Overview

```
Firestore Root
├── users/                          [Owner read/write, Admin read; role is immutable by client]
│   └── {uid}/
│       └── trustedContacts/        [User-scoped emergency contacts; max 3]
│           └── {contactId}
│
├── areas/                          [Public read; Admin / Cloud Function write only]
│   └── {areaId}
│
├── reports/                        [Authenticated read; validateReport Cloud Function write]
│   └── {reportId}
│
├── areaSummaries/                  [Public read; AI Gemini generation function write only]
│   └── {areaId}
│
└── safetyEvents/                   [Event owner & Admin read; no continuous location / routes]
    └── {eventId}
```

---

## 3. Logical Entity Specifications

### 3.1 USERS (`users/{uid}`)

Master user profile containing identity, role, notification preferences, and legal consent audit.

```typescript
export interface UserProfile {
  uid: string
  displayName: string | null
  email: string | null
  photoURL?: string | null
  isAnonymous: boolean
  role: 'user' | 'admin' | 'dev'
  preferences: {
    notificationsEnabled: boolean
    theme: 'dark' | 'light' | 'system'
    coarseLocationConsent: boolean
  }
  alertEnabled: boolean             // Master toggle for emergency circle alerts
  safetyCirclePaused: boolean       // Temporary privacy pause for circle notifications
  consent: {
    termsAccepted: boolean
    termsAcceptedAt: Timestamp
    privacyAccepted: boolean
    privacyAcceptedAt: Timestamp
    dataRetentionPolicyAcknowledged: boolean
  }
  createdAt: Timestamp
  updatedAt: Timestamp
  preferredAlias?: string | null
  reportCount: number
}
```

#### Field Specifications:
| Field | Type | Description | Security |
|---|---|---|---|
| `displayName` | `string \| null` | Contributor display name | Owner editable |
| `email` | `string \| null` | Authenticated email address | Owner editable |
| `role` | `'user' \| 'admin' \| 'dev'` | Role-based access control | **Admin write only** |
| `preferences` | `Map` | UI theme and location consent flags | Owner editable |
| `alertEnabled` | `boolean` | Whether emergency alerts are enabled | Owner editable |
| `safetyCirclePaused` | `boolean` | Mute circle auto-broadcasts | Owner editable |
| `consent` | `Map` | Audit log of accepted legal policies | Owner editable |
| `createdAt` | `Timestamp` | Account creation timestamp | Immutable |
| `updatedAt` | `Timestamp` | Profile last modified timestamp | Owner editable |

---

### 3.2 AREAS (`areas/{areaId}`)

Canonical master entity for each monitored geographic district. Document ID follows the canonical slug: `area-[country_code]-[city]-[primary_area_slug]`.

```typescript
export interface Area {
  id: string
  canonicalName: string             // e.g. "Bandra West (Carter Rd & Pali Hill)"
  city: string                      // e.g. "Mumbai"
  locality: string                  // e.g. "Bandra West"
  postalCode: string | null         // e.g. "400050"
  center: {
    latitude: number
    longitude: number
  }
  radiusMeters: number              // e.g. 1200
  placeId: string | null            // Google Places Place ID if linked
  source: 'seed' | 'google_places' | 'osm' | 'admin' | 'user_reported'
  status: 'active' | 'under_review' | 'inactive'
  bounds: {
    northEast: { latitude: number; longitude: number }
    southWest: { latitude: number; longitude: number }
  }
  polygon: string                   // GeoJSON Polygon string

  // ── Computed Safety & Community Metrics (Server-Aggregated Only) ──
  reportCount: number               // Total verified contributions
  confidence: 'high' | 'moderate' | 'low'
  overallScore: number | null       // 0–100 non-judgmental aggregated comfort rating
  timeScores: {
    day: number                     // 0–100 daytime comfort rating
    evening: number                 // 0–100 evening comfort rating
    night: number                   // 0–100 night comfort rating
  }
  lastReportAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### Client Mutation Prohibition
> **CRITICAL RULE:** Clients cannot directly write to `areas/{areaId}`. All computed fields (`overallScore`, `timeScores`, `confidence`, `reportCount`) are calculated exclusively via Cloud Function aggregations upon report verification.

---

### 3.3 REPORTS (`reports/{reportId}`)

Community observation submissions capturing environmental perception (illumination, foot traffic, presence of assistance).

```typescript
export interface Report {
  id: string
  areaId: string                    // Reference to enclosing canonical area
  reporterUid: string | null        // Null if submitted anonymously
  reporterRef?: string              // Salted HMAC pseudonym for anonymous users
  rating: number                    // 1–5 comfort perception
  timeContext: 'morning' | 'afternoon' | 'evening' | 'night'
  tags: string[]                    // e.g. ["Well-lit", "High foot traffic"]
  note: string | null               // Clean text context; PII stripped
  photoUrl: string | null           // Optional verification asset
  createdAt: Timestamp
  expiresAt: Timestamp              // Auto-deletion TTL (createdAt + 90 days)
  moderationStatus: 'approved' | 'pending' | 'flagged' | 'archived'
  weight: number                    // Credibility weight assigned by server (default 1.0)
  platform: 'web' | 'android' | 'ios'
}
```

#### Privacy Protections:
1. **No Exact GPS Coordinates:** Reports bind solely to `areaId`.
2. **Anonymous Reference:** For anonymous contributors, `reporterUid` is null; a non-reversible cryptographic hash (`reporterRef`) prevents multiple spam submissions within a rate limit without compromising identity.
3. **90-Day Ephemeral TTL:** All reports expire automatically after 90 days.

---

### 3.4 AREA SUMMARIES (`areaSummaries/{areaId}`)

AI-synthesized contextual summaries generated via Gemini. Includes specific contextual breakdowns for **day**, **evening**, and **night**.

```typescript
export interface AreaSummaryDoc {
  areaId: string
  summaryText: string               // Overall synthesis
  freshnessText: string             // e.g. "Updated 18 min ago"
  confidenceLabel: 'High confidence' | 'Moderate confidence' | 'Low confidence'
  generatedAt: Timestamp
  sourceReportCount: number
  modelVersion: string              // e.g. "gemini-1.5-flash"
  
  day: {
    summaryText: string
    freshnessText: string
    confidenceLabel: 'High confidence' | 'Moderate confidence' | 'Low confidence'
    comfortScore: number            // 0–100
    topObservations: string[]
  }
  evening: {
    summaryText: string
    freshnessText: string
    confidenceLabel: 'High confidence' | 'Moderate confidence' | 'Low confidence'
    comfortScore: number
    topObservations: string[]
  }
  night: {
    summaryText: string
    freshnessText: string
    confidenceLabel: 'High confidence' | 'Moderate confidence' | 'Low confidence'
    comfortScore: number
    topObservations: string[]
  }
}
```

---

### 3.5 TRUSTED CONTACTS (`users/{uid}/trustedContacts/{contactId}`)

User-scoped sub-collection containing emergency peers designated by the member (maximum 3 contacts).

```typescript
export interface TrustedContact {
  id: string
  name: string
  email: string | null
  phone: string | null
  relationship: string              // e.g. "Family / Primary"
  addedAt: Timestamp
  notifyOnAlert: boolean
}
```

---

### 3.6 SAFETY EVENTS (`safetyEvents/{eventId}`)

Acoustic siren events, check-ins, or circle alerts.

```typescript
export interface SafetyEvent {
  id: string
  uid: string                       // Event initiator
  eventType: 'siren_triggered' | 'circle_checkin' | 'distress_alert'
  areaId: string                    // Coarse area reference only
  areaName: string                  // Human-readable locality
  triggeredAt: Timestamp
  expiresAt: Timestamp              // Auto-expiry TTL (triggeredAt + 24 hours)
  status: 'active' | 'resolved' | 'cancelled'
  notifiedContactCount: number
  note?: string | null
}
```

#### Strict Anti-Tracking Invariants:
- **No Routes:** No polyline, directions, origin, or destination data is accepted.
- **No Exact Coordinates:** Uses only coarse `areaId`.
- **No Continuous Location:** Each event is a single point-in-time notification record.
- **24-Hour Ephemeral Purge:** Events expire automatically after 24 hours.

---

## 4. Firestore Security Rules Summary

Enforced in [`firestore.rules`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/awarely/firestore.rules):
- **`areas/{areaId}`:** `read: if true; write: if isAdmin();` (client cannot modify computed safety scores).
- **`areaSummaries/{areaId}`:** `read: if true; write: if isAdmin();`.
- **`reports/{reportId}`:** `read: if isAuthenticated(); write: if isAuthenticated() && moderationStatus == 'pending' && weight == 1.0;`.
- **`users/{uid}`:** `read, write: if isOwner(uid);` (cannot change `role`).
- **`users/{uid}/trustedContacts/{contactId}`:** `read, write: if isOwner(uid);`.
- **`safetyEvents/{eventId}`:** `read: if isOwner(uid); create: if request.resource.data.uid == request.auth.uid;`.
- **Forbidden collections:** `routes/{document=**}` and `locationHistory/{document=**}` are permanently denied.

---

## 5. Composite Query Indexes

Configured in [`firestore.indexes.json`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/awarely/firestore.indexes.json):
1. `areas`: `(city ASC, status ASC, reportCount DESC)`
2. `areas`: `(isActive ASC, city ASC)`
3. `reports`: `(areaId ASC, createdAt DESC)`
4. `reports`: `(areaId ASC, moderationStatus ASC, createdAt DESC)`
5. `safetyEvents`: `(uid ASC, triggeredAt DESC)`
6. `safetyEvents`: `(areaId ASC, triggeredAt DESC)`
