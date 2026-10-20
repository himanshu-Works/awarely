import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrandLogo } from '@/components/design-system/BrandLogo'

interface SplashScreenProps {
  onComplete: () => void
  durationMs?: number
}

export function SplashScreen({
  onComplete,
  durationMs = 1500,
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Check for prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)')?.matches

    if (prefersReducedMotion) {
      // Dismiss immediately or after tiny delay for accessibility
      const timer = setTimeout(() => {
        setIsVisible(false)
        onComplete()
      }, 200)
      return () => clearTimeout(timer)
    }

    // Normal splash duration: 1.5s (within 1.2–1.8s mandate)
    const exitTimer = setTimeout(() => {
      setIsVisible(false)
    }, durationMs - 300)

    const finishTimer = setTimeout(() => {
      onComplete()
    }, durationMs)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(finishTimer)
    }
  }, [durationMs, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="awarely-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--background)] select-none"
          role="status"
          aria-live="polite"
          aria-label="Loading Awarely"
        >
          {/* Subtle ambient illumination behind logo */}
          <div className="absolute h-80 w-80 rounded-full bg-[var(--primary)]/10 blur-[100px] pointer-events-none" />

          {/* Centered official brand logo with subtle scale & fade */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1], // Custom smooth ease-out
            }}
            className="relative z-10 flex flex-col items-center text-center px-4"
          >
            <BrandLogo size="xl" showTagline />

            {/* Subtle progress indicator */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 140, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.9, ease: 'easeInOut' }}
              className="mt-8 h-1 rounded-full bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-80"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
