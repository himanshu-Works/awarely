# Awarely — Startup & Authentication Experience

**Brand:** Awarely  
**Tagline:** *“Safety, When It Matters.”*  
**Version:** 1.0.0  
**Status:** Implemented & Verified  

---

## 1. Startup Splash Screen

When the application loads in the browser, an application splash screen appears:

1. **Supplied Official Logo Asset**: Renders the exact supplied Awarely shield and wordmark via `<BrandLogo size="xl" showTagline />`. No new logo was created or redesigned.
2. **Animation**: Subtle scale entrance (`scale: 0.94 -> 1.0`) with smooth opacity fade (`duration: 0.6s`), followed by an ambient progress glow.
3. **Timing**: Total splash duration is **1.5 seconds** (strictly conforming to the 1.2–1.8 second requirement).
4. **Smooth Exit**: Fades out smoothly over 350ms (`opacity: 1 -> 0`) into the application view.
5. **Accessibility**: Respects `prefers-reduced-motion: reduce`. When detected, transitions immediately in under 200ms without scale or fade animations.

---

## 2. Authentication Architecture & State Persistence

Authentication is managed via Firebase Auth and wrapped in [`auth.service.ts`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/awarely/src/services/auth.service.ts) and [`AuthContext.tsx`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/awarely/src/contexts/AuthContext.tsx):

- **Persistence Mode**: Configured with `browserLocalPersistence`, ensuring user sessions survive tab closes and browser restarts.
- **Supported Methods**:
  - Email & Password Registration (`createUserWithEmailAndPassword`)
  - Email & Password Sign-in (`signInWithEmailAndPassword`)
  - Google Sign-in Popup (`signInWithPopup`)
  - Anonymous Guest Traveler Mode (`signInAnonymously`)
  - Password Reset Email Dispatch (`sendPasswordResetEmail`)
  - Password Reset Code Verification & Confirmation (`verifyPasswordResetCode`, `confirmPasswordReset`)
  - Session Sign-out (`signOut`)

---

## 3. Initial User Profile Document (`users/{uid}`)

Upon successful registration (or first Google sign-in), an initial user document is created in Firestore at `users/{uid}` with complete preferences and consent records:

```typescript
export interface UserProfile {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
  isAnonymous: boolean
  role: 'user' | 'admin' | 'dev'
  preferences: {
    notificationsEnabled: boolean
    theme: 'dark' | 'light' | 'system'
    coarseLocationConsent: boolean
  }
  alertPreference: {
    notifyCircleOnCheckin: boolean
    soundAlarmOnDistress: boolean
  }
  safetyCirclePreference: {
    maxContacts: 3
    autoShareArea: boolean
  }
  consent: {
    termsAccepted: boolean
    termsAcceptedAt: Timestamp
    privacyAccepted: boolean
    privacyAcceptedAt: Timestamp
    dataRetentionPolicyAcknowledged: boolean
  }
  createdAt: Timestamp
  lastSeenAt: Timestamp
  reportCount: number
}
```

---

## 4. Role-Based Access Control (RBAC)

The platform supports three distinct roles:
- **`user`**: Standard tourist or community contributor. Access to area awareness, feedback submission, and personal trusted circle.
- **`admin`**: Administrative permissions. Access to area moderation, report verification, and community metrics.
- **`dev`**: Developer permissions. Access to raw emulator telemetry, simulator controls, and function logs.

> [!IMPORTANT]
> **Privilege Guarding**: Ordinary users (`role: 'user'`) cannot access privileged administrative or developer interfaces. Route access is strictly guarded by the [`ProtectedRoute`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/awarely/src/components/auth/ProtectedRoute.tsx) component with `allowedRoles` checks.

---

## 5. Authentication Pages & Routes

| Route | Component | Purpose |
|---|---|---|
| `/` | [`MapPage.tsx`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/awarely/src/pages/MapPage.tsx) | Protected awareness map (accessible to authenticated users & guest travelers). |
| `/login` | [`LoginPage.tsx`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/awarely/src/pages/LoginPage.tsx) | Sign in with email, Google, or guest traveler mode; links to registration & recovery. |
| `/signup` | [`SignupPage.tsx`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/awarely/src/pages/SignupPage.tsx) | Contributor registration with password confirmation and privacy policy consent. |
| `/forgot-password` | [`ForgotPasswordPage.tsx`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/awarely/src/pages/ForgotPasswordPage.tsx) | Request password reset link to registered email address. |
| `/reset-password` | [`ResetPasswordPage.tsx`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/awarely/src/pages/ResetPasswordPage.tsx) | Validates action code from reset link and securely updates password. |
| `/design-system` | [`DesignSystemPage.tsx`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/awarely/src/pages/DesignSystemPage.tsx) | Living design system component catalog and visual tokens showcase. |

---

## 6. Error Handling Taxonomy

Authentication errors are transformed into clean, professional user-facing messages:

| Firebase Error Code | User-Facing Message |
|---|---|
| `auth/user-not-found` | "No account found with this email address." |
| `auth/wrong-password` | "Incorrect password. Please verify and try again." |
| `auth/email-already-in-use` | "An account is already registered with this email address." |
| `auth/weak-password` | "Password must be at least 6 characters in length." |
| `auth/invalid-email` | "Please enter a valid email address." |
| `auth/network-request-failed` | "Network connection issue. Please check your internet connection." |
| `auth/expired-action-code` | "This recovery link has expired or has already been used." |
| `auth/popup-closed-by-user` | "Sign-in was cancelled before completion." |
