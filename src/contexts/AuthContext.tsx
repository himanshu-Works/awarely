/**
 * AuthContext — provides Firebase Auth state, Firestore user profile,
 * and role-based access status throughout the application.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/firebase/firebase'
import { isFirebaseConfigured } from '@/config/firebase.config'
import { authService } from '@/services/auth.service'
import type { UserProfile, UserRole } from '@/types/user'

interface AuthContextValue {
  /** The currently authenticated Firebase user, or null if signed out. */
  user: User | null
  /** User profile document containing preferences, consent, and role. */
  userProfile: UserProfile | null
  /** User role ('user' | 'admin' | 'dev') */
  role: UserRole
  /** True while determining the initial auth state. */
  authLoading: boolean
  /** True if the current user is an anonymous (guest) user. */
  isGuest: boolean
  /** True if the user is fully authenticated (not anonymous). */
  isAuthenticated: boolean
  /** True if user has administrative privileges. */
  isAdmin: boolean
  /** True if user has developer privileges. */
  isDev: boolean
  /** Reload the current user profile document. */
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [customClaimRole, setCustomClaimRole] = useState<UserRole | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  async function loadProfile(targetUser: User | null, forceRefresh = false) {
    if (!targetUser) {
      setUserProfile(null)
      setCustomClaimRole(null)
      return
    }
    try {
      // 1. Inspect custom claims on Firebase Auth ID token
      let claimRole: UserRole | null = null
      if (typeof targetUser.getIdTokenResult === 'function') {
        try {
          const tokenResult = await targetUser.getIdTokenResult(forceRefresh)
          if (tokenResult.claims && typeof tokenResult.claims.role === 'string') {
            claimRole = tokenResult.claims.role as UserRole
          }
        } catch {
          // Ignore token result fetch error in offline/preview
        }
      }
      setCustomClaimRole(claimRole)

      // 2. Load Firestore profile document
      const profile = await authService.getCurrentUserProfile(targetUser.uid)
      setUserProfile(profile)
    } catch (err) {
      console.warn('[Awarely] Error loading user profile:', err)
    }
  }

  async function refreshProfile() {
    if (user && typeof user.getIdToken === 'function') {
      try {
        await user.getIdToken(true) // Force server refresh of ID token claims
      } catch {}
    }
    await loadProfile(user, true)
  }

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Connect to demo auth listener
      const unsub = authService.onMockAuthStateChanged(async (mockU) => {
        setUser(mockU)
        await loadProfile(mockU)
        setAuthLoading(false)
      })
      return unsub
    }

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          setUser(firebaseUser)
          await loadProfile(firebaseUser)
          setAuthLoading(false)
        },
        async () => {
          const fallbackUser = authService.getCurrentUser()
          setUser(fallbackUser)
          await loadProfile(fallbackUser)
          setAuthLoading(false)
        },
      )
      return unsubscribe
    } catch {
      const fallbackUser = authService.getCurrentUser()
      setUser(fallbackUser)
      loadProfile(fallbackUser).finally(() => setAuthLoading(false))
    }
  }, [])

  const currentRole: UserRole = customClaimRole || userProfile?.role || 'user'

  const value: AuthContextValue = {
    user,
    userProfile,
    role: currentRole,
    authLoading,
    isGuest: user?.isAnonymous ?? false,
    isAuthenticated: user !== null && !user.isAnonymous,
    isAdmin: currentRole === 'admin',
    isDev: currentRole === 'dev',
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>.')
  }
  return ctx
}
