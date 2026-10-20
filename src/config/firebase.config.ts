/**
 * Firebase client configuration.
 *
 * These values are sourced from VITE_ environment variables.
 * They are intentionally non-secret — security is enforced via:
 *   - Firestore Security Rules
 *   - Firebase Auth token validation
 *   - HTTP Referrer restrictions on the Maps & Firebase API keys
 *
 * DO NOT add GEMINI_API_KEY here — it must never be a VITE_ variable.
 */

import type { FirebaseOptions } from 'firebase/app'

function getEnv(key: string): string | undefined {
  return import.meta.env[key] as string | undefined
}

export const isFirebaseConfigured = Boolean(
  getEnv('VITE_FIREBASE_API_KEY') &&
  getEnv('VITE_FIREBASE_PROJECT_ID') &&
  getEnv('VITE_FIREBASE_APP_ID')
)

export const firebaseConfig: FirebaseOptions = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || 'mock-api-key',
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'mock-app.firebaseapp.com',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || 'mock-project-id',
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || 'mock-project-id.appspot.com',
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || '1234567890',
  appId: getEnv('VITE_FIREBASE_APP_ID') || '1:1234567890:web:mockappid',
}

