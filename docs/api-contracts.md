# Awarely — API Contracts

**Version:** 1.0.0  
**Date:** October 2026  
**Transport:** All callable functions use Firebase HTTPS Callable Functions (POST to Function URL with Firebase Auth token).

---

## Overview

All server-side operations in Awarely are implemented as **Firebase Cloud Functions**. There is no custom REST API server. Client code invokes functions using the Firebase Functions SDK:

```typescript
// Web
import { httpsCallable } from 'firebase/functions';
const fn = httpsCallable<InputType, OutputType>(functions, 'functionName');
const result = await fn(payload);

// Flutter
final fn = FirebaseFunctions.instance.httpsCallable('functionName');
final result = await fn.call(payload);
```

All callable functions:
- Require a valid Firebase Auth token (enforced automatically by the SDK)
- Return structured responses or throw `HttpsError` on failure
- Are rate-limited at the function level using Cloud Firestore counters

---

## Function Registry

| Function Name | Type | Caller | Description |
|---|---|---|---|
| `resolveArea` | HTTPS Callable | Web + Flutter | Resolves coarse coordinates to an area ID |
| `validateReport` | HTTPS Callable | Web + Flutter | Validates and writes a community report |
| `generateAreaSummary` | HTTPS Callable | Web + Flutter | Triggers Gemini AI summary generation for an area |
| `sendCircleAlert` | HTTPS Callable | Web + Flutter | Sends email/FCM alerts to trusted safety circle |
| `onReportCreated` | Firestore Trigger | Internal | Updates area aggregates on new report |
| `recomputeAreaScore` | Scheduled | Internal | Nightly recalculation of all area metrics |

---

## `resolveArea`

**Purpose:** Takes a single set of coarse coordinates and returns the matching area ID and name. Raw coordinates are never stored.

**Authentication:** Required (including anonymous users)

### Request

```typescript
interface ResolveAreaRequest {
  lat: number;   // Coarse latitude (truncated to 3 decimal places client-side)
  lng: number;   // Coarse longitude (truncated to 3 decimal places client-side)
}
```

> **Privacy note:** The client should truncate coordinates to 3 decimal places (~111m precision) before sending to further reduce precision. The function itself does not store the coordinates.

### Response

```typescript
interface ResolveAreaResponse {
  found: boolean;
  areaId: string | null;
  areaName: string | null;
  city: string | null;
}
```

### Behavior

1. Validates `lat` is in range `[-90, 90]` and `lng` in range `[-180, 180]`.
2. Calls Google Geocoding API (server-side key, IP-restricted) to extract neighborhood + admin level names.
3. Queries Firestore `areas` where `bounds.southWest.lat <= lat <= bounds.northEast.lat` AND `bounds.southWest.lng <= lng <= bounds.northEast.lng` (bounding box pre-filter).
4. For matching documents, runs GeoJSON polygon containment check.
5. Returns first matching area ID and name, or `found: false` if no area is defined for that location.

### Errors

| Code | Message | When |
|---|---|---|
| `invalid-argument` | `"Invalid coordinates"` | `lat`/`lng` out of range or missing |
| `unauthenticated` | `"Authentication required"` | No valid Auth token |
| `not-found` | `"No area found for these coordinates"` | No defined area covers the location (use `found: false` response instead) |
| `internal` | `"Area resolution failed"` | Geocoding API failure |

### Rate Limit

- 10 calls per user per 5-minute window.

---

## `validateReport`

**Purpose:** Validates a community report submission, enforces rate limits, and writes the report to Firestore. The client never writes directly to Firestore reports.

**Authentication:** Required — **non-anonymous users only**

### Request

```typescript
interface ValidateReportRequest {
  areaId: string;
  rating: number;                // 1–5 (integer)
  observations: string[];        // 1–4 items from the approved observation tag list
  customObservation?: string;    // Optional, max 50 chars
  comfortLevel: 'yes' | 'maybe' | 'no';
  note?: string;                 // Optional, max 100 chars
  visitTime: 'morning' | 'afternoon' | 'evening' | 'night';
  photoRef?: string;             // Firebase Storage path (validated to belong to caller)
}
```

### Response

```typescript
interface ValidateReportResponse {
  success: boolean;
  reportId: string;              // Auto-generated Firestore document ID
  message: string;               // Human-readable confirmation
}
```

### Behavior

