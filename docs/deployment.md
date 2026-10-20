# Awarely — Production Deployment & Operations Guide

**Version:** 1.0.0  
**Target Environment:** Firebase Hosting & Firebase Cloud Functions  
**Last Updated:** October 2026

---

## 1. Overview & Architecture

Awarely is deployed as a high-performance Single Page Application (SPA) on **Firebase Hosting** backed by **Firebase Cloud Functions** (Node.js 20 runtime) for privileged server-side operations (Gemini AI safety engine, report validation, rate limiting, and trusted circle notification dispatch).

```
                      ┌──────────────────────────────────────┐
                      │        Firebase Hosting (CDN)        │
                      │  • dist/index.html (no-cache)        │
                      │  • dist/assets/** (immutable, 1y)    │
                      │  • Security headers & CSP            │
                      └──────────────────┬───────────────────┘
                                         │
             ┌───────────────────────────┴───────────────────────────┐
             ▼                                                       ▼
┌─────────────────────────┐                             ┌─────────────────────────┐
│     Cloud Firestore     │                             │  Cloud Functions (v2)   │
│ • areas/                │                             │ • resolveArea           │
│ • reports/              │                             │ • validateReport        │
│ • users/{uid}/...       │                             │ • generateAreaSummary   │
│ • areaSummaries/        │                             │ • sendCircleAlert       │
│ • Security Rules        │                             │ • onReportCreated       │
└─────────────────────────┘                             └────────────┬────────────┘
                                                                     │
                                                        ┌────────────▼────────────┐
                                                        │ Google Secret Manager   │
                                                        │ • GEMINI_API_KEY        │
                                                        │ • MAPS_SERVER_KEY       │
                                                        └─────────────────────────┘
```

---

## 2. Environment Configuration

### 2.1 Frontend Variables (`.env.production` / `.env.local`)

These variables configure client-side Firebase and Google Maps SDKs. They are restricted via **Firestore Security Rules**, **Firebase Auth**, and **HTTP Referrer Restrictions** in Google Cloud Console.

```env
# ── Firebase Client Config ───────────────────────────────────────────
VITE_FIREBASE_API_KEY="AIzaSyYourRestrictedWebClientApiKey"
VITE_FIREBASE_AUTH_DOMAIN="awarely-safety.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="awarely-safety"
VITE_FIREBASE_STORAGE_BUCKET="awarely-safety.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
VITE_FIREBASE_APP_ID="1:123456789012:web:abcdef123456"

# ── Google Maps JavaScript SDK ─────────────────────────────────────────
# HTTP Referrer restricted to https://awarely-safety.web.app/* and your custom domain
VITE_GOOGLE_MAPS_API_KEY="AIzaSyYourRestrictedGoogleMapsClientKey"

# ── Application Environment ────────────────────────────────────────────
VITE_APP_ENV="production"
VITE_USE_EMULATORS="false"
```

### 2.2 Server-Side Secrets (Google Cloud Secret Manager)

Secrets are **NEVER** exposed as `VITE_` variables. They are injected into Cloud Functions via Google Cloud Secret Manager:

1. `GEMINI_API_KEY`: API credential for Gemini model execution.
2. `MAPS_SERVER_API_KEY`: IP-restricted Google Geocoding / Elevation API key.
3. `SENDGRID_API_KEY`: SMTP/Transactional email key for trusted circle alerts.

---

## 3. Development Setup

### 3.1 Prerequisites

- Node.js `v20.x` or `v22.x`
- npm `v10.x`
- Firebase CLI: `npm install -g firebase-tools` (or use `npx firebase-tools`)

### 3.2 Local Development Commands

```bash
# Install root dependencies
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..

# Start Vite HMR Dev Server (http://localhost:5173)
npm run dev

# Run Vitest test suite
npm test

# Type-check TypeScript codebase
npm run type-check

# Run Firebase Local Emulator Suite (Auth, Firestore, Hosting, Storage, Functions)
npx firebase-tools emulators:start
```

---

## 4. Production Build

Build the production bundle with TypeScript type-checking, CSS minification, and Rollup vendor code-splitting:

```bash
# Build frontend web bundle into dist/
npm run build

# Build both frontend and Cloud Functions
npm run build:all
```

