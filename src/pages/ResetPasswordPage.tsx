import { useState, useEffect, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { BrandLogo } from '@/components/design-system/BrandLogo'
import { Button } from '@/components/design-system/Button'
import { Card } from '@/components/design-system/Card'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const actionCode = searchParams.get('oobCode') || searchParams.get('code') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(Boolean(actionCode))
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!actionCode) {
      setError('Invalid or missing password recovery code. Please request a new link.')
      return
    }

    authService
      .verifyPasswordResetCode(actionCode)
      .then((email) => {
        setAccountEmail(email)
      })
      .catch(() => {
        setError('This recovery link has expired or has already been used.')
      })
      .finally(() => {
        setVerifying(false)
      })
  }, [actionCode])

  async function handleReset(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('New password must be at least 6 characters in length.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.')
      return
    }

    setLoading(true)
    try {
      await authService.confirmPasswordReset(actionCode, password)
      setSuccess(true)
    } catch {
      setError('Unable to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center text-center"
        >
          <div className="mb-2 rounded-2xl p-2">
            <BrandLogo size="lg" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <Card variant="navy" className="p-6 border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            {success ? (
              <div className="text-center py-4 space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-500 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--foreground)] tracking-tight">
                    Password Reset Complete
                  </h3>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                    Your password has been securely updated. You can now log in with your new credentials.
                  </p>
                </div>
                <div className="pt-2">
                  <Link to="/login">
                    <Button variant="primary" className="w-full">
                      Proceed to Sign In
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
                    Set New Password
                  </h2>
                  {accountEmail && (
                    <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                      Updating password for <strong className="text-[var(--foreground)]">{accountEmail}</strong>
                    </p>
                  )}
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

                {!error && !verifying && (
                  <form onSubmit={handleReset} className="space-y-4">
                    <div>
                      <label
                        htmlFor="new-password"
                        className="block text-xs font-semibold text-[var(--foreground)] select-none tracking-tight mb-1.5"
                      >
                        New Password (min 6 characters)
                      </label>
                      <div className="relative">
                        <input
                          id="new-password"
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
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="confirm-new-password"
                        className="block text-xs font-semibold text-[var(--foreground)] select-none tracking-tight mb-1.5"
                      >
                        Confirm New Password
                      </label>
                      <input
                        id="confirm-new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--input-background)] px-3.5 py-2.5 text-sm text-[var(--input-foreground)] placeholder-[var(--input-placeholder)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={loading}
                      className="w-full py-2.5 mt-2"
                    >
                      Update Password
                    </Button>
                  </form>
                )}

                {error && (
                  <div className="pt-2 text-center">
                    <Link to="/forgot-password">
                      <Button variant="secondary" className="w-full">
                        Request New Recovery Link
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
