# Awarely — Firebase Project Provisioning Checklist

**Target Project ID:** `awarely-safety` (or project ID chosen at creation)  
**Region:** `us-central1`  
**Node.js Runtime:** `Node 20`  
**Created:** October 2026  
**Status:** Pre-Provisioning Verification Complete — Ready for Cloud Project Creation

---

## Executive Summary & Verification Findings

A complete repository audit was conducted across frontend source, Cloud Functions, rules, indexes, and documentation.

### Key Findings Across the 13 Verification Points:
1. **Frontend Expected Project ID:** Defaults to `awarely-safety` via `.firebaserc` and `.env.example`. Handled dynamically at runtime via `VITE_FIREBASE_PROJECT_ID` with safe fallback to mock mode if unset.
2. **Cloud Functions Expected Project ID:** Handled dynamically via `admin.initializeApp()` without hardcoded credentials. It auto-discovers project identity in the cloud environment.
3. **Firebase Configuration References:** Centralized cleanly in `src/config/firebase.config.ts` and `src/firebase/firebase.ts`. All client variables strictly follow Vite convention (`VITE_FIREBASE_*`).
4. **Firestore Rules:** Complete in `firestore.rules` (rules_version '2'). Implements strict RBAC (`user`, `admin`, `dev`), immutable computed scores protection, pseudonymized reporting, and explicit denies on tracking collections.
5. **Firestore Indexes:** Complete in `firestore.indexes.json` with 7 composite indexes for `areas`, `reports`, and `safetyEvents`.
6. **Storage Rules:** Complete in `storage.rules` (rules_version '2'). Restricts upload to user-scoped directories, enforces 5MB limit, allows only JPEG/PNG/WebP, and blocks SVG/HTML.
7. **Firebase Hosting Configuration:** Fully declared in `firebase.json` with SPA rewrite to `/index.html`, 1-year immutable caching on `/assets/**`, `no-cache` on `/index.html`, and security headers (`nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`, `geolocation=(self)`).
8. **Cloud Functions Configuration:** Fully declared in `firebase.json` and `functions/`. Exports 4 callable functions (`resolveArea`, `validateReport`, `generateAreaSummary`, `sendCircleAlert`) and 1 Firestore trigger (`onReportCreated`). Compiles cleanly with TypeScript (`tsc`).
9. **Authentication Assumptions:** Application architecture requires 3 Auth providers: **Email/Password**, **Google Sign-In**, and **Anonymous (Guest)**.
10. **Secret Manager / Gemini Configuration:** Server-side only. Client never touches `GEMINI_API_KEY`. Cloud Function `generateAreaSummary` reads API key from environment / Secret Manager with deterministic fallback synthesis.
11. **Google Maps Configuration:** Sourced from `VITE_GOOGLE_MAPS_API_KEY` in `src/config/maps.config.ts`. Maps JavaScript API must be enabled on the associated Google Cloud project with HTTP referrer restrictions.
12. **Environment Variables:** Documented in `.env.example`. No live `.env` or `.env.local` files currently exist in the repository (clean state).
13. **Vani / vani-29b27 References:** **ZERO** hard-coded references found in the repository. No project contamination exists.

---

## Part A: Already Configured Locally

The following items are completely authored, type-checked, and ready inside the local workspace:

- [x] **Project target mapping:** `.firebaserc` configured with:
  - `default` → `awarely-safety`
  - `production` → `awarely-safety`
  - `staging` → `awarely-safety-staging`
- [x] **Hosting and Emulator configuration:** `firebase.json` specifies:
  - Hosting: public directory `dist`, SPA rewrite to `/index.html`, cache & security headers.
  - Functions: source directory `functions`, codebase `default`.
  - Firestore: `firestore.rules` and `firestore.indexes.json`.
  - Storage: `storage.rules`.
  - Local Emulator Suite configuration for Auth (9099), Firestore (8080), Functions (5001), Hosting (5000), Storage (9199), and UI (4000).
- [x] **Firestore Security Rules:** `firestore.rules` authored with fine-grained access control, role escalation guards, rate limiting constraints, and location tracking blacklists.
- [x] **Firestore Composite Indexes:** `firestore.indexes.json` configured for multi-field queries across `areas`, `reports`, and `safetyEvents`.
- [x] **Storage Security Rules:** `storage.rules` authored with MIME-type verification, SVG/HTML XSS blocking, and user directory scoping.
- [x] **Backend Cloud Functions Codebase:** `functions/src/index.ts` written with Node 20 runtime, TypeScript compiler configured (`tsc`), and verified to compile without error (`npm --prefix functions run build` succeeded).
- [x] **Frontend Firebase Client Initializer:** `src/firebase/firebase.ts` and `src/config/firebase.config.ts` prepared to consume Vite environment variables with graceful fallback when unconfigured.
- [x] **Build & Validation Pipelines:** `package.json` contains:
  - `build` (`tsc -b && vite build`)
  - `build:all` (frontend + Cloud Functions)
  - `type-check` (`tsc --noEmit` — verified passing)
  - `deploy:*` utility scripts for granular or all-in-one deployment.

