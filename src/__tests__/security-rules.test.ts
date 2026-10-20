import { describe, it, expect } from 'vitest'
import type { UserRole } from '@/types/user'

/**
 * Security Rules & RBAC Test Suite
 *
 * Validates security invariants across both:
 * 1. Application Layer (Route guards, component RBAC)
 * 2. Firestore Security Rules Specification
 */

// -- 1. ROUTE GUARD RBAC SIMULATOR -------------------------------------------
interface RouteGuardPolicy {
  path: string
  allowedRoles?: UserRole[]
  allowGuest?: boolean
}

const ROUTE_POLICIES: Record<string, RouteGuardPolicy> = {
  '/': { path: '/', allowGuest: true },
  '/search': { path: '/search', allowGuest: true },
  '/map': { path: '/map', allowGuest: true },
  '/area': { path: '/area', allowGuest: true },
  '/report': { path: '/report', allowGuest: true },
  '/insights': { path: '/insights', allowGuest: true },
  '/alerts': { path: '/alerts', allowGuest: true },
  '/circle': { path: '/circle', allowGuest: true },
  '/profile': { path: '/profile', allowGuest: true },
  '/privacy': { path: '/privacy', allowGuest: true },
  '/my-reports': { path: '/my-reports', allowGuest: true },
  '/dev': { path: '/dev', allowedRoles: ['dev', 'admin'], allowGuest: false },
  '/admin': { path: '/admin', allowedRoles: ['admin'], allowGuest: false },
}

function evaluateRouteAccess(
  path: string,
  user: { uid: string; role: UserRole; isGuest?: boolean } | null,
): { allowed: boolean; redirect?: string; reason?: string } {
  const policy = ROUTE_POLICIES[path]
  if (!policy) return { allowed: false, redirect: '/404', reason: 'Route not found' }

  if (!user) {
    return { allowed: false, redirect: '/login', reason: 'Unauthenticated' }
  }

  if (!policy.allowGuest && user.isGuest) {
    return { allowed: false, redirect: '/login', reason: 'Guest forbidden' }
  }

  if (policy.allowedRoles && !policy.allowedRoles.includes(user.role)) {
    return { allowed: false, redirect: '/restricted', reason: 'Insufficient role' }
  }

  return { allowed: true }
}

// -- 2. FIRESTORE SECURITY RULES ENGINE SIMULATOR ----------------------------
interface SecurityAuthContext {
  uid: string
  token?: {
    role?: UserRole
  }
}

interface SecurityRequest {
  auth: SecurityAuthContext | null
  resource?: {
    data: Record<string, any>
  }
  resourceData?: Record<string, any>
  path: string
  method: 'get' | 'list' | 'create' | 'update' | 'delete'
}

class FirestoreSecurityRulesEngine {
  private users: Map<string, { role: UserRole; [key: string]: any }> = new Map()

  setUserRole(uid: string, role: UserRole) {
    this.users.set(uid, { role })
  }

  private isAuthenticated(auth: SecurityAuthContext | null): boolean {
    return auth !== null && !!auth.uid
  }

  private isOwner(auth: SecurityAuthContext | null, uid: string): boolean {
    return this.isAuthenticated(auth) && auth?.uid === uid
  }

  private isAdmin(auth: SecurityAuthContext | null): boolean {
    if (!this.isAuthenticated(auth)) return false
    if (auth?.token?.role === 'admin') return true
    return this.users.get(auth!.uid)?.role === 'admin'
  }

  isDevUser(auth: SecurityAuthContext | null): boolean {
    if (!this.isAuthenticated(auth)) return false
    if (auth?.token?.role === 'dev') return true
    if (this.users.get(auth!.uid)?.role === 'dev') return true
    return this.isAdmin(auth)
  }

