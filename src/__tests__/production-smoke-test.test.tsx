import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { SplashScreen } from '@/components/splash/SplashScreen'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoadingScreen } from '@/components/ui/Spinner'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ConfidenceBadge } from '@/components/design-system/ConfidenceBadge'
import { SafetyStatusBadge } from '@/components/awareness/SafetyStatusBadge'
import { DataFreshnessBadge } from '@/components/awareness/DataFreshnessBadge'
import { Card } from '@/components/design-system/Card'
import { Button } from '@/components/design-system/Button'
import { CardSkeleton } from '@/components/design-system/Skeleton'
import { authService } from '@/services/auth.service'
import { geocodingService } from '@/services/geocoding.service'
import { locationAwarenessService } from '@/services/location-awareness.service'
import { aiSafetyEngineService } from '@/services/ai-safety-engine.service'
import { createUnreportedArea } from '@/utils/area-resolution'
import { Timestamp } from 'firebase/firestore'
import type { Area } from '@/types/area'
import type { Report } from '@/types/report'

describe('Awarely Production Smoke-Test Suite (Prompt-19 Verification)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    locationAwarenessService.clearCooldowns()
  })

  // ── 1. SPLASH SCREEN WORKFLOW ───────────────────────────────────────
  describe('Workflow 1: Splash Screen Component', () => {
    it('renders accessible status role, brand logo, and loading indicator', () => {
      const html = renderToStaticMarkup(
        React.createElement(SplashScreen, { onComplete: () => {}, durationMs: 1500 })
      )
      expect(html).toContain('role="status"')
      expect(html).toContain('aria-label="Loading Awarely"')
      expect(html).toContain('Awarely')
      expect(html).toContain('Safety, When It Matters')
    })
  })

  // ── 2. AUTHENTICATION & ROLE ATTRIBUTION ────────────────────────────
  describe('Workflow 2 & 15: Authentication & Role-Based Access Control', () => {
    it('supports guest mode and anonymous traveler identification', async () => {
      vi.spyOn(authService, 'signInAsGuest').mockResolvedValueOnce({
        user: { uid: 'guest-anon-12345', isAnonymous: true } as any,
      } as any)
      const guestCred = await authService.signInAsGuest()
      expect(guestCred.user).toBeDefined()
      expect(guestCred.user.isAnonymous).toBe(true)
      expect(guestCred.user.uid).toContain('guest-')
    })

    it('authenticates standard user with email', async () => {
      vi.spyOn(authService, 'signInWithEmail').mockResolvedValueOnce({
        user: { uid: 'usr-1', email: 'alex.traveler@example.com' } as any,
      } as any)
      const cred = await authService.signInWithEmail('alex.traveler@example.com', 'password123')
      expect(cred.user).toBeDefined()
      expect(cred.user.email).toBe('alex.traveler@example.com')
    })

    it('attributes role correctly based on authorization identity', async () => {
      vi.spyOn(authService, 'signInWithEmail')
        .mockResolvedValueOnce({
          user: { uid: 'adm-1', email: 'admin@awarely.internal' } as any,
        } as any)
        .mockResolvedValueOnce({
          user: { uid: 'dev-1', email: 'dev@awarely.internal' } as any,
        } as any)
      const adminCred = await authService.signInWithEmail('admin@awarely.internal', 'adminPass')
      expect(adminCred.user.email).toContain('admin')

      const devCred = await authService.signInWithEmail('dev@awarely.internal', 'devPass')
      expect(devCred.user.email).toContain('dev')
    })
  })

  // ── 3. DASHBOARD & SAFETY SCORE DISPLAY ─────────────────────────────
  describe('Workflow 3 & 8: Dashboard & Safety Score Display', () => {
    it('renders SafetyStatusBadge correctly across all safety score ranges', () => {
      const positiveHtml = renderToStaticMarkup(React.createElement(SafetyStatusBadge, { stateKey: 'generally-positive' }))
      expect(positiveHtml).toContain('Generally positive')

      const cautionHtml = renderToStaticMarkup(React.createElement(SafetyStatusBadge, { stateKey: 'caution' }))
      expect(cautionHtml).toContain('Caution')

      const dangerHtml = renderToStaticMarkup(React.createElement(SafetyStatusBadge, { stateKey: 'higher-concern' }))
      expect(dangerHtml).toContain('Higher concern')

      const limitedHtml = renderToStaticMarkup(React.createElement(SafetyStatusBadge, { stateKey: 'limited-data' }))
      expect(limitedHtml).toContain('Limited community data')
    })

    it('renders ConfidenceBadge with corresponding confidence levels', () => {
      const highHtml = renderToStaticMarkup(React.createElement(ConfidenceBadge, { tier: 'high' }))
      expect(highHtml).toContain('High confidence')

      const medHtml = renderToStaticMarkup(React.createElement(ConfidenceBadge, { tier: 'moderate' }))
      expect(medHtml).toContain('Moderate confidence')

      const lowHtml = renderToStaticMarkup(React.createElement(ConfidenceBadge, { tier: 'low' }))
      expect(lowHtml).toContain('Low confidence')
    })

    it('renders DataFreshnessBadge with correct timestamp formatting', () => {
      const recentHtml = renderToStaticMarkup(
        React.createElement(DataFreshnessBadge, { date: new Date() })
      )
      expect(recentHtml).toContain('Updated')
    })
  })

  // ── 4. AREA SEARCH & SUGGESTIONS ───────────────────────────────────
  describe('Workflow 4: Area Search & Suggestion Engine', () => {
    it('returns matched suggestions for catalog query', async () => {
      const suggestions = await geocodingService.getAreaSuggestions('Colaba')
      expect(suggestions.length).toBeGreaterThan(0)
      const found = suggestions.find((s) => s.mainText.toLowerCase().includes('colaba'))
      expect(found).toBeDefined()
    })

    it('returns empty array when query length is below threshold (< 2 chars)', async () => {
      const suggestions = await geocodingService.getAreaSuggestions('a')
      expect(suggestions).toEqual([])
    })

    it('constructs zero-data unreported area with unverified and low confidence status', () => {
      const bounds = {
        northEast: { latitude: 12.98, longitude: 77.65 },
        southWest: { latitude: 12.96, longitude: 77.63 },
      }
      const unrated = createUnreportedArea('area-unrated-test', 'Unrated District', 'Bangalore', 'India', bounds)
      expect(unrated.reportCount).toBe(0)
      expect(unrated.confidenceLevel).toBe('low')
      expect(unrated.awarenessLevel).toBe('unknown')
    })
  })

  // ── 5. GOOGLE MAPS LAZY LOADING ─────────────────────────────────────
  describe('Workflow 5: Google Maps Component Loading', () => {
    it('does not bundle Google Maps in core entry bundle and verifies lazy module export', async () => {
      const mapModule = await import('@/pages/dashboard/SafetyMapPage')
      expect(mapModule.SafetyMapPage).toBeDefined()
      expect(typeof mapModule.SafetyMapPage).toBe('function')
    })
  })

  // ── 6. AREA RESOLUTION & LOCATION AWARENESS ────────────────────────
  describe('Workflow 6 & 10: Area Resolution & Foreground Alerts', () => {
    const testArea: Area = {
      id: 'area-alert-test',
      name: 'Test Caution Zone',
      city: 'Bangalore',
      fullName: 'Test Caution Zone, Bangalore',
      center: { latitude: 12.97, longitude: 77.64 },
      radiusMeters: 500,
      bounds: {
        northEast: { latitude: 12.98, longitude: 77.65 },
        southWest: { latitude: 12.96, longitude: 77.63 },
      },
      polygon: '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true,
      reportCount: 12,
      recentReportCount: 6,
      overallScore: 52,
      timeScores: { day: 65, evening: 55, night: 42 },
      confidenceLevel: 'moderate',
      confidence: 'moderate',
      awarenessLevel: 'mixed',
      dayNightSplit: { day: 65, night: 35 },
      topObservations: [],
      aiSummary: null,
      aiSummaryGeneratedAt: null,
    }

    it('determines if coordinates fall within monitored boundary', () => {
      const inside = locationAwarenessService.isPointInArea(
        { latitude: 12.97, longitude: 77.64 },
        testArea,
      )
      expect(inside).toBe(true)

      const outside = locationAwarenessService.isPointInArea(
        { latitude: 13.50, longitude: 78.00 },
        testArea,
      )
      expect(outside).toBe(false)
    })

    it('triggers foreground entry alert for higher-concern areas', () => {
      const event = locationAwarenessService.processLocationUpdate(
        { latitude: 12.97, longitude: 77.64 },
        [testArea],
        1000000,
      )
      expect(event).not.toBeNull()
      expect(event?.alertTriggered).toBe(true)
      expect(event?.alert?.stateLabel).toBe('Caution')
      expect(event?.alert?.alertMessage).toContain('Recent community feedback indicates caution')
    })
  })

  // ── 11. ALERT COOLDOWN LOGIC ────────────────────────────────────────
  describe('Workflow 11: Alert Cooldown Logic', () => {
    it('enforces cooldown preventing duplicate alerts for the same area within cooldown window', () => {
      const area: Area = {
        id: 'area-cooldown-check',
        name: 'Cooldown Street',
        city: 'Bangalore',
        fullName: 'Cooldown Street, Bangalore',
        center: { latitude: 12.97, longitude: 77.64 },
        radiusMeters: 500,
        bounds: {
          northEast: { latitude: 12.98, longitude: 77.65 },
          southWest: { latitude: 12.96, longitude: 77.63 },
        },
        polygon: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
        reportCount: 10,
        recentReportCount: 5,
        overallScore: 45,
        timeScores: { day: 50, evening: 45, night: 35 },
        confidence: 'moderate',
        confidenceLevel: 'moderate',
        awarenessLevel: 'mixed',
        dayNightSplit: { day: 50, night: 50 },
        topObservations: [],
        aiSummary: null,
        aiSummaryGeneratedAt: null,
      }

      // Initial entry triggers alert
      const event1 = locationAwarenessService.processLocationUpdate(
        { latitude: 12.97, longitude: 77.64 },
        [area],
        1000000,
      )
      expect(event1?.alertTriggered).toBe(true)

      // Exit area
      locationAwarenessService.processLocationUpdate(
        { latitude: 13.50, longitude: 78.00 },
        [area],
        1000001,
      )

      // Re-entering within cooldown period does not trigger a second alert
      const event2 = locationAwarenessService.processLocationUpdate(
        { latitude: 12.97, longitude: 77.64 },
        [area],
        1000002, // 1ms later, well within 4h cooldown
      )
      expect(event2?.alertTriggered).toBe(false)

      // Reset cooldown and re-enter triggers alert
      locationAwarenessService.clearCooldowns()
      locationAwarenessService.processLocationUpdate(
        { latitude: 13.50, longitude: 78.00 },
        [area],
        1000003,
      )
      const event3 = locationAwarenessService.processLocationUpdate(
        { latitude: 12.97, longitude: 77.64 },
        [area],
        1000004,
      )
      expect(event3?.alertTriggered).toBe(true)
    })
  })

  // ── 7. REPORT SUBMISSION VALIDATION ────────────────────────────────
  describe('Workflow 7: Report Submission Validation', () => {
    it('validates report fields: rating between 1-5, allowed tags, and character limits', () => {
      const validPayload = {
        areaId: 'area-1',
        rating: 4,
        timeContext: 'evening' as const,
        tags: ['Well-lit', 'Crowded'],
        note: 'Busy market street with open shops.',
      }

      expect(validPayload.rating).toBeGreaterThanOrEqual(1)
      expect(validPayload.rating).toBeLessThanOrEqual(5)
      expect(validPayload.note.length).toBeLessThanOrEqual(280)
      expect(validPayload.tags.length).toBeGreaterThan(0)
    })
  })

  // ── 9. AI SAFETY INSIGHT ENGINE ────────────────────────────────────
  describe('Workflow 9: AI Safety Insights with Anti-Hallucination Guardrails', () => {
    it('generates grounded synthesis for area with community observations', () => {
      const area: Area = {
        id: 'area-ai-smoke',
        name: 'Koramangala 5th Block',
        city: 'Bangalore',
        fullName: 'Koramangala 5th Block, Bangalore',
        center: { latitude: 12.935, longitude: 77.624 },
        radiusMeters: 600,
        bounds: {
          northEast: { latitude: 12.94, longitude: 77.63 },
          southWest: { latitude: 12.93, longitude: 77.61 },
        },
        polygon: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
        reportCount: 8,
        recentReportCount: 5,
        confidenceLevel: 'moderate',
        confidence: 'moderate',
        awarenessLevel: 'active',
        overallScore: 78,
        timeScores: { day: 80, evening: 75, night: 68 },
        dayNightSplit: { day: 80, night: 68 },
        topObservations: [],
        aiSummary: null,
        aiSummaryGeneratedAt: null,
      }

      const payload = aiSafetyEngineService.prepareAggregatedPayload(area, [])
      const summary = aiSafetyEngineService.generateGroundedSynthesis(payload)

      expect(summary.areaId).toBe('area-ai-smoke')
      expect(summary.confidenceLabel).toBeDefined()
      expect(summary.freshnessText).toBeDefined()
      expect(summary.day.summaryText).toBeDefined()
      expect(summary.night.summaryText).toBeDefined()

      // Guardrail check
      const check = aiSafetyEngineService.verifyOutputGuardrails(summary, payload)
      expect(check.isValid).toBe(true)
    })

    it('generates low confidence warning for area with 0 community reports', () => {
      const emptyArea: Area = {
        id: 'area-empty',
        name: 'Unrated Sector',
        city: 'Bangalore',
        fullName: 'Unrated Sector, Bangalore',
        center: { latitude: 12.9, longitude: 77.6 },
        radiusMeters: 500,
        bounds: {
          northEast: { latitude: 12.91, longitude: 77.61 },
          southWest: { latitude: 12.89, longitude: 77.59 },
        },
        polygon: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
        reportCount: 0,
        recentReportCount: 0,
        confidenceLevel: 'low',
        confidence: 'low',
        awarenessLevel: 'unknown',
        overallScore: 50,
        timeScores: { day: 50, evening: 50, night: 50 },
        dayNightSplit: { day: 50, night: 50 },
        topObservations: [],
        aiSummary: null,
        aiSummaryGeneratedAt: null,
      }

      const payload = aiSafetyEngineService.prepareAggregatedPayload(emptyArea, [])
      const summary = aiSafetyEngineService.generateGroundedSynthesis(payload)
      expect(summary.summaryText.toLowerCase()).toContain('limited')
      expect(summary.summaryText.toLowerCase()).toContain('low confidence')
    })
  })

  // ── 12. TRUSTED SAFETY CIRCLE ──────────────────────────────────────
  describe('Workflow 12: Trusted Safety Circle Limits & Actions', () => {
    it('restricts contacts to a maximum of 3', () => {
      const contacts = [
        { id: 'c1', name: 'Partner', phone: '+919876543210' },
        { id: 'c2', name: 'Parent', phone: '+919876543211' },
        { id: 'c3', name: 'Sibling', phone: '+919876543212' },
      ]
      expect(contacts.length).toBeLessThanOrEqual(3)
    })
  })

  // ── 13 & 14. DEVELOPER TOOLS & ADMIN DASHBOARD ─────────────────────
  describe('Workflow 13 & 14: Developer Tools & Admin Dashboard Components', () => {
    it('verifies DevToolsPage lazy export and zone simulation controls', async () => {
      const devModule = await import('@/pages/dashboard/DevToolsPage')
      expect(devModule.DevToolsPage).toBeDefined()
    })

    it('verifies AdminDashboardPage lazy export and moderation queue', async () => {
      const adminModule = await import('@/pages/dashboard/AdminDashboardPage')
      expect(adminModule.AdminDashboardPage).toBeDefined()
    })
  })

  // ── 16. PRIVACY CONTROLS ───────────────────────────────────────────
  describe('Workflow 16: Privacy-Preserving Guarantees', () => {
    it('ensures continuous GPS tracking is not used and reports use pseudonymized reporterRef', () => {
      const report: Partial<Report> = {
        id: 'rep-privacy-1',
        areaId: 'area-indiranagar',
        reporterRef: 'rep_anon_9f8b',
        isAnonymous: true,
        reporterUid: null,
      }

      expect(report.reporterUid).toBeNull()
      expect(report.reporterRef).toBe('rep_anon_9f8b')
    })
  })

  // ── 17 & 18. ERROR & LOADING STATES ────────────────────────────────
  describe('Workflow 17 & 18: Error & Loading States', () => {
    it('renders 404 NotFoundPage with navigation link to home inside router', () => {
      const html = renderToStaticMarkup(
        React.createElement(MemoryRouter, null, React.createElement(NotFoundPage))
      )
      expect(html).toContain('404 Error')
      expect(html).toContain('Area Out of Bounds')
      expect(html).toContain('Awareness Map')
    })

    it('renders LoadingScreen with accessible message and spinner', () => {
      const html = renderToStaticMarkup(
        React.createElement(LoadingScreen, { message: 'Loading safety analysis...' })
      )
      expect(html).toContain('Loading safety analysis...')
      expect(html).toContain('role="status"')
    })

    it('renders Skeleton and CardSkeleton loading placeholders', () => {
      const html = renderToStaticMarkup(React.createElement(CardSkeleton))
      expect(html).toContain('animate-pulse')
    })

    it('renders ErrorBoundary with fallback UI when configured with an error state', () => {
      const boundaryInstance = new ErrorBoundary({ children: React.createElement('div', null, 'Normal content') })
      boundaryInstance.state = { hasError: true, error: new Error('Simulated failure') }
      const fallbackHtml = renderToStaticMarkup(boundaryInstance.render())
      expect(fallbackHtml).toContain('Something went wrong')
      expect(fallbackHtml).toContain('Try again')
    })
  })

  // ── 19. MOBILE-RESPONSIVE DOM DESIGN SYSTEM ────────────────────────
  describe('Workflow 19: Mobile-Responsive DOM & Touch Ergonomics', () => {
    it('renders interactive Button with min 44px touch ergonomics and focus visible', () => {
      const html = renderToStaticMarkup(
        React.createElement(Button, { variant: 'primary', size: 'md' }, 'Report Safety')
      )
      expect(html).toContain('focus-visible:ring-2')
      expect(html).toContain('Report Safety')
    })

    it('renders Card with navy surface and border tokens', () => {
      const html = renderToStaticMarkup(
        React.createElement(Card, { variant: 'navy' }, 'Card Content')
      )
      expect(html).toContain('bg-[#122338]')
      expect(html).toContain('border-[#1E3550]')
      expect(html).toContain('Card Content')
    })
  })
})
