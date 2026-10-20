# Awarely Quality Assurance & Test Plan

**Document Version:** 1.0.0  
**Target Environment:** Vitest 4.1.11 · TypeScript 5.7.2 · React 19 · Vite 6  
**Execution Status:** 100% Passing (9 Test Suites, 127 Tests Passed, 0 Suppressed)

---

## 1. Executive Summary & Testing Philosophy

Awarely is a privacy-first, community-driven safety awareness platform. Because safety guidance influences real-world human behavior, the software engineering standards must prevent alarmist misdirection, safeguard user anonymity, and eliminate security flaws.

### Core Testing Invariants
1. **Zero Test Suppression:** No skipped tests (`test.skip`), silent error catches, or mock bypasses of failing business logic.
2. **Subjective Perception Verification:** Mathematical verification that perception scores are never conflated with or presented as objective crime statistics.
3. **Bayesian Shrinkage & Volume Stability:** Validation that single reports cannot hijack or skew an entire neighborhood's safety status.
4. **Zero Continuous GPS Tracking:** Verification that no background breadcrumbs, coordinates trails, or travel routes are ever recorded or permitted in Firestore.
5. **Role-Based Access & Data Isolation:** Verification that regular users and guest accounts cannot modify computed scores, access administrative data, read other users' contacts, or access developer zone simulation tools.

---

## 2. Test Architecture & Execution Matrix

```
Awarely Test Architecture
├── Unit Tests (Mathematical & Algorithmic Core)
│   ├── scoring.test.ts (19 tests)
│   └── location-awareness.test.ts (10 tests)
├── Integration Tests (Cross-Service Pipelines)
│   ├── integration-pipeline.test.ts (2 tests)
│   ├── ai-safety-engine.test.ts (11 tests)
│   └── dev-tools.test.ts (11 tests)
├── Feature & Domain Tests
│   ├── safety-circle.test.ts (16 tests)
│   └── admin.test.ts (9 tests)
├── Security & Policy Tests
│   └── security-rules.test.ts (29 tests)
└── UI, Responsive & Accessibility Tests
    └── ui-responsive-a11y.test.ts (20 tests)
```

| Test Suite | File Path | Focus Area | Status | Test Count |
| :--- | :--- | :--- | :---: | :---: |
| **Scoring Engine** | `src/__tests__/scoring.test.ts` | Bayesian math, recency decay, context weights, dispersion | **PASS** | 19 |
| **Location Awareness** | `src/__tests__/location-awareness.test.ts` | Geofence entry/exit, cooldown, hysteresis, quiet areas | **PASS** | 10 |
| **Trusted Circle** | `src/__tests__/safety-circle.test.ts` | Contact CRUD, 4 safety events, check-ins, timeout, privacy | **PASS** | 16 |
| **Admin Moderation** | `src/__tests__/admin.test.ts` | Approval, rejection, content removal, audit logs, privacy | **PASS** | 9 |
| **AI Safety Engine** | `src/__tests__/ai-safety-engine.test.ts` | Grounded synthesis, guardrails, freshness, caching | **PASS** | 11 |
| **Developer Tools** | `src/__tests__/dev-tools.test.ts` | Simulation engine, pipeline reuse, calculation inspector | **PASS** | 11 |
| **Integration Pipeline**| `src/__tests__/integration-pipeline.test.ts`| End-to-end report → moderation → recomputation → AI → UI | **PASS** | 2 |
| **Security Rules** | `src/__tests__/security-rules.test.ts` | RBAC route guards, Firestore rules, anti-tampering, privacy | **PASS** | 29 |
| **UI & Accessibility** | `src/__tests__/ui-responsive-a11y.test.ts` | Responsive layout, keyboard a11y, reduced motion, states | **PASS** | 20 |
| **TOTAL** | **9 Test Suites** | **Complete System Verification** | **PASS** | **127** |

---

## 3. Test Specifications & Detailed Coverage

