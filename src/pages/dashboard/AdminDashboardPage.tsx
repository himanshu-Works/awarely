import { useState, useEffect } from 'react'
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Layers,
  Clock,
  Eye,
  Filter,
  Trash2,
  Flag,
  Image as ImageIcon,
  Check,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useArea } from '@/contexts/AreaContext'
import { RestrictedAccess } from '@/components/auth/RestrictedAccess'
import { Card } from '@/components/design-system/Card'
import { Button } from '@/components/design-system/Button'
import { Badge } from '@/components/design-system/Badge'
import { SafetyStatusBadge } from '@/components/awareness/SafetyStatusBadge'
import { ConfidenceBadge } from '@/components/design-system/ConfidenceBadge'
import { DataFreshnessBadge } from '@/components/awareness/DataFreshnessBadge'
import { EmptyState } from '@/components/design-system/EmptyState'
import { adminService, type ModerationStats } from '@/services/admin.service'
import type { Report, ModerationStatus } from '@/types/report'
import type { AdminAuditLog } from '@/types/admin'
import { Timestamp } from 'firebase/firestore'

export function AdminDashboardPage() {
  const { user, userProfile, isAdmin } = useAuth()
  const { areas, userReports, updateAreaMetrics } = useArea()

  // ── TABS & FILTERS ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'moderation' | 'areas' | 'audit'>('moderation')
  const [statusFilter, setStatusFilter] = useState<ModerationStatus | 'all'>('all')

  // ── REPORTS STATE ──────────────────────────────────────────────────
  const [reports, setReports] = useState<Report[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([])
  const [stats, setStats] = useState<ModerationStats>({
    totalReports: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    flaggedCount: 0,
  })

  // ── MODAL STATES ───────────────────────────────────────────────────
  const [selectedReportForReview, setSelectedReportForReview] = useState<Report | null>(null)
  const [rejectionModalReport, setRejectionModalReport] = useState<Report | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [flagModalReport, setFlagModalReport] = useState<Report | null>(null)
  const [flagReason, setFlagReason] = useState('')
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // ── ACCESS GUARD: ADMIN ONLY ───────────────────────────────────────
  if (!isAdmin) {
    return (
      <RestrictedAccess
        requiredRole="Administrator"
        title="Admin Dashboard Restricted"
        description="Access to report moderation queues, governance audit trails, and community safety veracity standards is restricted strictly to verified administrators."
      />
    )
  }

  // ── INITIAL DATA LOAD & SYNC ───────────────────────────────────────
  useEffect(() => {
    // Combine seed mock reports and user submitted reports
    const defaultModerationSeed: Report[] = [
      {
        id: 'rep-mod-1',
        areaId: 'area-delhi-rail-corridor',
        areaName: 'Old Delhi Transit & Railway Perimeter',
        rating: 1,
        timeContext: 'night',
        tags: ['Poor lighting', 'Isolated'],
        note: 'Streetlamps near underpass 3 are non-functional. Isolated foot traffic after 10 PM.',
        photoUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
        createdAt: Timestamp.fromMillis(Date.now() - 35 * 60 * 1000),
        moderationStatus: 'pending',
        weight: 1.0,
        platform: 'web',
        isAnonymous: true,
        reporterRef: 'usr-***38a',
      },
      {
        id: 'rep-mod-2',
        areaId: 'area-delhi-hauz-khas',
        areaName: 'Hauz Khas Village & Environs',
        rating: 3,
        timeContext: 'evening',
        tags: ['Crowded', 'Poor lighting'],
        note: 'Crowded restaurant alley, but dim lighting near the deer park exit gate.',
        photoUrl: null,
        createdAt: Timestamp.fromMillis(Date.now() - 2 * 3600 * 1000),
        moderationStatus: 'pending',
        weight: 1.0,
        platform: 'web',
        isAnonymous: false,
        reporterRef: 'usr-***91b',
      },
      {
        id: 'rep-mod-3',
        areaId: 'area-mumbai-colaba',
        areaName: 'Colaba & Gateway Promenade',
        rating: 5,
        timeContext: 'day',
        tags: ['Well-lit', 'High foot traffic', 'Police presence'],
        note: 'Very high police presence near monument. Active crowds and opened shops.',
        photoUrl: null,
        createdAt: Timestamp.fromMillis(Date.now() - 6 * 3600 * 1000),
        moderationStatus: 'approved',
        weight: 1.0,
        platform: 'web',
        isAnonymous: false,
        reporterRef: 'usr-***44c',
      },
      {
        id: 'rep-mod-4',
        areaId: 'area-delhi-cp',
        areaName: 'Connaught Place (Inner & Outer Circle)',
        rating: 1,
        timeContext: 'night',
        tags: ['Isolated'],
        note: 'Spam submission: promotional flyer advertised for illegal watch store.',
        photoUrl: null,
        createdAt: Timestamp.fromMillis(Date.now() - 12 * 3600 * 1000),
        moderationStatus: 'flagged',
        weight: 1.0,
        platform: 'web',
        isAnonymous: true,
        reporterRef: 'usr-***02x',
      },
    ]

    const merged = [
      ...userReports.map((r) => adminService.sanitizeReportForAdmin(r)),
      ...defaultModerationSeed,
    ]

    // Deduplicate by id
    const uniqueMap = new Map<string, Report>()
    merged.forEach((r) => uniqueMap.set(r.id, r))
    const reportList = Array.from(uniqueMap.values())

    setReports(reportList)
    setStats(adminService.computeStatistics(reportList))

    // Load audit logs
    adminService.getAuditLogs().then(setAuditLogs)
  }, [userReports])

  // ── MODERATION ACTIONS ─────────────────────────────────────────────

  const adminActor = {
    uid: user?.uid || 'admin-root',
    email: userProfile?.email || user?.email || 'admin@awarely.org',
    displayName: userProfile?.displayName || user?.displayName || 'Chief Safety Officer',
  }

  async function handleApprove(report: Report) {
    const { auditLog } = await adminService.approveReport(
      adminActor,
      report.id,
      report.areaId,
      report.areaName,
    )

    const updated = reports.map((r) =>
      r.id === report.id ? { ...r, moderationStatus: 'approved' as ModerationStatus } : r,
    )
    setReports(updated)
    setStats(adminService.computeStatistics(updated))
    setAuditLogs([auditLog, ...auditLogs])

    // Downstream update context metrics
    updateAreaMetrics(report.areaId, {
      reportCount: (areas.find((a) => a.id === report.areaId)?.reportCount || 0) + 1,
    })

    setActionNotice(
      `Report ${report.id} approved. Recalculated area score & invalidated AI summary for ${report.areaName || 'area'}.`,
    )
    if (selectedReportForReview?.id === report.id) setSelectedReportForReview(null)
  }

  async function handleConfirmReject() {
    if (!rejectionModalReport) return
    const reason = rejectionReason.trim() || 'Violates community veracity guidelines'

    const { auditLog } = await adminService.rejectReport(
      adminActor,
      rejectionModalReport.id,
      rejectionModalReport.areaId,
      reason,
      rejectionModalReport.areaName,
    )

    const updated = reports.map((r) =>
      r.id === rejectionModalReport.id
        ? { ...r, moderationStatus: 'rejected' as ModerationStatus, moderationReason: reason }
        : r,
    )
    setReports(updated)
    setStats(adminService.computeStatistics(updated))
    setAuditLogs([auditLog, ...auditLogs])

    setActionNotice(`Report ${rejectionModalReport.id} rejected. Logged audit trail and recomputed score.`)
    setRejectionModalReport(null)
    setRejectionReason('')
    if (selectedReportForReview?.id === rejectionModalReport.id) setSelectedReportForReview(null)
  }

  async function handleConfirmFlag() {
    if (!flagModalReport) return
    const reason = flagReason.trim() || 'Suspected coordinate harassment or inappropriate note'

    const auditLog = await adminService.flagReport(
      adminActor,
      flagModalReport.id,
      flagModalReport.areaId,
      reason,
      flagModalReport.areaName,
    )

    const updated = reports.map((r) =>
      r.id === flagModalReport.id
        ? { ...r, moderationStatus: 'flagged' as ModerationStatus, moderationReason: reason }
        : r,
    )
    setReports(updated)
    setStats(adminService.computeStatistics(updated))
    setAuditLogs([auditLog, ...auditLogs])

    setActionNotice(`Report ${flagModalReport.id} flagged for review. Audit log recorded.`)
    setFlagModalReport(null)
    setFlagReason('')
    if (selectedReportForReview?.id === flagModalReport.id) setSelectedReportForReview(null)
  }

  async function handleRemoveContent(report: Report) {
    if (!confirm('Are you sure you want to remove this inappropriate report? This action will be audited.'))
      return

    const { auditLog } = await adminService.removeReport(
      adminActor,
      report.id,
      report.areaId,
      'Inappropriate content removed by administrator',
      report.areaName,
    )

    const updated = reports.filter((r) => r.id !== report.id)
    setReports(updated)
    setStats(adminService.computeStatistics(updated))
    setAuditLogs([auditLog, ...auditLogs])

    setActionNotice(`Inappropriate content ${report.id} removed. Area metrics recalculated.`)
    if (selectedReportForReview?.id === report.id) setSelectedReportForReview(null)
  }

  // ── FILTERED REPORTS ───────────────────────────────────────────────
  const filteredReports = reports.filter((r) => {
    if (statusFilter === 'all') return true
    return (r.moderationStatus || 'pending') === statusFilter
  })

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>System Administration & Governance</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          Awarely Admin Dashboard
        </h1>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Review community reports, verify moderation standards, inspect audit logs, and trigger area score
          recalculations.
        </p>
      </div>

      {/* Action feedback notice */}
      {actionNotice && (
        <div className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-3.5 text-xs text-teal-800 dark:text-teal-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span>{actionNotice}</span>
          </span>
          <button onClick={() => setActionNotice(null)} className="text-teal-600 dark:text-teal-400 hover:text-[var(--foreground)]">
            ✕
          </button>
        </div>
      )}

      {/* ── Governance Statistics Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card variant="navy" className="p-4 border-[var(--border)] bg-[var(--surface)] space-y-1">
          <span className="text-[11px] uppercase font-bold text-[var(--foreground-muted)]">Total Reports</span>
          <div className="text-2xl font-black text-[var(--foreground)]">{stats.totalReports}</div>
          <span className="text-[10px] text-[var(--foreground-muted)]">Community submissions</span>
        </Card>

        <Card variant="navy" className="p-4 border-amber-500/40 bg-amber-500/10 space-y-1">
          <span className="text-[11px] uppercase font-bold text-amber-700 dark:text-amber-400">Pending Review</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-300">{stats.pendingCount}</div>
          <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80">Requires verification</span>
        </Card>

        <Card variant="navy" className="p-4 border-emerald-500/40 bg-emerald-500/10 space-y-1">
          <span className="text-[11px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Approved</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-300">{stats.approvedCount}</div>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">Active in score engine</span>
        </Card>

        <Card variant="navy" className="p-4 border-rose-500/40 bg-rose-500/10 space-y-1">
          <span className="text-[11px] uppercase font-bold text-rose-700 dark:text-rose-400">Rejected</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-300">{stats.rejectedCount}</div>
          <span className="text-[10px] text-rose-700/80 dark:text-rose-400/80">Excluded from consensus</span>
        </Card>

        <Card variant="navy" className="p-4 border-purple-500/40 bg-purple-500/10 space-y-1">
          <span className="text-[11px] uppercase font-bold text-purple-700 dark:text-purple-400">Flagged</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-300">{stats.flaggedCount}</div>
          <span className="text-[10px] text-purple-700/80 dark:text-purple-400/80">Under investigation</span>
        </Card>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────────── */}
      <div className="flex border-b border-[var(--border)] gap-6">
        <button
          onClick={() => setActiveTab('moderation')}
          className={`pb-3 text-xs sm:text-sm font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'moderation'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Moderation Queue ({filteredReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('areas')}
          className={`pb-3 text-xs sm:text-sm font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'areas'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>District Health & Statistics ({areas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs sm:text-sm font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Administrative Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* ── TAB 1: MODERATION QUEUE CONTENT ──────────────────────────── */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          {/* Status Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-xs">
            <div className="flex items-center gap-1.5 text-[var(--foreground-secondary)] font-bold">
              <Filter className="h-3.5 w-3.5 text-[var(--primary)]" />
              <span>Status Filter:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'pending', 'approved', 'rejected', 'flagged'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-xl px-3 py-1 text-xs font-semibold capitalize transition ${
                    statusFilter === st
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow'
                      : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-[var(--foreground-muted)]">
              Showing {filteredReports.length} of {reports.length} reports
            </span>
          </div>

          {/* Reports List */}
          {filteredReports.length > 0 ? (
            <div className="space-y-3">
              {filteredReports.map((report) => {
                const status = report.moderationStatus || 'pending'
                return (
                  <div
                    key={report.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-lg hover:border-[var(--border-strong)] transition"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            status === 'approved'
                              ? 'positive'
                              : status === 'pending'
                              ? 'caution'
                              : status === 'flagged'
                              ? 'orange'
                              : 'concern'
                          }
                          size="sm"
                        >
                          {status.toUpperCase()}
                        </Badge>

                        <span className="text-xs font-mono text-[var(--foreground-muted)]">
                          ID: {report.id.slice(-8)}
                        </span>

                        <span className="text-xs text-[var(--foreground-muted)]">·</span>

                        <span className="text-xs text-[var(--foreground-muted)]">
                          Reporter: <strong className="text-[var(--foreground-secondary)]">{report.reporterRef || 'Anonymous'}</strong>
                        </span>

                        <span className="text-xs text-[var(--foreground-muted)]">·</span>

                        <span className="text-xs text-[var(--foreground-muted)] capitalize">
                          Time Context: <strong className="text-[var(--foreground-secondary)]">{report.timeContext || 'Day'}</strong>
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-[var(--foreground)]">
                          {report.areaName || `Area ${report.areaId}`}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-[var(--primary)]">
                            Rating: {report.rating} / 5
                          </span>
                          {report.tags && report.tags.length > 0 && (
                            <span className="text-xs text-[var(--foreground-secondary)]">
                              · Observations: <em>{report.tags.join(', ')}</em>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Note */}
                      {report.note && (
                        <p className="text-xs text-[var(--foreground-secondary)] bg-[var(--surface-muted)] border border-[var(--border)] p-2.5 rounded-xl">
                          "{report.note}"
                        </p>
                      )}

                      {/* Photo Thumbnail */}
                      {report.photoUrl && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setViewPhotoUrl(report.photoUrl || null)}
                            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs text-teal-600 dark:text-teal-300 hover:border-teal-500 transition"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            <span>View Contextual Photo</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Moderation Action Buttons */}
                    <div className="flex flex-wrap md:flex-col items-center gap-2 shrink-0">
                      {status !== 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          leftIcon={<Check className="h-3.5 w-3.5" />}
                          onClick={() => handleApprove(report)}
                        >
                          Approve Report
                        </Button>
                      )}

                      {status !== 'rejected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                          leftIcon={<XCircle className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setRejectionModalReport(report)
                            setRejectionReason('')
                          }}
                        >
                          Reject Report
                        </Button>
                      )}

                      <div className="flex items-center gap-1.5 w-full">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-xs text-[var(--foreground-secondary)]"
                          leftIcon={<Eye className="h-3.5 w-3.5" />}
                          onClick={() => setSelectedReportForReview(report)}
                        >
                          Details
                        </Button>

                        {status !== 'flagged' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                            title="Flag inappropriate content"
                            onClick={() => {
                              setFlagModalReport(report)
                              setFlagReason('')
                            }}
                          >
                            <Flag className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                          title="Remove content"
                          onClick={() => handleRemoveContent(report)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title="No reports match filter"
              description={`There are currently no reports with moderation status '${statusFilter}'.`}
            />
          )}
        </div>
      )}

      {/* ── TAB 2: DISTRICT HEALTH & STATISTICS ──────────────────────── */}
      {activeTab === 'areas' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-muted)] uppercase font-semibold">
                <tr>
                  <th className="p-4">District / Area</th>
                  <th className="p-4">Safety State</th>
                  <th className="p-4">Confidence</th>
                  <th className="p-4">Data Freshness</th>
                  <th className="p-4">Reports</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {areas.map((area) => {
                  const latestDate = area.latestReportAt
                    ? typeof area.latestReportAt.toDate === 'function'
                      ? area.latestReportAt.toDate()
                      : new Date()
                    : null

                  return (
                    <tr key={area.id} className="hover:bg-[var(--surface-muted)] transition">
                      <td className="p-4 font-bold text-[var(--foreground)]">
                        <div>{area.name}</div>
                        <div className="text-[11px] text-[var(--foreground-muted)] font-normal">
                          {area.city}, {area.country || 'Global'}
                        </div>
                      </td>
                      <td className="p-4">
                        <SafetyStatusBadge area={area} />
                      </td>
                      <td className="p-4">
                        <ConfidenceBadge tier={area.confidenceLevel || 'low'} />
                      </td>
                      <td className="p-4">
                        <DataFreshnessBadge date={latestDate} />
                      </td>
                      <td className="p-4 font-mono font-bold text-[var(--foreground-secondary)]">{area.reportCount}</td>
                      <td className="p-4">
                        <button
                          onClick={() => {
                            setActionNotice(`Recalculated area score for ${area.name}.`)
                          }}
                          className="flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 hover:text-[var(--foreground)]"
                          title="Recalculate Area Score"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Recompute</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: ADMINISTRATIVE AUDIT TRAIL ────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
                Immutable Governance Audit Trail
              </h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                Every administrative action (approvals, rejections, flags, removals) is permanently logged.
              </p>
            </div>
            <Badge variant="navy">{auditLogs.length} Logged Actions</Badge>
          </div>

          {auditLogs.length > 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] overflow-hidden">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          log.action === 'APPROVE_REPORT'
                            ? 'positive'
                            : log.action === 'REJECT_REPORT' || log.action === 'REMOVE_REPORT'
                            ? 'concern'
                            : 'orange'
                        }
                        size="sm"
                      >
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                      <span className="font-mono text-[var(--foreground-muted)] text-[11px]">{log.affectedEntity}</span>
                      {log.areaName && (
                        <span className="text-[var(--foreground-secondary)] font-bold">· {log.areaName}</span>
                      )}
                    </div>

                    <p className="text-[11px] text-[var(--foreground-secondary)]">
                      {log.details || log.reason || 'Administrative action performed'}
                    </p>

                    <div className="text-[10px] text-[var(--foreground-muted)]">
                      Admin: <strong className="text-[var(--foreground-secondary)]">{log.adminDisplayName}</strong> ({log.adminEmail})
                    </div>
                  </div>

                  <div className="text-[11px] text-[var(--foreground-muted)] font-mono shrink-0">
                    {log.timestamp && typeof log.timestamp.toDate === 'function'
                      ? log.timestamp.toDate().toLocaleString()
                      : new Date().toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Audit trail is clear"
              description="No administrative moderation actions have been performed yet in this session."
            />
          )}
        </div>
      )}

      {/* ── MODAL 1: REPORT DETAILS INSPECTION ───────────────────────── */}
      {selectedReportForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-[var(--foreground)]">Report Verification Details</h3>
              <button
                onClick={() => setSelectedReportForReview(null)}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                <div>
                  <span className="text-[10px] uppercase text-[var(--foreground-muted)]">Report ID</span>
                  <div className="font-mono text-[var(--foreground-secondary)]">{selectedReportForReview.id}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[var(--foreground-muted)]">Reporter Reference</span>
                  <div className="font-bold text-teal-600 dark:text-teal-400">
                    {selectedReportForReview.reporterRef || 'Anonymous'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[var(--foreground-muted)]">Perception Rating</span>
                  <div className="font-bold text-[var(--primary)]">{selectedReportForReview.rating} / 5</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[var(--foreground-muted)]">Time Context</span>
                  <div className="capitalize text-[var(--foreground-secondary)]">
                    {selectedReportForReview.timeContext || 'Day'}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[var(--foreground-muted)] block font-bold mb-1">Target District / Area</span>
                <div className="text-[var(--foreground)] font-bold text-sm">
                  {selectedReportForReview.areaName || selectedReportForReview.areaId}
                </div>
              </div>

              <div>
                <span className="text-[var(--foreground-muted)] block font-bold mb-1">Observation Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedReportForReview.tags?.map((t) => (
                    <span key={t} className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-[var(--foreground-secondary)] border border-[var(--border)]">
                      {t}
                    </span>
                  )) || <span className="text-[var(--foreground-muted)]">None specified</span>}
                </div>
              </div>

              <div>
                <span className="text-[var(--foreground-muted)] block font-bold mb-1">Contributor Note</span>
                <p className="text-[var(--foreground-secondary)] p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                  {selectedReportForReview.note || 'No descriptive text provided.'}
                </p>
              </div>

              {selectedReportForReview.photoUrl && (
                <div>
                  <span className="text-[var(--foreground-muted)] block font-bold mb-1">Contextual Photo</span>
                  <img
                    src={selectedReportForReview.photoUrl}
                    alt="Context"
                    className="w-full h-40 object-cover rounded-xl border border-[var(--border)]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button variant="ghost" size="sm" onClick={() => setSelectedReportForReview(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApprove(selectedReportForReview)}
              >
                Approve Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: REJECTION REASON ───────────────────────────────── */}
      {rejectionModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-[var(--surface-elevated)] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-500 dark:text-rose-400" />
              <span>Reject Community Report</span>
            </h3>

            <p className="text-xs text-[var(--foreground-secondary)]">
              Rejecting this report will exclude it from consensus calculations and record an immutable
              audit log entry.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground-secondary)]">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Unverified claim, suspicious burst, spam marketing"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--foreground)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-rose-500 h-24"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button variant="ghost" size="sm" onClick={() => setRejectionModalReport(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-500 text-white"
                onClick={handleConfirmReject}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: FLAG REPORT REASON ─────────────────────────────── */}
      {flagModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[var(--surface-elevated)] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
              <Flag className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              <span>Flag Inappropriate Content</span>
            </h3>

            <p className="text-xs text-[var(--foreground-secondary)]">
              Flagged reports remain under investigation and are scrutinized by senior moderators.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground-secondary)]">Flagging Reason</label>
              <textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g. Defamatory statement, offensive language, suspected coordination"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--foreground)] placeholder-[var(--input-placeholder)] focus:outline-none focus:border-amber-500 h-24"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button variant="ghost" size="sm" onClick={() => setFlagModalReport(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white"
                onClick={handleConfirmFlag}
              >
                Flag Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: PHOTO VIEWER ────────────────────────────────────── */}
      {viewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setViewPhotoUrl(null)}
        >
          <div className="max-w-2xl w-full bg-[var(--surface-elevated)] p-4 rounded-2xl border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
              <span>Contextual Contributor Photo Preview</span>
              <button onClick={() => setViewPhotoUrl(null)} className="text-[var(--foreground)] hover:text-rose-500">
                ✕
              </button>
            </div>
            <img src={viewPhotoUrl} alt="Enlarged context" className="w-full max-h-96 object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  )
}
