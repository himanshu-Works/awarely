/**
 * LoginPage — authentication screen for Awarely.
 *
 * Implements the official Awarely Visual Design System:
 * - Uses the supplied official Awarely logo asset exactly
 * - Dark navy foundation (#0B192C) with #122338 surface card
 * - Restrained orange accent (#EB5E28)
 * - Google sign-in, email/password, and guest traveler mode
 */

import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Eye, EyeOff, AlertCircle, Chrome, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth.service'
import { BrandLogo } from '@/components/design-system/BrandLogo'
import { Button } from '@/components/design-system/Button'
import { Input } from '@/components/design-system/Input'
import { Card } from '@/components/design-system/Card'

type AuthMode = 'signin' | 'register'

export function LoginPage() {
  const { user, authLoading } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect already-authenticated users
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  function clearError() {
    setError(null)
  }

  function getFriendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/popup-closed-by-user': 'Sign-in was cancelled.',
      'auth/network-request-failed': 'Network error. Check your connection.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
    }
    return map[code] ?? 'Authentication could not proceed. Please try again.'
  }

  async function handleGoogleSignIn() {
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

  async function handleEmailAuth(e: FormEvent) {
    e.preventDefault()
    clearError()
    setLoading(true)
    try {
      if (mode === 'register') {
        if (!displayName.trim()) {
          setError('Please enter your display name.')
          setLoading(false)
          return
        }
        await authService.registerWithEmail(email, password, displayName.trim())
      } else {
        await authService.signInWithEmail(email, password)
      }
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(getFriendlyError(code))
    } finally {
      setLoading(false)
    }
  }

  async function handleGuestSignIn() {
    clearError()
    setLoading(true)
    try {
      await authService.signInAsGuest()
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setError(getFriendlyError(code))
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) return null

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Subtle ambient lighting */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-blob absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[var(--primary)]/10 blur-[120px]" />
        <div className="animate-blob animation-delay-4000 absolute bottom-0 right-0 h-80 w-80 rounded-full bg-slate-500/10 blur-[120px]" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Supplied Official Logo & Tagline */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center text-center"
        >
          <div className="mb-2 rounded-2xl p-2">
            <BrandLogo size="lg" />
          </div>
        </motion.div>

        {/* Auth Card using Design System */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm"
        >
          <Card variant="navy" className="p-6 border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            {/* Mode Selector Tabs */}
            <div className="mb-6 flex rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] p-1">
              {(['signin', 'register'] as AuthMode[]).map((m) => (
                <button
                  key={m}
                  id={`${m}-tab`}
                  onClick={() => {
                    setMode(m)
                    clearError()
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition select-none ${
                    mode === m
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
                      : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
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

            {/* Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {mode === 'register' && (
                <Input
                  id="display-name-input"
                  label="Display Name"
                  type="text"
                  placeholder="e.g. Alex Traveler"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              )}

              <Input
                id="email-input"
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div>
                <label
                  htmlFor="password-input"
                  className="block text-xs font-semibold text-[var(--foreground)] select-none tracking-tight mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password-input"
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

              <Button
                id="email-auth-btn"
                type="submit"
                variant="primary"
                isLoading={loading}
                leftIcon={<Mail className="h-4 w-4" />}
                className="w-full py-2.5 mt-2"
              >
                {mode === 'signin' ? 'Sign in with Email' : 'Create Account'}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--foreground-muted)] font-medium">or</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            {/* Google sign-in */}
            <Button
              id="google-signin-btn"
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading}
              leftIcon={<Chrome className="h-4 w-4 text-[var(--foreground-muted)]" />}
              className="w-full"
            >
              Continue with Google
            </Button>

            <div className="mt-5 flex items-center justify-between text-xs text-[var(--foreground-muted)]">
              <Link
                to="/forgot-password"
                className="hover:text-[var(--foreground)] transition"
              >
                Forgot password?
              </Link>
              <Link
                to="/signup"
                className="font-semibold text-[var(--primary)] hover:underline"
              >
                Create account
              </Link>
            </div>
          </Card>
        </motion.div>

        {/* Guest Mode Option */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          id="guest-btn"
          onClick={handleGuestSignIn}
          disabled={loading}
          className="mt-6 text-xs font-medium text-[var(--foreground-muted)] underline-offset-4 hover:text-[var(--primary)] hover:underline disabled:opacity-50 transition"
        >
          Continue as Guest Traveler (Direct Access)
        </motion.button>

        {/* Privacy Assurance */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex items-center gap-2 text-[11px] text-[var(--foreground-muted)] text-center max-w-xs"
        >
          <Lock className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
          <span>
            Privacy-first: Awarely never tracks or retains user coordinates.
          </span>
        </motion.div>
      </div>
    </div>
  )
}
