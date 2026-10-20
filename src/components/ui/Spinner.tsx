/** Spinner — animated loading indicator. */

import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)} role="status">
      <motion.div
        className={cn(
          'rounded-full border-teal-400 border-t-transparent',
          sizeMap[size],
        )}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      {label && (
        <p className="text-sm text-[var(--foreground-muted)]">{label}</p>
      )}
      <span className="sr-only">Loading…</span>
    </div>
  )
}

/** Full-screen loading overlay */
export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-[var(--background)]">
      <Spinner size="lg" label={message} />
    </div>
  )
}
