import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { BrandLogo } from '@/components/design-system/BrandLogo'
import { Button } from '@/components/design-system/Button'
import { Input } from '@/components/design-system/Input'
import { Card } from '@/components/design-system/Card'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function getFriendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/user-not-found': 'No account exists with this email address.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/network-request-failed': 'Network connection issue. Please check your internet connection.',
      'auth/too-many-requests': 'Too many requests. Please wait a moment before trying again.',
    }
    return map[code] ?? 'Unable to send reset instructions. Please try again.'
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await authService.resetPassword(email.trim())
      setSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(getFriendlyError(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-blob absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[var(--primary)]/10 blur-[120px]" />
        <div className="animate-blob animation-delay-4000 absolute bottom-0 right-0 h-80 w-80 rounded-full bg-slate-500/10 blur-[120px]" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Supplied Official Logo */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center text-center"
        >
          <div className="mb-2 rounded-2xl p-2">
            <BrandLogo size="lg" />
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm"
        >
          <Card variant="navy" className="p-6 border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            {sent ? (
              <div className="text-center py-3 space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-500 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--foreground)] tracking-tight">
                    Reset Link Dispatched
                  </h3>
                  <p className="mt-1.5 text-xs text-[var(--foreground-secondary)] leading-relaxed">
                    We sent password recovery instructions to{' '}
                    <strong className="text-[var(--foreground)]">{email}</strong>. Check your inbox and spam folder.
                  </p>
                </div>
                <div className="pt-2">
                  <Link to="/login">
                    <Button variant="primary" className="w-full">
                      Return to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-5 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/35 text-[var(--primary)]">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
                    Reset Your Password
                  </h2>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                    Enter your email to receive recovery instructions.
                  </p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 flex items-start gap-2 overflow-hidden rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2.5 text-xs text-rose-600 dark:text-rose-300"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500" />
                      <p>{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    id="forgot-email"
                    label="Registered Email Address"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    leftIcon={<Mail className="h-4 w-4" />}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={loading}
                    className="w-full py-2.5"
                  >
                    Send Recovery Link
                  </Button>
                </form>

                <div className="mt-5 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Sign In</span>
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
