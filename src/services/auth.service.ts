/**
 * Authentication service — wraps Firebase Auth with typed helpers,
 * state persistence, initial Firestore profile creation, and role management.
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { Timestamp } from 'firebase/firestore'
import { auth } from '@/firebase/firebase'
import { isFirebaseConfigured } from '@/config/firebase.config'
import { firestoreService } from '@/services/firestore.service'
import type { UserProfile, UserRole } from '@/types/user'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

// Ensure browser local persistence if Firebase is configured
if (isFirebaseConfigured) {
  try {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('[Awarely] Auth persistence initialization notice:', err)
    })
  } catch {
    // Ignore in non-browser context
  }
}

// Default initial user profile generator
export function createDefaultUserProfile(
  uid: string,
  displayName: string | null,
  email: string | null,
  role: UserRole = 'user',
  isAnonymous = false,
): UserProfile {
  const now = Timestamp.now()
  return {
    uid,
    displayName: displayName || (isAnonymous ? 'Guest Traveler' : 'Awarely Contributor'),
    email,
    photoURL: null,
    isAnonymous,
    role,
    preferences: {
      notificationsEnabled: false,
      theme: 'dark',
      coarseLocationConsent: true,
    },
    alertEnabled: true,
    safetyCirclePaused: false,
    alertPreference: {
      notifyCircleOnCheckin: true,
      soundAlarmOnDistress: true,
    },
    safetyCirclePreference: {
      maxContacts: 3,
      autoShareArea: false,
    },
    consent: {
      termsAccepted: true,
      termsAcceptedAt: now,
      privacyAccepted: true,
      privacyAcceptedAt: now,
      dataRetentionPolicyAcknowledged: true,
    },
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
    reportCount: 0,
  }
}

// Local mock storage for preview / demo mode
let mockUser: User | null = {
  uid: 'demo-guest-user-001',
  isAnonymous: true,
  displayName: 'Guest Traveler',
  email: null,
} as unknown as User

let mockProfile: UserProfile | null = createDefaultUserProfile(
  'demo-guest-user-001',
  'Guest Traveler',
  null,
  'user',
  true,
)

const authListeners: ((user: User | null) => void)[] = []

function notifyAuthListeners(user: User | null) {
  mockUser = user
  authListeners.forEach((fn) => fn(user))
}

export const authService = {
  /** Sign in with Google popup and ensure profile document exists. */
  async signInWithGoogle(): Promise<UserCredential> {
    if (!isFirebaseConfigured) {
      const u = {
        uid: 'demo-google-user',
        isAnonymous: false,
        displayName: 'Alex Traveler',
        email: 'alex.traveler@example.com',
      } as unknown as User
      mockProfile = createDefaultUserProfile(u.uid, u.displayName, u.email, 'user', false)
      notifyAuthListeners(u)
      return { user: u } as UserCredential
    }

    const cred = await signInWithPopup(auth, googleProvider)
    const existing = await firestoreService.getUserProfile(cred.user.uid)
    if (!existing) {
      const initialProfile = createDefaultUserProfile(
        cred.user.uid,
        cred.user.displayName,
        cred.user.email,
        'user',
        cred.user.isAnonymous,
      )
      await firestoreService.createUserProfile(initialProfile)
    }
    return cred
  },

  /** Sign in with email and password. */
  async signInWithEmail(email: string, password: string): Promise<UserCredential> {
    if (!isFirebaseConfigured) {
      const role: UserRole = email.includes('admin')
        ? 'admin'
        : email.includes('dev')
        ? 'dev'
        : 'user'
      const u = {
        uid: `demo-user-${Date.now()}`,
        isAnonymous: false,
        displayName: email.split('@')[0],
        email,
      } as unknown as User
      mockProfile = createDefaultUserProfile(u.uid, u.displayName, email, role, false)
      notifyAuthListeners(u)
      return { user: u } as UserCredential
    }
    return signInWithEmailAndPassword(auth, email, password)
  },

  /** Create a new account with email, password, and initial user document. */
  async registerWithEmail(
    email: string,
    password: string,
    displayName: string,
    role: UserRole = 'user',
  ): Promise<UserCredential> {
    if (!isFirebaseConfigured) {
      const u = {
        uid: `demo-user-${Date.now()}`,
        isAnonymous: false,
        displayName,
        email,
      } as unknown as User
      mockProfile = createDefaultUserProfile(u.uid, displayName, email, role, false)
      notifyAuthListeners(u)
      return { user: u } as UserCredential
    }

    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName })

    // Create initial user document in Firestore with preferences and consent
    const initialProfile = createDefaultUserProfile(
      credential.user.uid,
      displayName,
      email,
      role,
      false,
    )
    await firestoreService.createUserProfile(initialProfile)

    return credential
  },

  /** Sign in anonymously (guest mode). */
  async signInAsGuest(): Promise<UserCredential> {
    if (!isFirebaseConfigured) {
      const u = {
        uid: `guest-${Date.now()}`,
        isAnonymous: true,
        displayName: 'Guest Traveler',
        email: null,
      } as unknown as User
      mockProfile = createDefaultUserProfile(u.uid, 'Guest Traveler', null, 'user', true)
      notifyAuthListeners(u)
      return { user: u } as UserCredential
    }
    return signInAnonymously(auth)
  },

  /** Sign out the current user. */
  async signOut(): Promise<void> {
    if (!isFirebaseConfigured) {
      mockProfile = null
      notifyAuthListeners(null)
      return
    }
    return firebaseSignOut(auth)
  },

  /** Send a password reset email. */
  async resetPassword(email: string): Promise<void> {
    if (!isFirebaseConfigured) {
      // Simulate successful password reset email dispatch in local preview
      await new Promise((resolve) => setTimeout(resolve, 600))
      return
    }
    return sendPasswordResetEmail(auth, email)
  },

  /** Confirm password reset with action code. */
  async confirmPasswordReset(actionCode: string, newPass: string): Promise<void> {
    if (!isFirebaseConfigured) {
      await new Promise((resolve) => setTimeout(resolve, 600))
      return
    }
    return firebaseConfirmPasswordReset(auth, actionCode, newPass)
  },

  /** Verify password reset code validity. */
  async verifyPasswordResetCode(actionCode: string): Promise<string> {
    if (!isFirebaseConfigured) {
      return 'user@example.com'
    }
    return firebaseVerifyPasswordResetCode(auth, actionCode)
  },

  /** Fetch the current user's profile document. */
  async getCurrentUserProfile(uid?: string): Promise<UserProfile | null> {
    const targetUid = uid || auth.currentUser?.uid || mockUser?.uid
    if (!targetUid) return null
    if (!isFirebaseConfigured) return mockProfile
    return firestoreService.getUserProfile(targetUid)
  },

  /** Developer tool: switch active role for testing RBAC */
  setMockRole(role: UserRole) {
    if (mockProfile) {
      mockProfile.role = role
    }
  },

  /** Developer tool: get active role in mock mode */
  getMockRole(): UserRole {
    return mockProfile?.role || 'user'
  },

  /** Returns the currently authenticated user (or null). */
  getCurrentUser(): User | null {
    if (!isFirebaseConfigured) return mockUser
    return auth.currentUser
  },

  /** Returns true if the current user is an anonymous (guest) user. */
  isGuest(): boolean {
    if (!isFirebaseConfigured) return mockUser?.isAnonymous ?? false
    return auth.currentUser?.isAnonymous ?? false
  },

  /** Subscribe to mock auth state changes in demo mode */
  onMockAuthStateChanged(callback: (user: User | null) => void): () => void {
    authListeners.push(callback)
    callback(mockUser)
    return () => {
      const idx = authListeners.indexOf(callback)
      if (idx !== -1) authListeners.splice(idx, 1)
    }
  },
}
