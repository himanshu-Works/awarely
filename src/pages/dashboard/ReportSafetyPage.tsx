import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Camera,
  X,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import { useArea } from '@/contexts/AreaContext'
import { Button } from '@/components/design-system/Button'
import { Select } from '@/components/design-system/Select'
import { Card } from '@/components/design-system/Card'
import { feedbackService, type FeedbackSubmissionResult } from '@/services/feedback.service'
import { optimizeImage } from '@/utils/image-optimizer'

const REQUIRED_TAGS = [
  'Poor lighting',
  'Crowded',
  'Isolated',
  'Road blocked',
  'Accident reported',
  'Police presence',
  'Felt uncomfortable',
] as const

const ADDITIONAL_TAGS = [
  'Well-lit',
  'High foot traffic',
  'Businesses open',
  'Felt comfortable',
  'Low foot traffic',
  'Area deserted',
] as const

export function ReportSafetyPage() {
  const navigate = useNavigate()
  const { areas, selectedArea, addUserReport } = useArea()

  // Form State
  const [targetAreaId, setTargetAreaId] = useState<string>(selectedArea?.id || areas[0]?.id || '')
  const [rating, setRating] = useState<number>(3) // 1 to 5 scale
  const [timeContext, setTimeContext] = useState<'day' | 'evening' | 'night'>('evening')
  const [selectedTags, setSelectedTags] = useState<string[]>(['Well-lit'])
  const [note, setNote] = useState<string>('')
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Pipeline UX State
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [progressStep, setProgressStep] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0)
  const [submissionResult, setSubmissionResult] = useState<FeedbackSubmissionResult | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeTargetArea = areas.find((a) => a.id === targetAreaId)

  // Sync targetAreaId if selectedArea changes from outer context
  useEffect(() => {
    if (selectedArea && selectedArea.id !== targetAreaId) {
      setTargetAreaId(selectedArea.id)
    }
  }, [selectedArea])

  // Check rate limit on area change
  useEffect(() => {
    if (!targetAreaId) return
    const check = feedbackService.checkRateLimit(targetAreaId)
    if (!check.allowed && check.waitSeconds) {
      setCooldownSeconds(check.waitSeconds)
    } else {
      setCooldownSeconds(0)
    }
  }, [targetAreaId])

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownSeconds])

  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      if (selectedTags.length >= 6) return
      setSelectedTags([...selectedTags, tag])
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo exceeds the 5MB size limit.')
      return
    }

    setError(null)
    optimizeImage(file).then((optimized) => {
      setPhotoFile(optimized)
      setPhotoPreview(URL.createObjectURL(optimized))
    })
  }

  function handleRemovePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetAreaId) {
      setError('Please select a geographic area.')
      return
    }

    if (selectedTags.length === 0) {
      setError('Please select at least one observation tag.')
      return
    }

    if (note.length > 280) {
      setError('Note exceeds the 280 character limit.')
      return
    }

    setSubmitting(true)
    setError(null)
    setProgressStep('Initiating verification pipeline...')

    try {
      const result = await addUserReport({
        areaId: targetAreaId,
        areaName: activeTargetArea?.name || 'Local Area',
        rating,
        timeContext,
        tags: selectedTags,
        note: note.trim() || undefined,
        photoFile,
        isAnonymous,
      })

      setSubmissionResult(result)
    } catch (err: unknown) {
      console.error('Feedback pipeline error:', err)
      setError(err instanceof Error ? err.message : 'Could not submit report. Please try again.')
    } finally {
      setSubmitting(false)
      setProgressStep('')
    }
  }

  const ratingLabels: Record<number, { label: string; desc: string; color: string }> = {
    1: { label: '1 - Higher Concern', desc: 'Felt uncomfortable, significant issues noted', color: 'border-rose-500 bg-rose-500/10 text-rose-300' },
    2: { label: '2 - Low Comfort', desc: 'Caution strongly advised, minimal activity', color: 'border-orange-500 bg-orange-500/10 text-orange-300' },
    3: { label: '3 - Caution Advised', desc: 'Moderate perception, stay alert', color: 'border-amber-500 bg-amber-500/10 text-amber-300' },
    4: { label: '4 - Generally Comfortable', desc: 'Active environment, good lighting', color: 'border-teal-500 bg-teal-500/10 text-teal-300' },
    5: { label: '5 - Positive & Welcoming', desc: 'High foot traffic, very comfortable', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-300' },
  }

  // ── SUCCESS STATE ────────────────────────────────────────────────────────
  if (submissionResult) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            Observation Submitted to Moderation Pipeline
          </h1>
          <p className="text-sm text-[var(--foreground-secondary)] max-w-lg mx-auto">
            Your observation for <strong className="text-[var(--foreground)]">{activeTargetArea?.name}</strong> has entered the community verification pipeline.
          </p>
        </div>

        {/* Pipeline & Non-dogmatic Integrity Card */}
        <Card variant="navy" className="p-6 border-[var(--border)] bg-[var(--surface)] space-y-4">
          <div className="flex items-start gap-3 text-xs text-[var(--foreground-secondary)]">
            <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-[var(--foreground)] text-sm">Awarely Verification Guarantee</strong>
              <p className="text-[var(--foreground-muted)] leading-relaxed">
                Awarely never treats an individual submission as immediate objective truth. Your contribution has been recorded with status: <span className="text-amber-500 font-semibold uppercase">{submissionResult.moderationStatus}</span>. It is dynamically weighted into aggregated scores to prevent burst bias.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border)] text-xs">
            <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
              <span className="text-[var(--foreground-muted)] block text-[11px]">Area Reports</span>
              <strong className="text-[var(--foreground)] text-base font-bold">
                {submissionResult.recomputedMetrics.reportCount}
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
              <span className="text-[var(--foreground-muted)] block text-[11px]">Recomputed Score</span>
              <strong className="text-teal-600 dark:text-teal-400 text-base font-bold">
                {submissionResult.recomputedMetrics.overallScore}/100
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
              <span className="text-[var(--foreground-muted)] block text-[11px]">Confidence</span>
              <strong className="text-[var(--foreground)] text-base font-bold capitalize">
                {submissionResult.recomputedMetrics.confidence}
              </strong>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
              <span className="text-[var(--foreground-muted)] block text-[11px]">AI Synthesis</span>
              <span className="text-amber-600 dark:text-amber-300 text-xs font-semibold flex items-center gap-1 mt-0.5">
                <Sparkles className="h-3 w-3" /> Cache Cleared
              </span>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setSubmissionResult(null)
              setSelectedTags(['Well-lit'])
              setNote('')
              handleRemovePhoto()
            }}
          >
            Submit Another Report
          </Button>

          <Button
            variant="outline"
            size="md"
            rightIcon={<ArrowRight className="h-4 w-4" />}
            onClick={() => navigate('/my-reports')}
          >
            View My Submitted Reports
          </Button>
        </div>
      </div>
    )
  }

  // ── MAIN FORM ────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
          <MapPin className="h-6 w-6 text-[var(--primary)]" />
          <span>Report Safety Observation</span>
        </h1>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Share your environmental perception of illumination, foot traffic, and overall comfort to keep community awareness updated.
        </p>
      </div>

      {/* Cooldown Warning if active */}
      {cooldownSeconds > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
          <Clock className="h-5 w-5 shrink-0 text-amber-500" />
          <div className="space-y-0.5">
            <strong className="text-amber-800 dark:text-amber-200">Anti-Burst Protection Active</strong>
            <p className="text-amber-700 dark:text-amber-300/90">
              To keep community ratings balanced, please wait{' '}
              <strong className="text-[var(--foreground)]">{cooldownSeconds} seconds</strong> before submitting another report for this area.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-800 dark:text-rose-300 animate-in shake duration-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Card */}
      <Card variant="navy" className="p-6 sm:p-8 space-y-6 border-[var(--border)] shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Area Association (No exact location required) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                1. Monitored Area *
              </label>
              <span className="text-[11px] text-teal-600 dark:text-teal-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Area-level only; no GPS trail
              </span>
            </div>
            <Select
              id="report-target-area"
              value={targetAreaId}
              onChange={(e) => setTargetAreaId(e.target.value)}
              options={areas.map((a) => ({
                value: a.id,
                label: `${a.name} — ${a.city} (${a.reportCount} reports)`,
              }))}
            />
          </div>

          {/* 2. Safety Rating: 1–5 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                2. Safety & Comfort Rating (1–5) *
              </label>
              <span className="text-xs font-bold text-[var(--foreground)]">
                {ratingLabels[rating].label}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const isSelected = rating === lvl
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setRating(lvl)}
                    className={`flex flex-col items-center justify-center py-3.5 px-1 rounded-2xl border font-bold transition-all text-sm ${
                      isSelected
                        ? `${ratingLabels[lvl].color} shadow-lg ring-2 ring-offset-2 ring-offset-[var(--surface)] ring-teal-500`
                        : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <span className="text-lg">{lvl}</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80 mt-0.5">
                      {lvl === 1 ? 'Concern' : lvl === 3 ? 'Caution' : lvl === 5 ? 'Welcoming' : `Level ${lvl}`}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-[var(--foreground-muted)] italic">
              {ratingLabels[rating].desc}
            </p>
          </div>

          {/* 3. Visit Time (Day / Evening / Night) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
              3. Time of Visit *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'day', label: 'Day', sub: '6 AM – 5 PM' },
                { id: 'evening', label: 'Evening', sub: '5 PM – 9 PM' },
                { id: 'night', label: 'Night', sub: '9 PM – 6 AM' },
              ].map((t) => {
                const isSelected = timeContext === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTimeContext(t.id as any)}
                    className={`rounded-2xl border p-3 text-center transition-all ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--foreground)] shadow-md font-bold'
                        : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <div className="text-xs font-bold">{t.label}</div>
                    <div className="text-[10px] text-[var(--foreground-muted)] mt-0.5">{t.sub}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 4. Safety & Context Tags */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                4. Safety & Context Tags *
              </label>
              <span className="text-[11px] text-[var(--foreground-muted)]">
                {selectedTags.length}/6 selected
              </span>
            </div>

            {/* Core Required Tags Section */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                Key Safety Context
              </span>
              <div className="flex flex-wrap gap-2">
                {REQUIRED_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/20 text-amber-800 dark:text-amber-300 shadow-sm'
                          : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Additional Positive & Ambient Tags */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                Activity & Environment
              </span>
              <div className="flex flex-wrap gap-2">
                {ADDITIONAL_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? 'border-teal-500 bg-teal-500/20 text-teal-800 dark:text-teal-300 shadow-sm'
                          : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 5. Optional Short Note */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                5. Short Context Note (Optional)
              </label>
              <span
                className={`text-[11px] ${
                  note.length > 280 ? 'text-rose-500 font-bold' : 'text-[var(--foreground-muted)]'
                }`}
              >
                {note.length}/280
              </span>
            </div>
            <textarea
              id="report-optional-note"
              rows={3}
              maxLength={300}
              placeholder="e.g. Street lamps operational on the east side; active shopfronts until 10 PM."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--input-background)] p-3 text-xs text-[var(--input-foreground)] placeholder-[var(--input-placeholder)] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Please do not include personal names, telephone numbers, or emergency distress calls.
            </p>
          </div>

          {/* 6. Optional Contextual Photo */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
              6. Contextual Photo (Optional)
            </label>

            {photoPreview ? (
              <div className="relative inline-block rounded-2xl overflow-hidden border border-[var(--border)]">
                <img
                  src={photoPreview}
                  alt="Contextual observation preview"
                  className="h-36 w-auto object-cover rounded-2xl"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 rounded-full bg-[var(--surface)] p-1 text-[var(--foreground-muted)] hover:text-rose-500 border border-[var(--border)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)] cursor-pointer transition"
              >
                <Camera className="h-4 w-4 text-[var(--primary)]" />
                <span>Attach an environmental photo (street lighting, road condition, max 5MB)</span>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>

          {/* 7. Anonymous Toggle & Privacy Guarantee */}
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-teal-500" />
                <span>Submit with Privacy-Preserving Pseudonym</span>
              </span>
              <p className="text-[11px] text-[var(--foreground-muted)]">
                Your report will never display your account name, email, or exact coordinates to the public.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-5 w-5 accent-[var(--primary)] rounded cursor-pointer"
            />
          </div>

          {/* Submit Button & Progress State */}
          <div className="space-y-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-sm font-bold"
              isLoading={submitting}
              disabled={submitting || selectedTags.length === 0 || cooldownSeconds > 0}
            >
              {submitting
                ? progressStep || 'Submitting to pipeline...'
                : cooldownSeconds > 0
                ? `Wait ${cooldownSeconds}s (Cooldown)`
                : 'Submit Safety Observation'}
            </Button>

            {submitting && (
              <p className="text-center text-xs text-teal-500 flex items-center justify-center gap-1.5 animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>{progressStep}</span>
              </p>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
