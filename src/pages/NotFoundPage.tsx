import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-6 py-12 text-center">
      {/* Ambient background glow */}
      <div className="animate-blob absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      <div className="animate-blob animation-delay-2000 absolute right-1/4 bottom-1/3 h-64 w-64 rounded-full bg-slate-700/20 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass relative z-10 max-w-md rounded-3xl p-8 border border-slate-800 shadow-2xl backdrop-blur-xl"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <span className="inline-block rounded-full bg-slate-800/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          404 Error
        </span>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          Area Out of Bounds
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          The safety awareness page or route you are looking for does not exist or has been relocated.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 active:scale-95 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>

          <button
            onClick={() => navigate('/', { replace: true })}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-400 active:scale-95 transition shadow-lg shadow-teal-500/20"
          >
            <Home className="h-4 w-4" />
            Awareness Map
          </button>
        </div>
      </motion.div>
    </div>
  )
}