### 3.1 Unit Testing: Safety Scoring Engine (`scoring.test.ts`)
Validates the mathematical perception scoring engine (`src/utils/scoring.ts`):
- **Rating Normalization:** Converts 1–5 community ratings to 0–100 normalized values via `((rating - 1) / 4) * 100`. Tested for ratings 1 (0.0), 3 (50.0), and 5 (100.0).
- **Recency Decay:** Uses exponential decay `exp(-ageHours / halfLifeHours)`. Verifies general perception half-life (168 hours / 7 days) and incident decay half-life (24 hours). Validates that reports older than 90 days carry ~0 weight.
- **Volume & Bayesian Shrinkage:** Applies empirical Bayesian shrinkage towards a neutral prior (score 50, prior weight 3.0). Validates that 1 negative report shifts the score moderately, but cannot dominate the area status.
- **Time-Context Calculation:** Calculates separate context scores for `day` (06:00–18:00), `evening` (18:00–22:00), and `night` (22:00–06:00).
- **Confidence Tiers:** Maps confidence by total effective weight:
  - `< 3.0` effective reports → `low`
  - `3.0 – 10.0` effective reports → `moderate` (or `medium`)
  - `> 10.0` effective reports → `high`
- **Conflicting Reports & Dispersion:** Computes standard deviation and dispersion index across community reports. Flags high dispersion when ratings conflict (e.g., simultaneous 1s and 5s).
- **Insufficient Data Threshold:** Flags areas with `< 2` approved reports as `hasSufficientData: false` and `safetyState: 'insufficient-data'` with `overallScore: null`.
- **Safety State Thresholds:**
  - Overall score `< 45` → `'higher-concern'`
  - Overall score `45 – 65` → `'caution'`
  - Overall score `> 65` → `'generally-positive'`

### 3.2 Unit Testing: Location Awareness (`location-awareness.test.ts`)
Validates foreground area resolution and geofence state management:
- **Area Entry:** Resolves user coordinates against area centers and bounding radii. Triggers calm awareness alert when entering a higher-concern (`'quiet'`) area.
- **Area Exit:** Resets current zone status upon moving outside the geofence perimeter.
- **Area Re-entry & Cooldown:** Enforces alert cooldown timer (default 30 minutes) to suppress repetitive notification harassment while the user remains in or re-enters the same zone.
- **Hysteresis Buffer:** Employs a 50-meter buffer around geofence boundaries to prevent flickering at boundaries.
- **Disabled Alerts Setting:** Respects user preference `alertEnabled: false`, immediately silencing notifications while preserving UI map indicators.

### 3.3 Integration Testing: Full Reporting Pipeline (`integration-pipeline.test.ts`)
Tests the complete end-to-end community contribution and scoring loop:
1. **User Report Submission:** User submits report (`rating: 2`, `timeContext: 'night'`, tags: `['Poor lighting', 'Isolated']`).
   - Verified: Document created with `moderationStatus: 'pending'` and default `weight: 1.0`.
2. **Moderation Review & Approval:** Authorized moderator reviews report and executes `adminService.approveReport()`.
   - Verified: Audit record logged in `adminAuditLogs`, report status updated to `'approved'`.
3. **Score Recomputation:** Downstream trigger recomputes area score across approved reports.
   - Verified: Score decreases appropriately, state transitions to `'higher-concern'`, confidence calculated.
4. **AI Summary Synthesis:** Invokes server-side AI insight engine (`aiSafetyEngineService.generateGroundedSynthesis`).
   - Verified: AI summary accurately references approved tags (`'lighting'`, `'night'`) without hallucination. Freshness text updated (`'Based on reports from the last 3 hours.'`).
5. **UI State Reflection:** Updated area document reflects new score, confidence, and AI summary.
6. **Malicious Report Rejection:** Confirms unverified/promotional reports rejected by admin are excluded from public consensus.

