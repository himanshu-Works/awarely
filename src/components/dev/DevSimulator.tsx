import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wrench,
  X,
  Volume2,
  VolumeX,
  CheckCircle,
  ShieldAlert,
  Terminal,
} from 'lucide-react'
import type { Area } from '@/types/area'
import type { UserRole } from '@/types/user'
import { sirenService } from '@/services/siren.service'
import { SEED_AREAS } from '@/data/seedAreas'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth.service'

interface DevSimulatorProps {
  currentArea: Area | null
  onSelectArea: (area: Area) => void
  onUpdateAreaCondition?: (level: 'active' | 'mixed' | 'quiet') => void
}

export function DevSimulator({
  currentArea,
  onSelectArea,
  onUpdateAreaCondition,
}: DevSimulatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sirenPlaying, setSirenPlaying] = useState(sirenService.isPlaying)
  const { role, refreshProfile, isAdmin, isDev } = useAuth()

  useEffect(() => {
    return sirenService.subscribe((playing) => {
      setSirenPlaying(playing)
    })
  }, [])

  async function toggleSiren() {
    await sirenService.toggle()
  }

  async function handleRoleChange(newRole: UserRole) {
    authService.setMockRole(newRole)
    await refreshProfile()
  }

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Trigger Toggle */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-[#EB5E28]/40 bg-[#122338]/95 px-3.5 py-2 text-xs font-semibold text-[#EB5E28] shadow-xl backdrop-blur-xl hover:bg-[#1A324E] transition"
        >
          <Wrench className="h-3.5 w-3.5 text-[#EB5E28]" />
          <span>Dev & Role Simulator</span>
        </button>
      )}

      {/* Simulator Modal / Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-84 max-h-[85vh] overflow-y-auto no-scrollbar rounded-3xl border border-[#1E3550] bg-[#122338]/98 p-5 shadow-2xl backdrop-blur-2xl text-left"
          >
            <div className="flex items-center justify-between border-b border-[#1E3550] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-[#EB5E28]" />
                <span className="text-xs font-bold text-white tracking-wide">
                  Awarely Test Simulator
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
                aria-label="Close simulator"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Role-Based Access Control (RBAC) Switcher */}
              <div className="rounded-xl bg-[#0B192C] border border-[#1E3550] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Simulate Role (RBAC)
                  </span>
                  <span className="rounded-full bg-[#EB5E28]/15 px-2 py-0.5 text-[10px] font-bold text-[#EB5E28] border border-[#EB5E28]/30 uppercase">
                    Current: {role}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['user', 'admin', 'dev'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={`capitalize rounded-lg py-1.5 font-semibold transition border ${
                        role === r
                          ? 'bg-[#EB5E28] text-white border-[#EB5E28]'
                          : 'bg-[#122338] text-slate-400 border-[#1E3550] hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Privileged Features Display (Guarded) */}
                <div className="mt-2.5 pt-2 border-t border-[#1E3550] text-[11px]">
                  {isAdmin ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Admin Mode: Moderation tools unlocked</span>
                    </div>
                  ) : isDev ? (
                    <div className="flex items-center gap-1.5 text-sky-400 font-medium">
                      <Terminal className="h-3.5 w-3.5" />
                      <span>Dev Mode: Cloud Functions debug active</span>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">
                      Standard User: Privileged features hidden.
                    </span>
                  )}
                </div>
              </div>

              {/* Current Area Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Simulate Area Location
                </label>
                <select
                  value={currentArea?.id || ''}
                  onChange={(e) => {
                    const found = SEED_AREAS.find((a) => a.id === e.target.value)
                    if (found) onSelectArea(found)
                  }}
                  className="w-full rounded-xl border border-[#1E3550] bg-[#0B192C] p-2 text-xs text-white focus:border-[#EB5E28] focus:outline-none"
                >
                  {SEED_AREAS.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name} ({area.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition Override */}
              {onUpdateAreaCondition && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                    Simulate Awareness Condition
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => onUpdateAreaCondition('active')}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-1.5 font-medium text-emerald-300 hover:bg-emerald-500/20"
                    >
                      Active
                    </button>
                    <button
                      onClick={() => onUpdateAreaCondition('mixed')}
                      className="rounded-lg border border-amber-500/40 bg-amber-500/10 py-1.5 font-medium text-amber-300 hover:bg-amber-500/20"
                    >
                      Mixed
                    </button>
                    <button
                      onClick={() => onUpdateAreaCondition('quiet')}
                      className="rounded-lg border border-slate-600 bg-slate-800 py-1.5 font-medium text-slate-300 hover:bg-slate-700"
                    >
                      Quiet
                    </button>
                  </div>
                </div>
              )}

              {/* Audio Alarm Test */}
              <div className="flex items-center justify-between rounded-xl bg-[#0B192C] border border-[#1E3550] p-2.5">
                <span className="text-slate-300">Audio Distress Siren</span>
                <button
                  onClick={toggleSiren}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition ${
                    sirenPlaying
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-[#122338] text-amber-300 hover:bg-slate-700 border border-[#1E3550]'
                  }`}
                >
                  {sirenPlaying ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  <span>{sirenPlaying ? 'Stop' : 'Test'}</span>
                </button>
              </div>

              {/* Privacy Check Verification */}
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-[11px] text-emerald-300 leading-snug">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-200 mb-0.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Privacy Protocol Active</span>
                </div>
                <span>
                  Zero GPS coordinates stored. Area-level ephemeral lookups only.
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
