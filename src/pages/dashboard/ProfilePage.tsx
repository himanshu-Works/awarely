import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  LogOut,
  Edit2,
  Check,
  CheckCircle2,
  Sun,
  Moon,
  Palette,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useArea } from '@/contexts/AreaContext'
import { useTheme, PALETTES, type PaletteKey } from '@/contexts/ThemeContext'
import { authService } from '@/services/auth.service'
import { Button } from '@/components/design-system/Button'
import { Input } from '@/components/design-system/Input'
import { Card } from '@/components/design-system/Card'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, userProfile, role, isGuest } = useAuth()
  const { userReports } = useArea()

  const [alias, setAlias] = useState(userProfile?.displayName || user?.displayName || 'Awarely Contributor')
  const [editing, setEditing] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  function handleSaveAlias() {
    setEditing(false)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
  }

  async function handleSignOut() {
    await authService.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
          <User className="h-6 w-6 text-[var(--primary)]" />
          <span>User Profile</span>
        </h1>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Manage your account credentials, contributor alias, and role authorizations.
        </p>
      </div>

      {/* ── Profile Identity Card ────────────────────────────────────── */}
      <Card variant="navy" className="p-6 sm:p-8 space-y-6 border-[var(--border)] bg-[var(--surface)] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)] text-2xl font-bold">
              {(alias || 'A')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-[var(--foreground)]">{alias}</h2>
                {role === 'admin' ? (
                  <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                    Administrator
                  </span>
                ) : role === 'dev' ? (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    Developer
                  </span>
                ) : isGuest ? (
                  <span className="rounded-full bg-[var(--surface-muted)] border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground-secondary)]">
                    Guest Mode
                  </span>
                ) : (
                  <span className="rounded-full bg-teal-500/20 border border-teal-500/40 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:text-teal-300">
                    Community Member
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">
                {user?.email || 'Anonymous Guest Session'}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            leftIcon={<LogOut className="h-4 w-4 text-rose-500 dark:text-rose-400" />}
          >
            Sign Out
          </Button>
        </div>

        {/* Alias Edit */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
            Preferred Public Alias
          </label>
          <div className="flex items-center gap-3">
            <Input
              id="user-alias-input"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              disabled={!editing}
              className="max-w-md"
            />
            {editing ? (
              <Button variant="primary" size="sm" onClick={handleSaveAlias} leftIcon={<Check className="h-3.5 w-3.5" />}>
                Save
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)} leftIcon={<Edit2 className="h-3.5 w-3.5" />}>
                Edit
              </Button>
            )}
          </div>
          {savedNotice && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Alias updated successfully.
            </p>
          )}
        </div>

        {/* Contributor Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <span className="text-xs text-[var(--foreground-muted)]">Reports Submitted</span>
            <div className="text-2xl font-bold text-[var(--foreground)] mt-1">
              {userReports.length}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <span className="text-xs text-[var(--foreground-muted)]">Account Standing</span>
            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">
              Good
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <span className="text-xs text-[var(--foreground-muted)]">Privacy Mode</span>
            <div className="text-2xl font-bold text-[var(--foreground-secondary)] mt-1">
              Anonymous
            </div>
          </div>
        </div>
      </Card>

      {/* ── Theme & Accent Palette Settings Card ──────────────────────── */}
      <ThemeCustomizationCard />
    </div>
  )
}

function ThemeCustomizationCard() {
  const { theme, setTheme, palette, setPalette, currentPaletteConfig } = useTheme()

  return (
    <Card variant="navy" className="p-6 sm:p-8 space-y-6 border-[var(--border)] bg-[var(--surface)] shadow-xl">
      <div className="border-b border-[var(--border)] pb-4">
        <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
          <Palette className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          <span>Appearance & Color Palette</span>
        </h3>
        <p className="text-xs text-[var(--foreground-muted)] mt-1">
          Customize UI contrast mode and accent highlights. Official Awarely logo is preserved across all themes.
        </p>
      </div>

      {/* Light / Dark Mode Toggle */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
          Display Theme Mode
        </span>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-2.5 rounded-2xl border p-3 text-xs font-bold transition shadow-sm ${
              theme === 'light'
                ? 'border-[var(--primary)] bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-md ring-2 ring-[var(--primary)]/40 font-extrabold'
                : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)]'
            }`}
          >
            <Sun className="h-4 w-4 text-amber-500" />
            <span>LIGHT MODE</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-2.5 rounded-2xl border p-3 text-xs font-bold transition shadow-sm ${
              theme === 'dark'
                ? 'border-[var(--primary)] bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-md ring-2 ring-[var(--primary)]/40 font-extrabold'
                : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)]'
            }`}
          >
            <Moon className="h-4 w-4 text-indigo-400" />
            <span>DARK MODE</span>
          </button>
        </div>
      </div>

      {/* Accent Palette Selection */}
      <div className="space-y-3 pt-2 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
            UI Accent Color Palette
          </span>
          <span className="text-xs text-[var(--foreground-muted)]">
            Active: <strong className="text-[var(--foreground)]">{currentPaletteConfig.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.keys(PALETTES) as PaletteKey[]).map((key) => {
            const item = PALETTES[key]
            const isSelected = palette === key

            return (
              <button
                key={key}
                type="button"
                onClick={() => setPalette(key)}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition ${
                  isSelected
                    ? 'border-[var(--primary)] bg-[var(--surface-elevated)] text-[var(--foreground)] ring-2 shadow-lg ring-[var(--primary)]/40'
                    : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
                }`}
                style={isSelected ? { outlineColor: item.accentColor } : {}}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-5 w-5 rounded-full border border-black/10 dark:border-white/20 shrink-0 shadow-sm"
                    style={{ backgroundColor: item.accentColor }}
                  />
                  <div>
                    <div className="font-bold text-xs text-[var(--foreground)]">{item.name}</div>
                    <div className="text-[10px] text-[var(--foreground-muted)] font-mono mt-0.5">
                      {item.accentColor}
                    </div>
                  </div>
                </div>

                {isSelected && <Check className="h-4 w-4 text-[var(--primary)] shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