---

## Part B: Must Be Created / Configured in the New Firebase Project

The following actions must be taken in the **Firebase Console** (or Google Cloud Console) when creating the cloud project:

### 1. Project Creation
- [ ] Create a new project in [Firebase Console](https://console.firebase.google.com/):
  - **Project Name:** `Awarely`
  - **Project ID:** `awarely-safety` *(Note: If this globally unique ID is taken by another Google user, append an organization or random suffix, e.g., `awarely-safety-app` or `awarely-safety-prod`, and update `.firebaserc` accordingly).*
  - **Google Analytics:** Enable or disable based on preference.

### 2. Plan Upgrade
- [ ] Upgrade the project from Spark (Free) to **Blaze (Pay-as-you-go)**:
  - *Required for:* Cloud Functions deployment (Node 20 runtime), outbound network calls, and Secret Manager access.
  - Set a Google Cloud budget and budget alert (e.g., $5/month) to prevent unexpected charges.

### 3. Firestore Database Setup
- [ ] In Firebase Console → **Build** → **Firestore Database**:
  - Click **Create database**.
  - Choose **Native mode** (default).
  - Select location: **`us-central1`** (recommended to match Cloud Functions default region and avoid inter-region latency).
  - Start in **Production mode** (local rules will overwrite default rules upon first deploy).

### 4. Firebase Authentication Setup
- [ ] In Firebase Console → **Build** → **Authentication**:
  - Click **Get started**.
  - Under **Sign-in method**, enable the following providers:
    1. **Email/Password:** Enable "Email/Password" (keep "Email link / passwordless" disabled unless needed).
    2. **Google:** Enable, choose project support email (`himanshusri8378@gmail.com`).
    3. **Anonymous:** Enable (required for guest traveler mode).
  - Under **Settings** → **Authorized domains**:
    - Ensure `localhost` is present.
    - Confirm `<project-id>.firebaseapp.com` and `<project-id>.web.app` are listed.

### 5. Cloud Storage Setup
- [ ] In Firebase Console → **Build** → **Storage**:
  - Click **Get started**.
  - Choose location: Multi-region `us` or single region `us-central1`.
  - Start in **Production mode** (local storage rules will overwrite default rules upon first deploy).

### 6. Register Web Application
- [ ] In Firebase Console → **Project Settings** → **General** → **Your apps**:
  - Click the **Web** icon (`</>`) to add an app.
  - **App nickname:** `Awarely Web`
  - Check the box: **"Also set up Firebase Hosting for this app"**.
  - Register app and copy the `firebaseConfig` credentials object:
    - `apiKey`
    - `authDomain`
    - `projectId`
    - `storageBucket`
    - `messagingSenderId`
    - `appId`

### 7. Google Cloud API Enablement & Key Restrictions
- [ ] In [Google Cloud Console](https://console.cloud.google.com/) for the created project:
  - Enable **Maps JavaScript API** (APIs & Services → Enable APIs and Services → search "Maps JavaScript API" → Enable).
  - (Optional) Enable **Secret Manager API** if storing server-side keys like `GEMINI_API_KEY`.
  - Under **Credentials** → Edit the auto-generated Firebase Web API Key:
    - Set application restrictions to **HTTP referrers (web sites)**.
    - Add referrers:
      - `http://localhost:*`
      - `http://127.0.0.1:*`
      - `https://<project-id>.web.app/*`
      - `https://<project-id>.firebaseapp.com/*`
  - Generate a separate restricted API Key for Google Maps:
    - API restriction: Restrict key to **Maps JavaScript API**.
    - HTTP referrer restriction: Same domains as above.

---

## Part C: Must Be Configured After Project Creation

Once the cloud project is created, configure the local repository before deploying:

### 1. Update `.firebaserc` (If Project ID Differs)
- [ ] Verify `.firebaserc` matches the actual created project ID:
  ```json
  {
    "projects": {
      "default": "<your-actual-project-id>",
      "production": "<your-actual-project-id>",
      "staging": "<your-staging-project-id>"
    }
  }
  ```
- [ ] Set active CLI project:
  ```bash
  firebase use default
  ```

### 2. Create Local Environment File (`.env.local` or `.env.production`)
- [ ] Create `.env.local` in the project root (copied from `.env.example`):
  ```env
  # Firebase Client Configuration (from Firebase Console)
  VITE_FIREBASE_API_KEY=<your-web-api-key>
  VITE_FIREBASE_AUTH_DOMAIN=<your-project-id>.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=<your-project-id>
  VITE_FIREBASE_STORAGE_BUCKET=<your-project-id>.firebasestorage.app
  VITE_FIREBASE_MESSAGING_SENDER_ID=<your-messaging-sender-id>
  VITE_FIREBASE_APP_ID=<your-app-id>

  # Google Maps Frontend API Key
  VITE_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>

  # Application Environment
  VITE_APP_ENV=production
  VITE_USE_EMULATORS=false
  ```

### 3. Server-Side Secrets Configuration
- [ ] (If using Gemini live model): Set the secret in Google Cloud Secret Manager or Firebase functions config:
  ```bash
  firebase functions:secrets:set GEMINI_API_KEY
  ```

### 4. Build Test
- [ ] Run full project compilation check:
  ```bash
  npm run build:all
  ```
  Ensure `dist/` is generated and `functions/lib/` is compiled.

---

## Part D: Must Be Verified After First Deployment

Execute deployment in this precise sequence and verify each step:

### 1. Stepwise Deployment Sequence

#### Step 1: Deploy Security Rules and Indexes First
```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```
*Verification:*
- Inspect Firestore Database → Rules in Firebase Console; verify custom rule definitions match `firestore.rules`.
- Inspect Firestore Database → Indexes; verify that all 7 composite indexes show status "Building" then "Enabled".
- Inspect Storage → Rules; verify rules match `storage.rules`.

#### Step 2: Deploy Cloud Functions
```bash
firebase deploy --only functions
```
*Verification:*
- Inspect Functions tab in Firebase Console.
- Confirm 5 functions are deployed:
  1. `resolveArea` (us-central1, Callable)
  2. `validateReport` (us-central1, Callable)
  3. `generateAreaSummary` (us-central1, Callable)
  4. `sendCircleAlert` (us-central1, Callable)
  5. `onReportCreated` (us-central1, Firestore Trigger)
- Check function logs: `firebase functions:log`.

#### Step 3: Deploy Frontend to Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```
*Verification:*
- Access `https://<project-id>.web.app`.
- Verify HTTP 200 response with security headers present in DevTools Network tab (`nosniff`, `SAMEORIGIN`, etc.).

---

### 2. Functional Smoke Test Checklist

| Functional Test | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| **Anonymous Auth** | Click "Continue as Guest" on `/login` | Creates anonymous session; redirects to `/map`; profile document initialized in Firestore `users/{uid}` | [ ] |
| **Email Auth** | Register new account on `/signup` | User created in Firebase Auth; Firestore profile document created with role `user` | [ ] |
| **Google Sign-In** | Click "Continue with Google" | OAuth popup succeeds; user document created if first login | [ ] |
| **Area Resolution** | Request location or select city | Cloud Function `resolveArea` maps coordinates to bounded area without raw coordinate persistence | [ ] |
| **Community Report** | Submit report with rating 1–5 | `validateReport` callable creates report in `reports/{id}` with `moderationStatus: 'pending'` and `weight: 1.0` | [ ] |
| **Firestore Aggregation** | Verify `reports/{id}` creation | `onReportCreated` trigger increments `reportCount` on corresponding `areas/{areaId}` document | [ ] |
| **AI Area Summary** | Navigate to area details | Cached summary returned or `generateAreaSummary` produces grounded synthesis without speculative crime terms | [ ] |
| **Trusted Circle Alert** | Trigger check-in from circle modal | `sendCircleAlert` records alert in `users/{uid}/alertHistory` and audits delivery count | [ ] |
| **Storage Upload** | Upload profile avatar or report photo | Valid image (<5MB) uploads to `userAvatars/{uid}/...`; invalid MIME or non-image is rejected | [ ] |
| **Security Enforcements** | Attempt direct client write to `areas/{id}.overallScore` | Firestore rules deny request (`PERMISSION_DENIED`) | [ ] |

---

## Conclusion & Readiness Assessment

**Is the repository ready to connect to a newly created Firebase project with project ID `awarely-safety`?**

### **YES, THE REPOSITORY IS FULLY READY.**

- All code, security rules, indexes, function definitions, and build scripts are complete and consistent.
- TypeScript builds for both frontend and backend pass without errors (`npm run type-check` and `npm --prefix functions run build`).
- No references to previous or unrelated projects (`vani`, `vani-29b27`) exist in the codebase.
- No code modifications are needed prior to creating the cloud project.

Once the cloud project is created in Firebase Console according to **Part B**, populate `.env.local` as described in **Part C**, and proceed with deployment as described in **Part D**.