1. Verifies caller is not anonymous (anonymous users cannot submit reports).
2. Validates `areaId` exists in Firestore `areas` collection.
3. Validates `rating` is an integer 1–5.
4. Validates `observations` contains 1–4 items from the approved `OBSERVATION_TAGS` list (see constants below).
5. Validates `comfortLevel`, `visitTime` are from allowed enum values.
6. Validates `note` and `customObservation` length.
7. Checks rate limit: user has not submitted more than 3 reports for this area in the past 24 hours.
8. Writes report to `areas/{areaId}/reports/{newId}` with server-side fields:
   - `uid` = caller's Firebase Auth UID
   - `isAnonymous` = false
   - `submittedAt` = `FieldValue.serverTimestamp()`
   - `expiresAt` = `submittedAt + 90 days`
   - `platform` = inferred from User-Agent or explicitly passed
9. Returns `reportId`.

### Approved Observation Tags

```typescript
// src/constants/observationTags.ts
export const OBSERVATION_TAGS = [
  'Poor lighting',
  'Well-lit',
  'Crowded',
  'Isolated',
  'Road blocked',
  'Accident or disturbance',
  'Police presence',
  'Felt uncomfortable',
  'Felt comfortable',
  'High foot traffic',
  'Low foot traffic',
  'Businesses open',
  'Area deserted',
] as const;
```

### Errors

| Code | Message | When |
|---|---|---|
| `unauthenticated` | `"Sign in required to submit reports"` | Anonymous or no auth token |
| `not-found` | `"Area not found"` | `areaId` does not exist in Firestore |
| `invalid-argument` | `"Invalid rating"` | `rating` not in 1–5 |
| `invalid-argument` | `"Invalid observations"` | Tags not from approved list or count > 4 |
| `invalid-argument` | `"Invalid comfort level"` | Not one of `yes/maybe/no` |
| `resource-exhausted` | `"Report limit reached. Try again tomorrow."` | > 3 reports for this area in 24h |
| `internal` | `"Failed to submit report"` | Firestore write failure |

### Rate Limit

- 3 report submissions per user per area per 24 hours.
- Tracked via Cloud Firestore counter on `users/{uid}` document.

---

## `generateAreaSummary`

**Purpose:** Triggers Gemini AI to generate or refresh the neutral awareness summary for a given area. Gemini API key is in Secret Manager — never client-accessible.

**Authentication:** Required (including anonymous users — reading summaries is public)

### Request

```typescript
interface GenerateAreaSummaryRequest {
  areaId: string;
  force?: boolean;               // Admin only: bypass cache check
}
```

### Response

```typescript
interface GenerateAreaSummaryResponse {
  summary: string;
  generatedAt: string;           // ISO 8601 timestamp
  cached: boolean;               // true if returning cached value, false if freshly generated
}
```

### Behavior

1. Validates `areaId` exists in Firestore.
2. Checks cache: if `area.aiSummary` is not null AND `aiSummaryGeneratedAt` is within 6 hours AND fewer than 3 new reports since last generation → return cached summary.
3. If cache is stale or missing:
   a. Fetches recent observation tags from `areas/{areaId}/reports` (last 48h, admin SDK read).
   b. Constructs templated prompt (see architecture.md for template).
   c. Calls Gemini API with `GEMINI_API_KEY` from Secret Manager.
   d. Updates `area.aiSummary` and `area.aiSummaryGeneratedAt` in Firestore.
4. Returns summary and generation timestamp.

### Errors

| Code | Message | When |
|---|---|---|
| `not-found` | `"Area not found"` | Invalid `areaId` |
| `unauthenticated` | `"Authentication required"` | No Auth token |
| `internal` | `"AI summary generation failed"` | Gemini API error |
| `resource-exhausted` | `"Summary generation limit reached"` | Too many forced regenerations (admin rate limit) |

### Rate Limit

- Auto-triggered: governed by cache rules above.
- Force-trigger (`force: true`): admin only, 1 per area per 30 minutes.

---

## `sendCircleAlert`

**Purpose:** Sends email notifications (and future FCM push) to the authenticated user's trusted safety circle contacts.

**Authentication:** Required — **non-anonymous users only**

### Request

```typescript
interface SendCircleAlertRequest {
  areaId: string;
  areaName: string;              // Denormalized for email without extra Firestore read
  userAlias?: string;            // Display alias (defaults to user.preferredAlias or "A contact")
  personalMessage?: string;      // Optional message (max 200 chars)
  timestamp: string;             // ISO 8601 timestamp from client
}
```

### Response

```typescript
interface SendCircleAlertResponse {
  success: boolean;
  contactsNotified: number;      // Number of contacts emailed
  alertId: string;               // ID of the alertHistory record
  remainingAlerts: number;       // Alerts remaining in current 24h window
}
```

### Behavior

