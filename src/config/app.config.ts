/**
 * Application-level constants.
 * These are hardcoded values (not secrets) that govern app behaviour.
 */

export const APP_CONFIG = {
  name: 'Awarely',
  tagline: 'Safety, When It Matters.',
  version: '0.1.0',

  /** Environment */
  isDev: import.meta.env.VITE_APP_ENV === 'development',
  isProd: import.meta.env.VITE_APP_ENV === 'production',

  /** Rate limits (mirrors Cloud Function server-side limits — client uses for UX only) */
  maxReportsPerAreaPerDay: 3,
  maxAlertsPerDay: 3,

  /** Data freshness thresholds */
  freshnessTresholdHours: 48,

  /** Area polygon colour palette — intentionally neutral (no red/green) */
  awarenessColors: {
    active: '#2dd4bf',   // teal-400
    mixed: '#fbbf24',    // amber-400
    quiet: '#94a3b8',    // slate-400
    unknown: '#334155',  // slate-700
  },
} as const

export type AwarenessLevel = 'active' | 'mixed' | 'quiet' | 'unknown'
export type ConfidenceLevel = 'high' | 'moderate' | 'low'
