import { useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  showCloseButton?: boolean
  showHandle?: boolean
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  showHandle = true,
}: BottomSheetProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'pointer-events-auto relative z-10 w-full max-w-2xl mx-auto rounded-t-3xl border-t border-x border-slate-800 bg-slate-900/95 p-6 pb-8 shadow-2xl backdrop-blur-2xl max-h-[85vh] overflow-y-auto no-scrollbar',
              className,
            )}
          >
            {/* Grab Handle */}
            {showHandle && (
              <div className="mx-auto -mt-2 mb-4 h-1.5 w-12 rounded-full bg-slate-700 hover:bg-slate-600 transition" />
            )}

            {showCloseButton && (
              <button
                onClick={onClose}
                className="absolute right-5 top-5 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                aria-label="Close sheet"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
