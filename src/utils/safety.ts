/**
 * Standardized safety language, types, and presentation helpers.
 *
 * Strict non-fearmongering terminology:
 * - "Higher concern"
 * - "Caution"
 * - "Generally positive community feedback"
 * - "Limited community data"
 *
 * Confidence terminology:
 * - "High confidence"
 * - "Moderate confidence"
 * - "Low confidence"
 *
 * Freshness terminology:
 * - "Fresh (updated < 2h ago)"
 * - "Recent (updated < 24h ago)"
 * - "Aging (> 24h ago)"
 * - "Limited community data"
 *
 * Rules:
 * - NEVER say "This area is completely safe" or "Danger zone".
 * - Clearly distinguish between Safety State, Confidence, and Data Freshness.
 */

import type { Area } from '@/types/area'

export type SafetyStateKey =
  | 'generally-positive'
  | 'caution'
  | 'higher-concern'
  | 'limited-data'

export type ConfidenceKey = 'high' | 'moderate' | 'low'

export interface SafetyStateConfig {
  key: SafetyStateKey
  label: string
  description: string
  badgeClass: string
  dotClass: string
  borderClass: string
  iconName: 'check-circle' | 'alert-triangle' | 'alert-circle' | 'help-circle'
}

export interface ConfidenceConfig {
  key: ConfidenceKey
  label: string
  description: string
  badgeClass: string
  fillCount: number // out of 3 bars
}

export interface FreshnessConfig {
  label: string
  badgeClass: string
  isFresh: boolean
  relativeTime: string
}

/**
 * Derives the canonical safety state for an area based on awareness level,
 * report count, and day/night split metrics.
 */
export function getAreaSafetyState(area: Area | null | undefined): SafetyStateConfig {
  if (!area || (area.reportCount ?? 0) === 0 || area.awarenessLevel === 'unknown') {
    return {
      key: 'limited-data',
      label: 'Limited community data',
      description: 'Few recent observations recorded. Community input is welcomed.',
      badgeClass: 'bg-slate-700/40 text-slate-300 border-slate-600/50',
      dotClass: 'bg-slate-400',
      borderClass: 'border-slate-700',
      iconName: 'help-circle',
    }
  }

  // If awareness level is quiet or day/night comfort is lower, evaluate concern/caution
  const nightComfort = area.dayNightSplit?.night ?? 80
  const isHighConcern = (area.awarenessLevel as string) === 'concern' || nightComfort < 65

  if (isHighConcern) {
    return {
      key: 'higher-concern',
      label: 'Higher concern',
      description: 'Multiple recent community notes advise attentiveness or poor lighting.',
      badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
      dotClass: 'bg-rose-400',
      borderClass: 'border-rose-500/40',
      iconName: 'alert-circle',
    }
  }

  if (area.awarenessLevel === 'mixed' || nightComfort < 80) {
    return {
      key: 'caution',
      label: 'Caution',
      description: 'Variable observations reported; stay mindful of surroundings at night.',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      dotClass: 'bg-amber-400',
      borderClass: 'border-amber-500/40',
      iconName: 'alert-triangle',
    }
  }

  return {
    key: 'generally-positive',
    label: 'Generally positive community feedback',
    description: 'Contributors report well-lit pathways and regular foot traffic.',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    dotClass: 'bg-emerald-400',
    borderClass: 'border-emerald-500/40',
    iconName: 'check-circle',
  }
}

/**
 * Returns canonical confidence configuration.
 */
export function getConfidenceConfig(level: string | null | undefined): ConfidenceConfig {
  switch (level) {
    case 'high':
      return {
        key: 'high',
        label: 'High confidence',
        description: 'Robust community participation with frequent corroborating reports.',
        badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/40',
        fillCount: 3,
      }
    case 'moderate':
      return {
        key: 'moderate',
        label: 'Moderate confidence',
        description: 'Moderate volume of community observations within the last 14 days.',
        badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
        fillCount: 2,
      }
    case 'low':
    default:
      return {
        key: 'low',
        label: 'Low confidence',
        description: 'Preliminary or limited observations; treat context with extra prudence.',
        badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        fillCount: 1,
      }
  }
}

/**
 * Evaluates data freshness into a distinct structured presentation.
 */
export function getFreshnessConfig(date: Date | null | undefined): FreshnessConfig {
  if (!date) {
    return {
      label: 'No recent data',
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
      isFresh: false,
      relativeTime: 'No recent observations',
    }
  }

  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffHours = diffMs / 3_600_000

  if (diffHours < 2) {
    const mins = Math.max(1, Math.floor(diffMs / 60_000))
    return {
      label: 'Fresh (< 2h)',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      isFresh: true,
      relativeTime: `Updated ${mins} min ago`,
    }
  }

  if (diffHours < 24) {
    const hrs = Math.floor(diffHours)
    return {
      label: 'Recent (< 24h)',
      badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      isFresh: true,
      relativeTime: `Updated ${hrs}h ago`,
    }
  }

  const days = Math.floor(diffHours / 24)
  return {
    label: 'Aging (> 24h)',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    isFresh: false,
    relativeTime: `Updated ${days}d ago`,
  }
}
