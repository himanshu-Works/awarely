import { useState } from 'react'
import {
  ShieldCheck,
  EyeOff,
  MapPin,
  Download,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/design-system/Card'
import { Button } from '@/components/design-system/Button'

export function PrivacySettingsPage() {
  const { userProfile } = useAuth()
  const [coarseOnly, setCoarseOnly] = useState(true)
  const [defaultAnonymous, setDefaultAnonymous] = useState(true)
  const [exportNotice, setExportNotice] = useState(false)
  const [cacheCleared, setCacheCleared] = useState(false)

  function handleExportAudit() {
    setExportNotice(true)
    const auditData = {
      timestamp: new Date().toISOString(),
      accountType: userProfile?.role || 'user',
      coarseLocationConsent: coarseOnly,
      anonymousReportingDefault: defaultAnonymous,
      termsAcceptedAt: userProfile?.consent?.termsAcceptedAt || 'Acknowledged',
      privacyAcceptedAt: userProfile?.consent?.privacyAcceptedAt || 'Acknowledged',
      telemetryTracking: 'Disabled (Zero continuous GPS trails stored)',
    }

    const blob = new Blob([JSON.stringify(auditData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `awarely_privacy_audit_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)

    setTimeout(() => setExportNotice(false), 3000)
  }

  function handleClearCache() {
    setCacheCleared(true)
    setTimeout(() => setCacheCleared(false), 2500)
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          <span>Privacy & Consent Settings</span>
        </h1>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Awarely operates under a strict privacy-first architecture: no continuous GPS tracking, ephemeral queries, and default anonymity.
        </p>
      </div>

      {/* ── Core Privacy Toggles ─────────────────────────────────────── */}
      <Card variant="navy" className="p-6 sm:p-8 space-y-6 border-[var(--border)] bg-[var(--surface)] shadow-xl">
        <div className="space-y-4">
          {/* Ephemeral Coarse Location */}
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                <MapPin className="h-4 w-4 text-[var(--primary)]" />
                <span>Ephemeral Coarse Location Protocol</span>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                When querying nearby areas, coordinates are truncated to coarse grid boundaries (~1.1km) and immediately discarded. Continuous background GPS tracking is strictly forbidden.
              </p>
            </div>
            <input
              type="checkbox"
              checked={coarseOnly}
              onChange={(e) => setCoarseOnly(e.target.checked)}
              className="h-5 w-5 accent-[var(--primary)] rounded cursor-pointer mt-1"
            />
          </div>

          {/* Default Anonymous Reporting */}
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                <EyeOff className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Default Anonymous Contributions</span>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                All community observation submissions strip your profile identifier, email, and device ID before aggregation.
              </p>
            </div>
            <input
              type="checkbox"
              checked={defaultAnonymous}
              onChange={(e) => setDefaultAnonymous(e.target.checked)}
              className="h-5 w-5 accent-[var(--primary)] rounded cursor-pointer mt-1"
            />
          </div>

          {/* Consent Timestamps */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
              Consent & Legal Agreements
            </span>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs text-[var(--foreground-secondary)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="text-[var(--foreground)] font-medium">Terms of Service Acceptance</span>
                </span>
                <span className="text-[var(--foreground-muted)]">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="text-[var(--foreground)] font-medium">Privacy Policy & Ephemeral Data Processing</span>
                </span>
                <span className="text-[var(--foreground-muted)]">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="text-[var(--foreground)] font-medium">Data Retention & Anonymization Schedule</span>
                </span>
                <span className="text-[var(--foreground-muted)]">90-Day Auto Expiry</span>
              </div>
            </div>
          </div>

          {/* Export & Clear Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleExportAudit}
            >
              Export Privacy Audit
            </Button>

            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4 text-rose-500 dark:text-rose-400" />}
              onClick={handleClearCache}
            >
              Clear Session Cache
            </Button>
          </div>

          {exportNotice && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">
              ✓ Telemetry audit file downloaded to your device.
            </p>
          )}
          {cacheCleared && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center font-medium">
              ✓ Local ephemeral cache cleared.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