1. Verifies caller is not anonymous.
2. Reads caller's `trustedContacts` from `users/{uid}/trustedContacts`.
3. Validates rate limit: caller has not triggered more than 3 alerts in the past 24 hours.
4. Validates `personalMessage` length if present.
5. Validates `areaId` exists.
6. Dispatches email via SendGrid to each contact using the pre-defined email template.
7. Writes an `alertHistory` record to `users/{uid}/alertHistory`.
8. Returns notification summary.

### Errors

| Code | Message | When |
|---|---|---|
| `unauthenticated` | `"Sign in required to send alerts"` | Anonymous or no auth |
| `not-found` | `"No trusted contacts found"` | User has no contacts configured |
| `resource-exhausted` | `"Alert limit reached. Please wait before sending again."` | > 3 alerts in 24h |
| `invalid-argument` | `"Message too long"` | `personalMessage` > 200 chars |
| `internal` | `"Failed to send alert"` | SendGrid API failure |

### Rate Limit

- 3 circle alerts per user per 24 hours.

---

## Firestore Trigger: `onReportCreated`

**Type:** Firestore `onCreate` trigger on `areas/{areaId}/reports/{reportId}`

**Purpose:** Keeps area aggregate metrics up-to-date in near real-time.

### Actions

1. Increments `area.reportCount` by 1 using `FieldValue.increment(1)`.
2. Sets `area.latestReportAt` to the new report's `submittedAt`.
3. Increments user's `reportCount` by 1.
4. Checks if Gemini summary cache should be invalidated:
   - If it has been 3+ reports since `aiSummaryGeneratedAt`: marks `area.aiSummary = null` to indicate stale cache (summary will be regenerated on next client request).

### Input

```typescript
// Firestore document snapshot at areas/{areaId}/reports/{reportId}
// Fields: all Report fields
```

### Side Effects

- Atomic `FieldValue.increment` operations on `areas/{areaId}`.
- Atomic `FieldValue.increment` on `users/{uid}.reportCount`.

---

## Scheduled Function: `recomputeAreaScore`

**Schedule:** Nightly at 02:00 UTC (`0 2 * * *`)

**Purpose:** Recalculates area awareness metrics that require aggregation across many reports (too expensive for real-time triggers).

### Per-Area Computation

For each active area in Firestore:

1. Queries `areas/{areaId}/reports` where `submittedAt >= now - 48h`.
2. Counts `recentReportCount`.
3. Tallies observation tag frequencies → computes `topObservations` (top 3).
4. Computes `dayNightSplit` based on `visitTime` field distribution.
5. Computes `confidenceLevel`:
   - `"high"` if `recentReportCount >= 10`
   - `"moderate"` if `3 <= recentReportCount < 10`
   - `"low"` if `recentReportCount < 3 OR latestReportAt > 48h ago`
6. Computes `awarenessLevel` based on tag distribution and count.
7. Writes all recomputed fields back to the area document atomically.
8. Also sweeps for expired reports (`expiresAt < now`) and deletes them.

---

## Error Code Reference

All `HttpsError` codes follow the Firebase standard:

| Code | HTTP Equivalent | Usage |
|---|---|---|
| `ok` | 200 | Success |
| `invalid-argument` | 400 | Malformed request payload |
| `unauthenticated` | 401 | Missing or invalid auth token |
| `permission-denied` | 403 | Auth token valid but insufficient permissions |
| `not-found` | 404 | Referenced resource (area, user) does not exist |
| `resource-exhausted` | 429 | Rate limit exceeded |
| `internal` | 500 | Unexpected server-side error |
| `unavailable` | 503 | Dependency (Gemini, SendGrid) temporarily unavailable |

---

## Flutter SDK Equivalents

```dart
// Flutter equivalents for all callable functions

// resolveArea
final resolveArea = FirebaseFunctions.instance.httpsCallable('resolveArea');
final result = await resolveArea.call({
  'lat': truncatedLat,
  'lng': truncatedLng,
});

// validateReport
final validateReport = FirebaseFunctions.instance.httpsCallable('validateReport');
final result = await validateReport.call({
  'areaId': areaId,
  'rating': rating,
  'observations': ['Crowded', 'Well-lit'],
  'comfortLevel': 'yes',
  'visitTime': 'afternoon',
});

// generateAreaSummary
final generateSummary = FirebaseFunctions.instance.httpsCallable('generateAreaSummary');
final result = await generateSummary.call({'areaId': areaId});

// sendCircleAlert
final sendAlert = FirebaseFunctions.instance.httpsCallable('sendCircleAlert');
final result = await sendAlert.call({
  'areaId': areaId,
  'areaName': areaName,
  'timestamp': DateTime.now().toIso8601String(),
});
```
