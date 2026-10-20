import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AreaProvider } from '@/contexts/AreaContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { SplashScreen } from '@/components/splash/SplashScreen'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppShell } from '@/components/navigation/AppShell'
import { LoadingScreen } from '@/components/ui/Spinner'

// ── Core Landing Views (Eagerly Loaded for Fast First Paint) ───────────
import { DashboardHomePage } from '@/pages/dashboard/DashboardHomePage'
import { SearchAreaPage } from '@/pages/dashboard/SearchAreaPage'
import { ReportSafetyPage } from '@/pages/dashboard/ReportSafetyPage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// ── Lazy Loaded Views (Code-Split for Initial Bundle Optimization) ─────
const SafetyMapPage = lazy(() =>
  import('@/pages/dashboard/SafetyMapPage').then((m) => ({ default: m.SafetyMapPage })),
)
const AreaDetailsPage = lazy(() =>
  import('@/pages/dashboard/AreaDetailsPage').then((m) => ({ default: m.AreaDetailsPage })),
)
const AiInsightsPage = lazy(() =>
  import('@/pages/dashboard/AiInsightsPage').then((m) => ({ default: m.AiInsightsPage })),
)
const AlertsPage = lazy(() =>
  import('@/pages/dashboard/AlertsPage').then((m) => ({ default: m.AlertsPage })),
)
const SafetyCirclePage = lazy(() =>
  import('@/pages/dashboard/SafetyCirclePage').then((m) => ({ default: m.SafetyCirclePage })),
)
const ProfilePage = lazy(() =>
  import('@/pages/dashboard/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const PrivacySettingsPage = lazy(() =>
  import('@/pages/dashboard/PrivacySettingsPage').then((m) => ({ default: m.PrivacySettingsPage })),
)
const UserReportsPage = lazy(() =>
  import('@/pages/dashboard/UserReportsPage').then((m) => ({ default: m.UserReportsPage })),
)
const DevToolsPage = lazy(() =>
  import('@/pages/dashboard/DevToolsPage').then((m) => ({ default: m.DevToolsPage })),
)
const AdminDashboardPage = lazy(() =>
  import('@/pages/dashboard/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
)

// ── Secondary Standalone & Auth Lazy Views ─────────────────────────────
const OnboardingPage = lazy(() =>
  import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
const DesignSystemPage = lazy(() =>
  import('@/pages/DesignSystemPage').then((m) => ({ default: m.DesignSystemPage })),
)

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AreaProvider>
            {/* Startup Splash Screen: 1.5s subtle fade/scale with official logo */}
            {showSplash && (
              <SplashScreen
                durationMs={1500}
                onComplete={() => setShowSplash(false)}
              />
            )}

            <Suspense fallback={<LoadingScreen message="Loading page..." />}>
              <Routes>
            {/* ── 13 Core Application Modules in AppShell ─────────────── */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowGuest={true}>
                  <AppShell>
                    <DashboardHomePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute allowGuest={true}>
                  <AppShell>
                    <SearchAreaPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/map"
              element={
                <ProtectedRoute allowGuest={true}>
                  <AppShell>
                    <SafetyMapPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/area"
              element={
                <ProtectedRoute allowGuest={true}>
                  <AppShell>
                    <AreaDetailsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute allowGuest={true}>
                  <AppShell>
                    <ReportSafetyPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/insights"
              element={
                <ProtectedRoute allowGuest={true}>
                  <AppShell>
                    <AiInsightsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute allowGuest={true}>
                  <AppShell>
                    <AlertsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/circle"
              element={
                <ProtectedRoute allowGuest={true}>
                  <AppShell>
                    <SafetyCirclePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowGuest={true}>
                  <AppShell>
                    <ProfilePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/privacy"
              element={
                <ProtectedRoute allowGuest={true}>
                  <AppShell>
                    <PrivacySettingsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute allowGuest={true}>
                  <AppShell>
                    <UserReportsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dev"
              element={
                <ProtectedRoute allowedRoles={['dev', 'admin']} allowGuest={false}>
                  <AppShell>
                    <DevToolsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']} allowGuest={false}>
                  <AppShell>
                    <AdminDashboardPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* ── Standalone Onboarding ────────────────────────────────── */}
            <Route
              path="/onboard"
              element={
                <ProtectedRoute allowGuest={true}>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* ── Authentication Routes ────────────────────────────────── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ── Design System Living Showcase ────────────────────────── */}
            <Route path="/design-system" element={<DesignSystemPage />} />

            {/* ── Fallbacks ────────────────────────────────────────────── */}
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
          </AreaProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