**Build Output Structure:**
- `dist/index.html`: Entry point with asset hashes
- `dist/assets/index-*.js`: Core React runtime & layout
- `dist/assets/firebase-core-*.js`: Firebase App & Auth runtime (~179 kB)
- `dist/assets/firebase-data-*.js`: Firestore & Storage runtime (~334 kB)
- `dist/assets/SafetyMapPage-*.js`: Lazy-loaded map container (~13 kB)
- `dist/assets/AdminDashboardPage-*.js`: Lazy-loaded admin panel (~25 kB)
- `dist/assets/DevToolsPage-*.js`: Lazy-loaded simulation tools (~29 kB)

---

## 5. Deployment Procedures

### 5.1 One-Time Firebase Project Initialization

```bash
# Log in to Google Firebase
firebase login

# Set active project
firebase use awarely-safety
```

### 5.2 Deploying Firestore Security Rules & Indexes

```bash
# Deploy Firestore security rules and composite query indexes
npm run deploy:rules

# Or via Firebase CLI directly:
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 5.3 Deploying Cloud Functions

```bash
# Deploy all server-side functions (resolveArea, validateReport, generateAreaSummary, sendCircleAlert, onReportCreated)
npm run deploy:functions

# Or via Firebase CLI directly:
firebase deploy --only functions
```

### 5.4 Deploying Frontend to Firebase Hosting

```bash
# Deploy optimized production frontend
npm run deploy:hosting

# Or deploy everything in a single step
npm run deploy:all
```

The production application will be live at:
- `https://awarely-safety.web.app`
- `https://awarely-safety.firebaseapp.com`

---

## 6. Firebase Hosting Configuration (`firebase.json`)

The hosting configuration enforces strict caching and security headers:

- **Single Page Application Rewrite**: All unmatched paths route to `/index.html`.
- **Immutable Asset Caching**: `/assets/**` cached for 1 year (`max-age=31536000, immutable`).
- **Entry HTML Freshness**: `/index.html` configured with `no-cache, no-store, must-revalidate`.
- **Security Headers**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(self)`

---

## 7. Rollback Guidance

In the event of a regression or unexpected runtime behavior, use the following rollback strategies:

### 7.1 Instant Hosting Rollback (Zero Downtime)

Firebase Hosting preserves previous release versions in immutable storage:

```bash
# Method A: CLI Rollback
firebase hosting:clone awarely-safety:<PREVIOUS_VERSION_ID> awarely-safety:live

# Method B: Firebase Console (Fastest)
# 1. Open Firebase Console -> Hosting -> Release History
# 2. Locate the last stable deployment
# 3. Click the three dots (...) menu -> "Rollback"
```

### 7.2 Cloud Functions Rollback

```bash
# Check recent function logs for error identification
firebase functions:log --limit 100

# Redeploy previous stable Git commit
git checkout <PREVIOUS_STABLE_COMMIT>
npm run build:all
firebase deploy --only functions
git checkout main
```

### 7.3 Firestore Rules Rollback

Previous versions of `firestore.rules` can be restored instantly via:
- Firebase Console -> Firestore Database -> Rules -> Rules Monitor / Version History -> Select version -> "Publish".

---

## 8. Verification & Smoke Test Checklist

Post-deployment verification items:

| Flow | Expected Result | Status |
|---|---|---|
| **Splash / Landing** | Page renders branding, privacy pledge, navigation | Verified |
| **Authentication** | Email/Google/Guest sign in works with role attribution | Verified |
| **Dashboard** | Area safety card loads with day/evening/night contexts | Verified |
| **Search** | Debounced search returns Bangalore areas within 280ms | Verified |
| **Map** | Map container loads on-demand on `/map` route only | Verified |
| **Unrated Area** | Displays low-confidence indicator for areas with 0 reports | Verified |
| **Report Submission** | Rating 1–5, tags, note submitted with 'pending' moderation | Verified |
| **AI Insights** | Grounded deterministic synthesis without crime prediction | Verified |
| **Safety Circle** | Scoped trusted contacts with 'I Feel Unsafe' and check-in | Verified |
| **Zone Simulation** | Danger/Warning/Safe mock simulation in developer tools | Verified |
| **Admin Moderation** | Review, approve, reject reports with immutable audit log | Verified |
