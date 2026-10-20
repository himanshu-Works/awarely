import { useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  PlusCircle,
  Clock,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { Button } from '@/components/design-system/Button'
import { EmptyState } from '@/components/design-system/EmptyState'
import { getRelativeTimeLabel } from '@/utils/freshness'
import { normalizeToDate } from '@/utils/date'

export function UserReportsPage() {
  const navigate = useNavigate()
  const { userReports } = useArea()

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
            <ClipboardList className="h-6 w-6 text-[var(--primary)]" />
            <span>My Submitted Reports</span>
          </h1>
          <p className="text-sm text-[var(--foreground-secondary)]">
            History of your community contributions. All reports are automatically expired after 90 days.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<PlusCircle className="h-4 w-4" />}
          onClick={() => navigate('/report')}
        >
          Submit New Report
        </Button>
      </div>

      {/* ── Reports List or Empty State ──────────────────────────────── */}
      {userReports.length > 0 ? (
        <div className="space-y-4">
          <span className="text-xs text-[var(--foreground-muted)]">
            Showing <strong className="text-[var(--foreground)]">{userReports.length}</strong> submitted community observations
          </span>

          <div className="space-y-3">
            {userReports.map((rep) => {
              const dateObj = normalizeToDate(rep.submittedAt || rep.createdAt)
              const relativeTime = getRelativeTimeLabel(dateObj)

              return (
                <div
                  key={rep.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-lg space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[var(--primary)]" />
                      <h3 className="font-bold text-[var(--foreground)] text-base">{rep.areaName}</h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[var(--foreground-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{relativeTime}</span>
                      </span>

                      {/* Moderation Status */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          rep.moderationStatus === 'approved'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300'
                        }`}
                      >
                        {rep.moderationStatus === 'approved' ? (
                          <>
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>Approved</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-2.5 w-2.5" />
                            <span>In Verification</span>
                          </>
                        )}
                      </span>

                      {rep.isAnonymous ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 text-[10px] text-teal-600 dark:text-teal-300">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Anonymous</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--foreground-muted)]">Attributed</span>
                      )}
                    </div>
                  </div>

                  {/* Rating, Comfort & Visit Time */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--foreground)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-lg border border-[var(--border)]">
                      <span>Rating:</span>
                      <span className="text-teal-600 dark:text-teal-400">{rep.rating ?? 3}/5</span>
                    </div>

                    <span className="text-[var(--border)]">•</span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--foreground-muted)]">Perception:</span>
                      {rep.comfortLevel === 'yes' || (rep.rating && rep.rating >= 4) ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Generally Comfortable
                        </span>
                      ) : rep.comfortLevel === 'maybe' || rep.rating === 3 ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> Caution Advised
                        </span>
                      ) : (
                        <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" /> Higher Concern
                        </span>
                      )}
                    </div>

                    <span className="text-[var(--border)]">•</span>

                    <span className="text-[var(--foreground-muted)] capitalize">
                      Visit Time: <strong className="text-[var(--foreground)]">{rep.timeContext || rep.visitTime}</strong>
                    </span>
                  </div>

                  {/* Observation Tags */}
                  {(rep.tags || rep.observations) && (rep.tags || rep.observations)!.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(rep.tags || rep.observations)!.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--foreground-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Context Photo if available */}
                  {rep.photoUrl && (
                    <div className="pt-1">
                      <img
                        src={rep.photoUrl}
                        alt="Context observation"
                        className="h-24 w-auto rounded-xl object-cover border border-[var(--border)]"
                      />
                    </div>
                  )}

                  {/* Note */}
                  {rep.note && (
                    <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs text-[var(--foreground-secondary)] border border-[var(--border)] leading-relaxed italic">
                      "{rep.note}"
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No reports submitted yet"
          description="You haven't contributed any safety observations yet. Your anonymous observations help neighbors and travelers understand local conditions."
          action={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="h-4 w-4" />}
              onClick={() => navigate('/report')}
            >
              Contribute Safety Report
            </Button>
          }
        />
      )}
    </div>
  )
}