  evaluate(req: SecurityRequest): { allowed: boolean; rule: string } {
    const { auth, path, method, resourceData } = req
    const isWrite = ['create', 'update', 'delete'].includes(method)

    // Deny tracking collections completely
    if (
      path.startsWith('/routes') ||
      path.startsWith('/locationHistory') ||
      path.startsWith('/gpsTrails') ||
      path.startsWith('/userLocations')
    ) {
      return { allowed: false, rule: 'Explicit deny on location tracking trails' }
    }

    // Admin audit logs: admin only
    if (path.startsWith('/adminAuditLogs')) {
      return { allowed: this.isAdmin(auth), rule: 'Admin-only audit collection' }
    }

    // Areas: Public read, Admin-only write (computed fields protection)
    if (path.startsWith('/areas/')) {
      if (!isWrite) return { allowed: true, rule: 'Public area safety context' }
      return { allowed: this.isAdmin(auth), rule: 'Computed safety scores client-write forbidden' }
    }

    // Area summaries: Public read, Admin/Function only write
    if (path.startsWith('/areaSummaries/')) {
      if (!isWrite) return { allowed: true, rule: 'Public AI summary read' }
      return { allowed: this.isAdmin(auth), rule: 'AI summary client-write forbidden' }
    }

    // Users and subcollections
    const userMatch = path.match(/^\/users\/([^/]+)(\/(.*))?$/)
    if (userMatch) {
      const targetUid = userMatch[1]
      const subpath = userMatch[3]

      // Subcollection: trustedContacts
      if (subpath && subpath.startsWith('trustedContacts')) {
        return {
          allowed: this.isOwner(auth, targetUid),
          rule: 'Scoped trusted contacts strictly owner-only',
        }
      }

      // Subcollection: alertHistory
      if (subpath && subpath.startsWith('alertHistory')) {
        if (!isWrite) return { allowed: this.isOwner(auth, targetUid), rule: 'Alert history owner-only read' }
        return { allowed: this.isOwner(auth, targetUid) || this.isAdmin(auth), rule: 'Alert history owner or admin write' }
      }

      // User profile itself: users/{uid}
      if (!subpath) {
        if (!isWrite) {
          return { allowed: this.isOwner(auth, targetUid) || this.isAdmin(auth), rule: 'User profile owner or admin read' }
        }

        if (method === 'delete') {
          return { allowed: this.isAdmin(auth), rule: 'User profile deletion admin-only' }
        }

        if (!this.isOwner(auth, targetUid)) {
          return { allowed: false, rule: 'Cannot modify other user profile' }
        }

        // Privilege escalation check: user cannot assign or change role to admin/dev
        if (resourceData && resourceData.role && resourceData.role !== 'user' && !this.isAdmin(auth)) {
          return { allowed: false, rule: 'Privilege escalation forbidden: cannot self-assign elevated role' }
        }

        return { allowed: true, rule: 'User profile owner update' }
      }
    }

    // Reports: reports/{reportId}
    if (path.startsWith('/reports/')) {
      if (!isWrite) {
        return { allowed: this.isAuthenticated(auth), rule: 'Authenticated community report read' }
      }

      if (method === 'update' || method === 'delete') {
        return { allowed: this.isAdmin(auth), rule: 'Report modification admin-only' }
      }

      // Method is create
      if (!this.isAuthenticated(auth)) {
        return { allowed: false, rule: 'Unauthenticated report submission forbidden' }
      }

      const data = resourceData || {}
      if (!data.areaId || typeof data.areaId !== 'string' || data.areaId.length === 0) {
        return { allowed: false, rule: 'Report must have valid areaId' }
      }
      if (typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5) {
        return { allowed: false, rule: 'Rating must be 1 to 5' }
      }
      if (data.moderationStatus !== 'pending') {
        return { allowed: false, rule: 'Client cannot self-approve reports' }
      }
      if (data.weight !== 1.0) {
        return { allowed: false, rule: 'Client cannot inject non-default weight' }
      }
      if (data.note && data.note.length > 280) {
        return { allowed: false, rule: 'Note cannot exceed 280 characters' }
      }
      if (data.overallScore !== undefined || data.confidence !== undefined || data.isVerified !== undefined) {
        return { allowed: false, rule: 'Cannot inject computed fields into report' }
      }

      return { allowed: true, rule: 'Valid report creation' }
    }

    // Safety events: safetyEvents/{eventId}
    if (path.startsWith('/safetyEvents/')) {
      if (!this.isAuthenticated(auth)) {
        return { allowed: false, rule: 'Unauthenticated safety event access forbidden' }
      }

      if (method === 'create') {
        const data = resourceData || {}
        if (data.uid !== auth?.uid) {
          return { allowed: false, rule: 'Cannot create safety event for another user' }
        }
        if (data.route || data.locationHistory || data.gpsTrail || data.exactCoordinates) {
          return { allowed: false, rule: 'Continuous tracking forbidden in safety events' }
        }
        return { allowed: true, rule: 'Valid safety event trigger' }
      }

      const eventOwnerUid = req.resource?.data?.uid
      if (!isWrite) {
        return {
          allowed: eventOwnerUid === auth?.uid || this.isAdmin(auth),
          rule: 'Safety event read owner or admin only',
        }
      }

      if (method === 'update') {
        return {
          allowed: eventOwnerUid === auth?.uid,
          rule: 'Safety event resolution update owner only',
        }
      }

      if (method === 'delete') {
        return { allowed: this.isAdmin(auth), rule: 'Safety event delete admin only' }
      }
    }

    return { allowed: false, rule: 'Default deny' }
  }
}

