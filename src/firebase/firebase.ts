/**
 * Awarely — Firebase Configuration
 *
 * This file initialises the Firebase app and exports service instances.
 * All values come from VITE_ environment variables (non-secret, referrer-restricted).
 *
 * IMPORTANT: GEMINI_API_KEY is NEVER configured here.
 * Gemini is called server-side only via Cloud Functions.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore'
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from 'firebase/storage'
import {
  getFunctions,
  connectFunctionsEmulator,
  type Functions,
} from 'firebase/functions'
import { getMessaging, type Messaging } from 'firebase/messaging'
import { firebaseConfig } from '@/config/firebase.config'

// ── Singleton Firebase app ───────────────────────────────────────────
let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage
let functions: Functions
let messaging: Messaging | null = null

function initFirebase() {
  // Prevent multiple initialisations in HMR / StrictMode
  if (getApps().length > 0) {
    app = getApps()[0]!
  } else {
    app = initializeApp(firebaseConfig)
  }

  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
  functions = getFunctions(app, 'us-central1')

  // FCM is only available in secure contexts (HTTPS or localhost)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      messaging = getMessaging(app)
    } catch {
      // FCM not available in this context (e.g. HTTP dev without SW)
      messaging = null
    }
  }

  // ── Connect to Firebase Emulator Suite only if explicitly enabled ────────────
  if (import.meta.env.VITE_USE_EMULATORS === 'true') {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
      connectFirestoreEmulator(db, 'localhost', 8080)
      connectFunctionsEmulator(functions, 'localhost', 5001)
      connectStorageEmulator(storage, 'localhost', 9199)
      console.info('[Awarely] 🔧 Connected to Firebase Emulator Suite')
    } catch (e) {
      console.warn('[Awarely] Could not connect to emulators:', e)
    }
  }
}

initFirebase()

export { app, auth, db, storage, functions, messaging }