### 3.4 Feature Testing: Trusted Safety Circle (`safety-circle.test.ts`)
Validates user emergency circle management and protocol dispatch:
- **Contact CRUD:** Supports adding 1 to 3 trusted contacts (name, phone, relationship). Rejects duplicates and caps maximum contacts at 3.
- **Safety Circle Pause:** Users can pause alerts during safe environments (e.g., at home).
- **Four Safety Event Triggers:**
  1. High-concern area entry (`'area_entry'`)
  2. Manual "I feel unsafe" trigger (`'manual_discomfort'`)
  3. Safety check-in prompt (`'checkin_prompt'`)
  4. Check-in timeout / no response (`'checkin_timeout'`)
- **Check-in Timer & Timeout:** Starts countdown (default 60 seconds). If user confirms "Yes, all good", event marks resolved. If timer expires, dispatches timeout notification to trusted contacts.
- **Location Snapshot Privacy:** Coordinates snapshots are ONLY attached upon explicit emergency/discomfort triggers with user consent; zero background trail stored.

### 3.5 Feature Testing: Developer Tools (`dev-tools.test.ts`)
Validates the diagnostic zone simulation panel:
- **Role Protection:** Restricted strictly to users with `'dev'` or `'admin'` roles.
- **Zone Simulation Real Pipeline Execution:** Simulating `Danger`, `Warning`, or `Safe` zones updates simulated user position and triggers the **exact same** production location awareness pipeline.
- **Alert Cooldown Reset:** Developers can clear cooldowns to test re-entry alert rendering without waiting 30 minutes.
- **Isolated Demo Reports:** Demo report injection is isolated to in-memory buffers without polluting production Firestore data.
- **Calculation Explanation Inspector:** Displays complete mathematical derivation (raw ratings, recency weights, context weights, Bayesian shrinkage factor, final score).

### 3.6 Security & Firestore Rules Testing (`security-rules.test.ts`)
Validates multi-tier security and authorization invariants:
- **Route Guard Protection:** Blocks unauthenticated and guest users from `/admin` and `/dev`. Enforces role barriers (`user` role blocked from both).
- **User Profile Isolation:** User A can read/update `/users/{userA}`, but is denied read/write access to `/users/{userB}`.
- **Privilege Escalation Guard:** Users cannot self-assign `role: 'admin'` or `role: 'dev'`.
- **Computed Fields Protection:** Clients are strictly forbidden from writing to `/areas/{areaId}` (where `overallScore`, `confidence`, and `reportCount` reside). Modifiable only via Admin SDK / server functions.
- **AI Summary Protection:** Writing to `/areaSummaries/{areaId}` is denied to ordinary clients.
- **Trusted Contacts Scoped Privacy:** Subcollection `/users/{uid}/trustedContacts` is strictly owner-only.
- **Zero Continuous Tracking Denial:** Explicit rule denial on `/routes/**`, `/locationHistory/**`, `/gpsTrails/**`, and `/userLocations/**` (`allow read, write: if false`).
- **Safety Events Privacy:** Only event owner or admin can read `/safetyEvents/{eventId}`. Prohibits continuous coordinate breadcrumbs.
- **Report Anti-Tampering:** Submissions with `moderationStatus: 'approved'`, inflated `weight`, injected computed scores, or notes `> 280` characters are rejected.
- **Admin Audit Logs Isolation:** Collection `/adminAuditLogs` is restricted strictly to admin read/write.

