import { useState, useRef, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  Camera,
  X,
  Sparkles,
  Info,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { Area } from '@/types/area'
import { useArea } from '@/contexts/AreaContext'
import { feedbackService } from '@/services/feedback.service'
import { Spinner } from '@/components/ui/Spinner'
import { optimizeImage } from '@/utils/image-optimizer'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  area: Area | null
  onReportSubmitted?: () => void
}

const CORE_TAGS = [
  'Poor lighting',
  'Crowded',
  'Isolated',
  'Road blocked',
  'Accident reported',
  'Police presence',
  'Felt uncomfortable',
] as const

const AMBIENT_TAGS = [
  'Well-lit',
  'High foot traffic',
  'Businesses open',
  'Felt comfortable',
  'Low foot traffic',
] as const

export function FeedbackModal({
  isOpen,
  onClose,
  area,
  onReportSubmitted,
}: FeedbackModalProps) {
  const { addUserReport } = useArea()

  const [rating, setRating] = useState<number>(3) // 1-5 scale
  const [timeContext, setTimeContext] = useState<'day' | 'evening' | 'night'>('evening')
  const [selectedTags, setSelectedTags] = useState<string[]>(['Well-lit'])
  const [note, setNote] = useState<string>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!area) return null

  function resetForm() {
    setRating(3)
    setTimeContext('evening')
    setSelectedTags(['Well-lit'])
    setNote('')
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    setError(null)
    setSubmitted(false)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

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
      setError('Please upload a valid image file (JPEG, PNG, WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo exceeds 5MB size limit.')
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!area) return

    if (selectedTags.length === 0) {
      setError('Please select at least one safety observation tag.')
      return
    }

    if (note.length > 280) {
      setError('Note exceeds the 280 character limit.')
      return
    }

    // Rate limit check
    const rateCheck = feedbackService.checkRateLimit(area.id)
    if (!rateCheck.allowed) {
      setError(rateCheck.reason || 'Please wait before reporting again for this area.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await addUserReport({
        areaId: area.id,
        areaName: area.name,
        rating,
        timeContext,
        tags: selectedTags,
        note: note.trim() || undefined,
        photoFile,
        isAnonymous: true,
      })

      setSubmitted(true)
      onReportSubmitted?.()
      setTimeout(() => {
        handleClose()
      }, 2600)
    } catch (err: unknown) {
      console.warn('[Awarely] Report submission pipeline error:', err)
      setError(err instanceof Error ? err.message : 'Could not submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={submitted ? undefined : 'Report Safety Observation'}
      description={
        submitted
          ? undefined
          : `Share environmental perception for ${area.name} (${area.city})`
      }
    >
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-6 text-center space-y-3"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Observation in Moderation Pipeline</h3>
            <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
              Thank you! Awarely treats reports as community signals, not immediate objective truth. Your observation has been queued with status <span className="text-amber-400 font-semibold">Pending</span> and area safety scores have been recalculated.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-teal-400 font-medium pt-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI summary cache invalidated for fresh synthesis</span>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Privacy notice banner */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-3 py-2 text-[11px] text-slate-400 border border-slate-700/50">
              <Lock className="h-3.5 w-3.5 text-teal-400 shrink-0" />
              <span>Coarse area-level context only. No GPS trail or identity stored.</span>
            </div>

            {/* 1. Safety Rating: 1–5 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  1. Safety & Comfort Rating (1–5) *
                </label>
                <span className="text-[11px] font-semibold text-slate-400">
                  {rating === 1
                    ? 'Higher Concern'
                    : rating === 3
                    ? 'Caution Advised'
                    : rating === 5
                    ? 'Positive & Welcoming'
                    : `Rating ${rating}/5`}
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
                      className={`py-2 rounded-xl border font-bold text-xs transition-all ${
                        isSelected
                          ? lvl <= 2
                            ? 'border-rose-500 bg-rose-500/20 text-rose-300 shadow-sm'
                            : lvl === 3
                            ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-sm'
                            : 'border-teal-500 bg-teal-500/20 text-teal-300 shadow-sm'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {lvl}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Visit Time: Day, Evening, Night */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                2. Visit Time *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'day', label: 'Day (6am–5pm)' },
                  { id: 'evening', label: 'Evening (5pm–9pm)' },
                  { id: 'night', label: 'Night (9pm+)' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTimeContext(t.id as any)}
                    className={`rounded-xl border py-2 text-xs font-semibold transition ${
                      timeContext === t.id
                        ? 'border-[#EB5E28] bg-[#EB5E28]/15 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Safety & Context Tags */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  3. Safety Context Tags *
                </label>
                <span className="text-[10px] text-slate-400">
                  {selectedTags.length}/6 selected
                </span>
              </div>

              {/* Core tags */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CORE_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-medium'
                          : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>

              {/* Ambient tags */}
              <div className="flex flex-wrap gap-1.5">
                {AMBIENT_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                        isSelected
                          ? 'border-teal-500 bg-teal-500/20 text-teal-300 font-medium'
                          : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 4. Optional Note with character count */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">
                  4. Short Note (Optional)
                </label>
                <span className="text-[10px] text-slate-400">
                  {note.length}/280
                </span>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                placeholder="e.g. Streetlights active, police vehicle stationed nearby."
                rows={2}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              />
            </div>

            {/* 5. Optional Contextual Photo */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                5. Contextual Photo (Optional)
              </label>
              {photoPreview ? (
                <div className="relative inline-block rounded-xl overflow-hidden border border-slate-700">
                  <img
                    src={photoPreview}
                    alt="Contextual preview"
                    className="h-24 w-auto object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-1 right-1 rounded-full bg-slate-900/80 p-1 text-slate-300 hover:text-rose-400 border border-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-400 hover:border-slate-500 cursor-pointer transition"
                >
                  <Camera className="h-4 w-4 text-[#EB5E28]" />
                  <span>Attach environmental photo (lighting, road state)</span>
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

            {/* Pipeline Notice */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2.5 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Report enters community moderation with status <strong className="text-white">Pending</strong>. Safety scores are calculated server-side.
              </span>
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl border border-slate-800 py-2.5 text-xs font-medium text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || selectedTags.length === 0}
                className="flex-1 rounded-xl bg-[#EB5E28] hover:bg-[#d45222] py-2.5 text-xs font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Submit Report</span>
                )}
              </button>
            </div>
          </form>
        )}
      </AnimatePresence>
    </Modal>
  )
}
