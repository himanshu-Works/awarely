/** OnboardingPage — user's first-run setup screen (placeholder). */

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, ArrowRight } from 'lucide-react'

export function OnboardingPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm text-center"
      >
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/20">
            <Shield className="h-8 w-8 text-teal-400" />
          </div>
        </div>
        <h1 className="mb-3 text-2xl font-bold text-white">Welcome to Awarely</h1>
        <p className="mb-8 text-sm text-slate-400">
          A privacy-first community awareness platform. Onboarding coming soon.
        </p>
        <button
          id="continue-btn"
          onClick={() => navigate('/', { replace: true })}
          className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-8 py-3
            text-sm font-semibold text-white transition hover:bg-teal-400 active:scale-95"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>
    </div>
  )
}