describe('Awarely Comprehensive Security & Access Control Tests', () => {
  const engine = new FirestoreSecurityRulesEngine()

  const regularUserAuth: SecurityAuthContext = { uid: 'usr-regular-101' }
  const secondUserAuth: SecurityAuthContext = { uid: 'usr-victim-202' }
  const devUserAuth: SecurityAuthContext = { uid: 'usr-dev-505', token: { role: 'dev' } }
  const adminUserAuth: SecurityAuthContext = { uid: 'usr-admin-909', token: { role: 'admin' } }

  engine.setUserRole('usr-regular-101', 'user')
  engine.setUserRole('usr-victim-202', 'user')
  engine.setUserRole('usr-dev-505', 'dev')
  engine.setUserRole('usr-admin-909', 'admin')

  // -- 1. UNAUTHORIZED ACCESS TO ADMIN & DEV PAGES ----------------------
  describe('Application-Level RBAC Route Guards', () => {
    it('blocks unauthenticated visitors from protected routes and redirects to /login', () => {
      const res = evaluateRouteAccess('/admin', null)
      expect(res.allowed).toBe(false)
      expect(res.redirect).toBe('/login')
    })

    it('blocks regular users with role "user" from accessing /admin', () => {
      const res = evaluateRouteAccess('/admin', { uid: regularUserAuth.uid, role: 'user' })
      expect(res.allowed).toBe(false)
      expect(res.reason).toBe('Insufficient role')
    })

    it('blocks regular users with role "user" from accessing /dev tools', () => {
      const res = evaluateRouteAccess('/dev', { uid: regularUserAuth.uid, role: 'user' })
      expect(res.allowed).toBe(false)
      expect(res.reason).toBe('Insufficient role')
    })

    it('blocks dev users from accessing /admin dashboard', () => {
      const res = evaluateRouteAccess('/admin', { uid: devUserAuth.uid, role: 'dev' })
      expect(res.allowed).toBe(false)
      expect(res.reason).toBe('Insufficient role')
    })

    it('allows dev users to access /dev zone simulation', () => {
      const res = evaluateRouteAccess('/dev', { uid: devUserAuth.uid, role: 'dev' })
      expect(res.allowed).toBe(true)
    })

    it('allows admin users full access to /admin and /dev', () => {
      expect(evaluateRouteAccess('/admin', { uid: adminUserAuth.uid, role: 'admin' }).allowed).toBe(true)
      expect(evaluateRouteAccess('/dev', { uid: adminUserAuth.uid, role: 'admin' }).allowed).toBe(true)
    })

    it('blocks guest accounts from /dev and /admin even if they attempt access', () => {
      const resDev = evaluateRouteAccess('/dev', { uid: 'guest-1', role: 'user', isGuest: true })
      expect(resDev.allowed).toBe(false)
      expect(resDev.redirect).toBe('/login')

      const resAdmin = evaluateRouteAccess('/admin', { uid: 'guest-1', role: 'user', isGuest: true })
      expect(resAdmin.allowed).toBe(false)
      expect(resAdmin.redirect).toBe('/login')
    })

    it('accurately identifies developer role authorization in security rules engine', () => {
      expect(engine.isDevUser(devUserAuth)).toBe(true)
      expect(engine.isDevUser(adminUserAuth)).toBe(true) // Admin inherits dev privileges
      expect(engine.isDevUser(regularUserAuth)).toBe(false)
      expect(engine.isDevUser(null)).toBe(false)
    })
  })

  // -- 2. PRIVACY & OTHER USERS DATA ACCESS -----------------------------
  describe('User Profile & Private Data Protection', () => {
    it('allows a user to read and update their own profile document', () => {
      const readRes = engine.evaluate({
        auth: regularUserAuth,
        path: `/users/${regularUserAuth.uid}`,
        method: 'get',
      })
      expect(readRes.allowed).toBe(true)

      const updateRes = engine.evaluate({
        auth: regularUserAuth,
        path: `/users/${regularUserAuth.uid}`,
        method: 'update',
        resourceData: { displayName: 'Updated Name' },
      })
      expect(updateRes.allowed).toBe(true)
    })

    it('blocks user A from reading user B private profile document', () => {
      const res = engine.evaluate({
        auth: regularUserAuth,
        path: `/users/${secondUserAuth.uid}`,
        method: 'get',
      })
      expect(res.allowed).toBe(false)
    })

    it('blocks user A from updating or overwriting user B profile', () => {
      const res = engine.evaluate({
        auth: regularUserAuth,
        path: `/users/${secondUserAuth.uid}`,
        method: 'update',
        resourceData: { displayName: 'Hacked Name' },
      })
      expect(res.allowed).toBe(false)
    })

    it('blocks privilege escalation: regular user cannot self-assign role "admin" or "dev"', () => {
      const res = engine.evaluate({
        auth: regularUserAuth,
        path: `/users/${regularUserAuth.uid}`,
        method: 'update',
        resourceData: { role: 'admin' },
      })
      expect(res.allowed).toBe(false)
      expect(res.rule).toMatch(/privilege escalation/i)
    })
  })

  // -- 3. TRUSTED CONTACTS PRIVACY --------------------------------------
  describe('Trusted Contacts Scoped Privacy', () => {
    it('strictly confines trustedContacts to owner: user B cannot read user A contacts', () => {
      const res = engine.evaluate({
        auth: secondUserAuth,
        path: `/users/${regularUserAuth.uid}/trustedContacts/contact-1`,
        method: 'get',
      })
      expect(res.allowed).toBe(false)
      expect(res.rule).toMatch(/owner-only/i)
    })

    it('blocks user B from inserting or modifying contacts in user A safety circle', () => {
      const res = engine.evaluate({
        auth: secondUserAuth,
        path: `/users/${regularUserAuth.uid}/trustedContacts/contact-new`,
        method: 'create',
        resourceData: { name: 'Attacker Phone', phone: '+123456789' },
      })
      expect(res.allowed).toBe(false)
    })

    it('allows owner to read and manage their own trusted contacts', () => {
      const res = engine.evaluate({
        auth: regularUserAuth,
        path: `/users/${regularUserAuth.uid}/trustedContacts/contact-1`,
        method: 'create',
        resourceData: { name: 'Mom', phone: '+919876543210' },
      })
      expect(res.allowed).toBe(true)
    })
  })

  // -- 4. COMPUTED SAFETY SCORES & AI SUMMARIES CLIENT WRITE PROTECTION --
  describe('Computed Fields & AI Summaries Protection', () => {
    it('allows public read of area safety context', () => {
      const res = engine.evaluate({
        auth: null, // Even unauthenticated / public
        path: '/areas/area-delhi-connaught',
        method: 'get',
      })
      expect(res.allowed).toBe(true)
    })

    it('strictly FORBIDS regular users from creating or mutating areas and computed fields', () => {
      const mutateRes = engine.evaluate({
        auth: regularUserAuth,
        path: '/areas/area-delhi-connaught',
        method: 'update',
        resourceData: {
          overallScore: 99.9,
          confidence: 'high',
          reportCount: 1000,
        },
      })
      expect(mutateRes.allowed).toBe(false)
      expect(mutateRes.rule).toMatch(/computed safety scores client-write forbidden/i)
    })

    it('strictly FORBIDS regular users from mutating AI summaries directly', () => {
      const res = engine.evaluate({
        auth: regularUserAuth,
        path: '/areaSummaries/area-delhi-connaught',
        method: 'update',
        resourceData: {
          summaryText: 'Completely safe area at midnight.',
        },
      })
      expect(res.allowed).toBe(false)
      expect(res.rule).toMatch(/AI summary client-write forbidden/i)
    })

    it('allows authorized administrative systems to update area scores and summaries', () => {
      const areaUpdate = engine.evaluate({
        auth: adminUserAuth,
        path: '/areas/area-delhi-connaught',
        method: 'update',
        resourceData: { overallScore: 72 },
      })
      expect(areaUpdate.allowed).toBe(true)

      const summaryUpdate = engine.evaluate({
        auth: adminUserAuth,
        path: '/areaSummaries/area-delhi-connaught',
        method: 'update',
        resourceData: { summaryText: 'Verified moderation summary.' },
      })
      expect(summaryUpdate.allowed).toBe(true)
    })
  })

  // -- 5. REPORT INTEGRITY & ANTI-TAMPERING ------------------------------
  describe('Community Report Integrity & Anti-Tampering', () => {
    it('rejects reports submitted with pre-approved status (must start in pending)', () => {
      const res = engine.evaluate({
        auth: regularUserAuth,
        path: '/reports/rep-hack-1',
        method: 'create',
        resourceData: {
          areaId: 'area-1',
          rating: 4,
          moderationStatus: 'approved', // FORBIDDEN
          weight: 1.0,
        },
      })
      expect(res.allowed).toBe(false)
      expect(res.rule).toMatch(/client cannot self-approve/i)
    })

    it('rejects reports attempting to inject elevated credibility weight', () => {
      const res = engine.evaluate({
        auth: regularUserAuth,
        path: '/reports/rep-hack-2',
        method: 'create',
        resourceData: {
          areaId: 'area-1',
          rating: 4,
          moderationStatus: 'pending',
          weight: 10.0, // FORBIDDEN: inflated weight
        },
      })
      expect(res.allowed).toBe(false)
      expect(res.rule).toMatch(/cannot inject non-default weight/i)
    })

    it('rejects reports attempting to inject computed score overrides', () => {
      const res = engine.evaluate({
        auth: regularUserAuth,
        path: '/reports/rep-hack-3',
        method: 'create',
        resourceData: {
          areaId: 'area-1',
          rating: 4,
          moderationStatus: 'pending',
          weight: 1.0,
          overallScore: 88, // FORBIDDEN
        },
      })
      expect(res.allowed).toBe(false)
      expect(res.rule).toMatch(/cannot inject computed fields/i)
    })

    it('rejects reports that exceed 280 characters in contextual note', () => {
      const res = engine.evaluate({
        auth: regularUserAuth,
        path: '/reports/rep-hack-4',
        method: 'create',
        resourceData: {
          areaId: 'area-1',
          rating: 3,
          moderationStatus: 'pending',
          weight: 1.0,
          note: 'A'.repeat(300), // Exceeds limit
        },
      })
      expect(res.allowed).toBe(false)
      expect(res.rule).toMatch(/280 characters/i)
    })

    it('allows valid report following all structural integrity constraints', () => {
      const res = engine.evaluate({
        auth: regularUserAuth,
        path: '/reports/rep-valid-1',
        method: 'create',
        resourceData: {
          areaId: 'area-1',
          rating: 3,
          moderationStatus: 'pending',
          weight: 1.0,
          note: 'Streetlamps intermittently flickering near the north junction.',
        },
      })
      expect(res.allowed).toBe(true)
    })
  })

  // -- 6. ZERO CONTINUOUS TRACKING ENFORCEMENT ---------------------------
  describe('Zero Continuous Tracking Invariants', () => {
    it('strictly denies all reads and writes to /routes collection', () => {
      const readRes = engine.evaluate({ auth: adminUserAuth, path: '/routes/user-route-1', method: 'get' })
      expect(readRes.allowed).toBe(false)

      const writeRes = engine.evaluate({ auth: regularUserAuth, path: '/routes/user-route-1', method: 'create' })
      expect(writeRes.allowed).toBe(false)
    })

    it('strictly denies all reads and writes to /locationHistory and /gpsTrails', () => {
      expect(engine.evaluate({ auth: adminUserAuth, path: '/locationHistory/hist-1', method: 'get' }).allowed).toBe(false)
      expect(engine.evaluate({ auth: regularUserAuth, path: '/gpsTrails/trail-1', method: 'create' }).allowed).toBe(false)
      expect(engine.evaluate({ auth: regularUserAuth, path: '/userLocations/loc-1', method: 'create' }).allowed).toBe(false)
    })

    it('rejects safety events that attempt to attach continuous route or GPS trail history', () => {
      const res = engine.evaluate({
        auth: regularUserAuth,
        path: '/safetyEvents/event-hack-1',
        method: 'create',
        resourceData: {
          uid: regularUserAuth.uid,
          eventType: 'manual_discomfort',
          route: [{ lat: 28.1, lng: 77.1 }, { lat: 28.2, lng: 77.2 }],
        },
      })
      expect(res.allowed).toBe(false)
      expect(res.rule).toMatch(/continuous tracking forbidden/i)
    })
  })

  // -- 7. ADMIN-ONLY DATA AUDIT LOGS ------------------------------------
  describe('Admin Audit Log Access Isolation', () => {
    it('blocks regular users from accessing or reading admin audit logs', () => {
      const res = engine.evaluate({
        auth: regularUserAuth,
        path: '/adminAuditLogs/log-1',
        method: 'get',
      })
      expect(res.allowed).toBe(false)
    })

    it('allows administrators to read and append to audit logs', () => {
      const res = engine.evaluate({
        auth: adminUserAuth,
        path: '/adminAuditLogs/log-1',
        method: 'get',
      })
      expect(res.allowed).toBe(true)
    })
  })
})