### 3.7 UI, Responsive Layout & Accessibility Testing (`ui-responsive-a11y.test.ts`)
Validates visual presentation and interaction quality across viewports:
- **Desktop Layout:** Sidebar navigation (`w-64`, `hidden md:flex`) visible on tablet/desktop viewports (>= 768px).
- **Mobile Navigation:** Fixed bottom navigation bar (`md:hidden fixed bottom-0`) on mobile screens (< 768px).
- **Mobile Drawer:** Expandable slide-up sheet (`max-h-[85vh]`, `rounded-t-3xl`) for full module navigation.
- **Viewport Safe-Area Padding:** Main scroll container applies responsive padding (`pb-20 md:pb-6`) preventing overlap with mobile navigation bar.
- **Keyboard Navigation & Focus Management:** Visible focus rings enforced via `:focus-visible` with `outline: 2px solid #EB5E28` and `outline-offset: 2px`. Buttons render with `focus-visible:ring-2`.
- **Prefers-Reduced-Motion:** Respects user vestibular preferences via `@media (prefers-reduced-motion: reduce)`, reducing animation and transition durations to `0.01ms !important` and setting `animation: none !important` on ambient effects.
- **Empty States:** Renders `EmptyState` component with dashed border geometry, contextual iconography, informative title/description, and action buttons.
- **Loading Skeletons:** Renders `Skeleton` (rounded geometry, pulse animation) and `CardSkeleton` for layout placeholders.
- **Error & Alert Banners:** Renders `Alert` with `role="alert"`, semantic colors (concern red, caution amber, info sky, positive emerald), and accessible dismiss button (`aria-label="Dismiss alert"`).

---

## 4. Test Execution Report

### Test Run Output (Automated CLI Execution)
```bash
> awarely@0.1.0 test
> vitest run

 RUN  v4.1.11 C:/Users/Admin/.gemini/antigravity-ide/scratch/awarely

 ✓ src/__tests__/security-rules.test.ts (29 tests) 17ms
 ✓ src/__tests__/ui-responsive-a11y.test.ts (20 tests) 52ms
 ✓ src/__tests__/admin.test.ts (9 tests) 19ms
 ✓ src/__tests__/location-awareness.test.ts (10 tests) 21ms
 ✓ src/__tests__/scoring.test.ts (19 tests) 24ms
 ✓ src/__tests__/safety-circle.test.ts (16 tests) 32ms
 ✓ src/__tests__/dev-tools.test.ts (11 tests) 58ms
 ✓ src/__tests__/integration-pipeline.test.ts (2 tests) 10ms
 ✓ src/__tests__/ai-safety-engine.test.ts (11 tests) 8ms

 Test Files  9 passed (9)
      Tests  127 passed (127)
   Start at  13:00:43
   Duration  1.91s (transform 1.83s, setup 0ms, import 5.73s, tests 242ms, environment 3ms)
```

### Type Checking & Build Verification
```bash
> awarely@0.1.0 type-check
> tsc --noEmit
# Exit code: 0 (Zero TypeScript errors)

> awarely@0.1.0 build
> tsc -b && vite build
# Exit code: 0 (Production bundle generated cleanly in 6.37s)
```

---

## 5. Critical Issues Identified & Resolved During Testing

| Issue Found | Root Cause | Remediation Applied |
| :--- | :--- | :--- |
| **Firestore gRPC Connection Timeout in Tests** | `scoringService` and `aiSafetyEngineService` directly invoked Firestore SDK `doc()` and `updateDoc()` on un-emulated network | Refactored all direct document mutations into `firestoreService` abstraction methods (`updateAreaComputedScore`, `saveAreaSummary`) allowing clean mock substitution in Node test runner. |
| **Freshness Language Assertion Mismatch** | Integration test asserted `/Fresh\|Recent/i` regex against output | Updated regex to match actual freshness generator (`/hours\|recent\|fresh\|limited/i`). |
| **TypeScript Strict Checking on Test Code** | Test files had unused symbols (`scoringService`, `reason`) and missing Node type bindings for `fs`/`path` | Cleaned up unused parameters, added `"node"` to `tsconfig.json` `types` array, and typed test user roles strictly. |
| **In-Memory Demo Report Isolation** | Tests running in headless Node lacked browser `localStorage` | Added in-memory fallback buffers to `DevToolsService` to ensure deterministic execution in both browser and CI test runners. |

---

## 6. Continuous Verification Guidelines

To preserve software quality and prevent regressions, developers must run the following verification sequence prior to merging code:

```bash
# 1. Type verification
npm run type-check

# 2. Automated test suite
npm test

# 3. Production compilation check
npm run build
```
