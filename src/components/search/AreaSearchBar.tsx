import { useState, useEffect, useRef } from 'react'
import {
  Search,
  MapPin,
  Store,
  Train,
  Milestone,
  Route,
  X,
  Loader2,
  Building,
} from 'lucide-react'
import {
  geocodingService,
  type AreaSuggestion,
} from '@/services/geocoding.service'
import type { Area } from '@/types/area'
import { useArea } from '@/contexts/AreaContext'
import { cn } from '@/utils/cn'

interface AreaSearchBarProps {
  placeholder?: string
  autoFocus?: boolean
  onAreaResolved?: (area: Area, isNewArea: boolean) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function AreaSearchBar({
  placeholder = 'Search locality, neighborhood, market, station, or chowk…',
  autoFocus = false,
  onAreaResolved,
  className,
  size = 'md',
}: AreaSearchBarProps) {
  const { addOrSelectArea } = useArea()

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [resolving, setResolving] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)


  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search query with min-length guard
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await geocodingService.getAreaSuggestions(trimmed)
        setSuggestions(results)
        setIsOpen(true)
        setSelectedIndex(-1)
      } catch (err) {
        console.warn('[Awarely] Autocomplete search failed:', err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  async function handleSelectSuggestion(suggestion: AreaSuggestion) {
    setResolving(true)
    setIsOpen(false)
    try {
      const resolved = await geocodingService.resolveArea(suggestion)
      addOrSelectArea(resolved.area, resolved.elevationNotice)
      setQuery(resolved.area.name)
      onAreaResolved?.(resolved.area, resolved.isNewArea)
    } catch (err) {
      console.error('[Awarely] Failed to resolve area:', err)
      alert('Unable to resolve this area. Please select another neighborhood.')
    } finally {
      setResolving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  function getBadgeForType(type: AreaSuggestion['areaType'], isRoad: boolean) {
    if (isRoad) {
      return {
        label: 'Road → Area',
        color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        icon: Route,
      }
    }
    switch (type) {
      case 'neighborhood':
        return {
          label: 'Neighborhood',
          color: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
          icon: MapPin,
        }
      case 'market':
        return {
          label: 'Market / Bazaar',
          color: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          icon: Store,
        }
      case 'station':
        return {
          label: 'Station Area',
          color: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
          icon: Train,
        }
      case 'chowk':
        return {
          label: 'Chowk',
          color: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
          icon: Milestone,
        }
      default:
        return {
          label: 'District Area',
          color: 'bg-slate-700/40 text-slate-300 border-slate-600',
          icon: Building,
        }
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Search Input Box */}
      <div
        className={cn(
          'relative flex items-center rounded-2xl border border-[var(--border)] bg-[var(--input-background)] px-3.5 transition duration-150 shadow-md focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]',
          size === 'lg' ? 'h-14 text-base' : size === 'sm' ? 'h-10 text-xs' : 'h-12 text-sm',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-[var(--foreground-muted)] mr-2.5" />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-transparent text-[var(--input-foreground)] placeholder-[var(--input-placeholder)] outline-none"
        />

        {/* Clear or Loading Icon */}
        <div className="flex items-center gap-1.5 ml-2">
          {loading || resolving ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setSuggestions([])
                setIsOpen(false)
              }}
              className="rounded-full p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150 custom-scrollbar">
          {suggestions.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center justify-between">
                <span>Suggested Geographic Areas</span>
                <span className="text-[var(--primary)]">Area-Level Awareness</span>
              </div>

              {suggestions.map((item, index) => {
                const badge = getBadgeForType(item.areaType, item.isRoad)
                const BadgeIcon = badge.icon
                const isSelected = selectedIndex === index

                return (
                  <button
                    key={`${item.placeId}-${index}`}
                    onClick={() => handleSelectSuggestion(item)}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition',
                      isSelected
                        ? 'bg-[var(--surface-muted)] text-[var(--foreground)]'
                        : 'text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
                    )}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)]">
                        <BadgeIcon className="h-3.5 w-3.5 text-[var(--primary)]" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-[var(--foreground)] truncate">
                            {item.mainText}
                          </span>
                        </div>

                        <p className="text-[11px] text-[var(--foreground-muted)] truncate">
                          {item.secondaryText}
                        </p>

                        {/* Road Elevation Helper Message */}
                        {item.isRoad && item.containingAreaHint && (
                          <p className="text-[10px] text-amber-300 font-medium mt-0.5">
                            ↳ Elevated to enclosing area: {item.containingAreaHint}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-[10px] font-bold',
                          badge.color,
                        )}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 space-y-1">
              <p>No area matches found for "{query}".</p>
              <p className="text-[11px] text-slate-400">
                Try searching for a locality, neighborhood, station, market, or chowk.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
