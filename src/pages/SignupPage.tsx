import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, AlertCircle, Chrome, ShieldCheck } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { BrandLogo } from '@/components/design-system/BrandLogo'
import { Button } from '@/components/design-system/Button'
import { Input } from '@/components/design-system/Input'
import { Card } from '@/components/design-system/Card'

export function SignupPage() {
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function clearError() {
    setError(null)
  }

  function getFriendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/email-already-in-use': 'An account is already registered with this email address.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/network-request-failed': 'Network connection issue. Please check your internet connection.',
      'auth/popup-closed-by-user': 'Google sign-up was cancelled before completing.',
    }
    return map[code] ?? 'Account registration could not proceed. Please try again.'
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    clearError()

    if (!displayName.trim()) {
      setError('Please provide your name or preferred contributor alias.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters in length.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.')
      return
    }

    if (!termsAccepted) {
      setError('Please accept the privacy terms to continue.')
      return
    }

    setLoading(true)
    try {
      await authService.registerWithEmail(email, password, displayName.trim())
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(getFriendlyError(code))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignUp() {
    clearError()
    setLoading(true)
    try {
      await authService.signInWithGoogle()
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(getFriendlyError(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Ambient background glow */}
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

        {/* Signup Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm"
        >
          <Card variant="navy" className="p-6 border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)]">
                Create Contributor Account
              </h2>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                Join the privacy-first safety awareness community.
              </p>
            </div>

            {/* Error Message */}
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

            <form onSubmit={handleSignup} className="space-y-3.5">
              <Input
                id="signup-name"
                label="Full Name or Alias"
                type="text"
                placeholder="e.g. Maya Chen"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />

              <Input
                id="signup-email"
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div>
                <label
                  htmlFor="signup-password"
                  className="block text-xs font-semibold text-[var(--foreground)] select-none tracking-tight mb-1.5"
                >
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--input-background)] px-3.5 py-2.5 pr-11 text-sm text-[var(--input-foreground)] placeholder-[var(--input-placeholder)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-confirm-password"
                  className="block text-xs font-semibold text-[var(--foreground)] select-none tracking-tight mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--input-background)] px-3.5 py-2.5 text-sm text-[var(--input-foreground)] placeholder-[var(--input-placeholder)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition"
                />
              </div>

              {/* Consent checkbox */}
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--border)] bg-[var(--surface-muted)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-[11px] text-[var(--foreground-muted)] leading-snug">
                  I accept the{' '}
                  <span className="text-[var(--foreground)] font-medium">Privacy Policy</span>.
                  Awarely uses ephemeral area resolution and never tracks or stores GPS history.
                </span>
              </label>

              <Button
                id="signup-submit-btn"
                type="submit"
                variant="primary"
                isLoading={loading}
                leftIcon={<ShieldCheck className="h-4 w-4" />}
                className="w-full py-2.5 mt-2"
              >
                Create Account
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--foreground-muted)] font-medium">or</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignUp}
              disabled={loading}
              leftIcon={<Chrome className="h-4 w-4 text-[var(--foreground-muted)]" />}
              className="w-full"
            >
              Sign up with Google
            </Button>

            <div className="mt-5 text-center text-xs text-[var(--foreground-muted)]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-[var(--primary)] hover:underline"
              >
                Sign in
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
