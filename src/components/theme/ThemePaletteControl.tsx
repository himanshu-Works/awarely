import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Palette, Check } from 'lucide-react'
import { useTheme, PALETTES, type PaletteKey } from '@/contexts/ThemeContext'
import { cn } from '@/utils/cn'

interface ThemePaletteControlProps {
  compact?: boolean
  showPalettePicker?: boolean
  className?: string
}

export function ThemePaletteControl({
  compact = false,
  showPalettePicker = true,
  className,
}: ThemePaletteControlProps) {
  const { theme, toggleTheme, palette, setPalette, currentPaletteConfig } = useTheme()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPaletteOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={menuRef} className={cn('relative inline-flex items-center gap-1.5', className)}>
      {/* ── Dedicated Light / Dark Mode Toggle ──────────────────────── */}
      <button
        id="theme-toggle-btn"
        onClick={toggleTheme}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition active:scale-95 shadow-sm',
          theme === 'dark'
            ? 'border-[#1E3550] bg-[#122338] text-amber-300 hover:bg-[#1A324E] hover:border-amber-400/50'
            : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:border-slate-400',
        )}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? (
          <>
            <Sun className="h-3.5 w-3.5 text-amber-400" />
            {!compact && <span className="text-[11px] font-bold">LIGHT</span>}
          </>
        ) : (
          <>
            <Moon className="h-3.5 w-3.5 text-indigo-600" />
            {!compact && <span className="text-[11px] font-bold">DARK</span>}
          </>
        )}
      </button>

      {/* ── Accent Palette Selector ─────────────────────────────────── */}
      {showPalettePicker && (
        <div className="relative">
          <button
            id="palette-picker-btn"
            onClick={() => setPaletteOpen(!paletteOpen)}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:border-[var(--primary)]/50 px-2 py-1 text-xs transition shadow-sm"
            title="Customize accent palette"
            aria-label="Select color palette"
            aria-expanded={paletteOpen}
          >
            <span
              className="h-3 w-3 rounded-full border border-white/30 shrink-0"
              style={{ backgroundColor: currentPaletteConfig.accentColor }}
            />
            {!compact && (
              <Palette className="h-3 w-3 text-[var(--foreground-muted)]" />
            )}
          </button>

          {/* Palette Popover */}
          {paletteOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150 text-[var(--foreground)]">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] border-b border-[var(--border)] pb-1.5 mb-1.5">
                Accent Color Palette
              </div>
              <div className="space-y-1">
                {(Object.keys(PALETTES) as PaletteKey[]).map((key) => {
                  const item = PALETTES[key]
                  const isSelected = palette === key
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setPalette(key)
                        setPaletteOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs text-left transition',
                        isSelected
                          ? 'bg-[var(--surface-muted)] text-[var(--foreground)] font-bold'
                          : 'text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: item.accentColor }}
                        />
                        <span className="text-xs">{item.name}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[var(--primary)]" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
