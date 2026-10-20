import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, X } from 'lucide-react'

export function MapLegend() {
  const [isOpen, setIsOpen] = useState(false)

  const items = [
    {
      level: 'active',
      title: 'Well-Lit & Active Foot Traffic',
      color: 'bg-teal-400',
      border: 'border-teal-500/40',
      desc: 'Regular pedestrian presence, visible shops/transit, adequate illumination.',
    },
    {
      level: 'mixed',
      title: 'Mixed Community Perception',
      color: 'bg-amber-400',
      border: 'border-amber-500/40',
      desc: 'Varying observations; comfort often depends on time of day or specific perimeter lanes.',
    },
    {
      level: 'quiet',
      title: 'Quiet / Lower Foot Traffic',
      color: 'bg-slate-400',
      border: 'border-slate-400/40',
      desc: 'Lower pedestrian activity or commercial density; stay mindful of surroundings.',
    },
    {
      level: 'unknown',
      title: 'Limited Community Activity Data',
      color: 'bg-slate-600',
      border: 'border-slate-600/40',
      desc: 'Fewer than 3 reports in recent weeks; observations are preliminary.',
    },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition shadow-lg"
        aria-label="Map Legend"
      >
        <Info className="h-3.5 w-3.5 text-teal-400" />
        <span>Legend</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute left-0 top-10 z-30 w-72 rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-white tracking-wide">
                Community Awareness Legend
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.level} className="flex items-start gap-2.5">
                  <div
                    className={`mt-1 h-3 w-3 shrink-0 rounded-full ${item.color} shadow-sm`}
                  />
                  <div>
                    <p className="text-xs font-medium text-slate-200">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 leading-tight">
              Awarely reflects community-perceived comfort, not absolute safety. No area is labelled safe or dangerous.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
