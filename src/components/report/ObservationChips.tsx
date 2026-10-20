import { OBSERVATION_TAGS, type ObservationTag } from '@/types/report'
import { cn } from '@/utils/cn'

interface ObservationChipsProps {
  selected: ObservationTag[]
  onChange: (tags: ObservationTag[]) => void
  maxSelect?: number
}

export function ObservationChips({
  selected,
  onChange,
  maxSelect = 4,
}: ObservationChipsProps) {
  function toggleTag(tag: ObservationTag) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag))
    } else {
      if (selected.length < maxSelect) {
        onChange([...selected, tag])
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Select observations ({selected.length}/{maxSelect})</span>
        {selected.length >= maxSelect && (
          <span className="text-amber-400">Max limit reached</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {OBSERVATION_TAGS.map((tag) => {
          const isSelected = selected.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-medium transition active:scale-95 text-left border',
                isSelected
                  ? 'border-teal-500 bg-teal-500/20 text-teal-300 shadow-sm'
                  : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:border-slate-700 hover:text-slate-200',
              )}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
