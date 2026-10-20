/**
 * Awarely Safety Scoring Engine
 *
 * PROTOTYPE METHODOLOGY DISCLAIMER:
 * This engine implements a prototype aggregation methodology for community-perceived
 * safety and environmental observations (lighting, presence of foot traffic, physical comfort).
 *
 * IT IS NOT A SCIENTIFICALLY VALIDATED CRIME PREDICTION MODEL.
 * IT DOES NOT MEASURE ACTUAL CRIME RATES, OBJECTIVE DANGER, OR STATISTICAL PROBABILITY OF INCIDENTS.
 * Never describe the result as an objective measure of crime or actual safety.
 *
 * Key Architectural Pillars:
 * 1. Base Score Normalization: Converts discrete 1–5 perception into continuous 0–100 scale.
 * 2. Time Context Separation: Disaggregates perceptions into Day, Evening, and Night.
 * 3. Configurable Exponential Recency Decay: Faster decay for incident-like observations vs general perception.
 * 4. Volume Shrinkage (Empirical Bayes): A single report can never dominate an area; pulls to neutral prior.
 * 5. Consistency & Uncertainty: Disagreement penalizes confidence without discarding minority observations.
 * 6. Explicit Insufficient Data Separation: Never assigns a definitive safety state without sufficient evidence.
 */

import type { Report } from '@/types/report'
import { getReportTimestampMs } from './date'

// ── CONFIGURATION SCHEMA ──────────────────────────────────────────────────

export interface ScoringConfig {
  /** Neutral prior shrinkage parameters */
  neutralPrior: {
    mean: number // Neutral midpoint (default 50.0)
    weight: number // Equivalent pseudo-observation weight (default 3.0)
  }

  /** Recency half-life parameters in hours */
  recency: {
    generalHalfLifeHours: number // e.g. 720h (30 days) for general lighting & foot traffic
    incidentHalfLifeHours: number // e.g. 72h (3 days) for temporary disruptions/incidents
    incidentTags: string[] // Tags that trigger incident-rate decay
  }

  /** Minimum thresholds to classify sufficient evidence */
  evidence: {
    minReports: number // Minimum report count to assign a state (default 2)
    minEffectiveWeight: number // Minimum cumulative recency weight (default 1.5)
  }

  /** Confidence classification thresholds */
  confidence: {
    targetEffectiveVolume: number // Volume needed for full volume score component (default 12.0)
    maxStandardDeviation: number // Maximum expected dispersion for 0–100 scale (default 50.0)
    thresholds: {
      medium: number // Cutoff for medium confidence (default 0.35)
      high: number // Cutoff for high confidence (default 0.70)
    }
  }

  /** Safety state score thresholds (prototype only; NOT scientific standards) */
  safetyStates: {
    higherConcernMax: number // 0 to < 40
    cautionMax: number // 40 to < 70
    positiveMin: number // 70 to 100
  }

  /** Overall time context blending weights */
  timeContextWeights: {
    day: number // default 0.35
    evening: number // default 0.35
    night: number // default 0.30
  }
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  neutralPrior: {
    mean: 50.0,
    weight: 3.0,
  },
  recency: {
    generalHalfLifeHours: 720, // 30 days
    incidentHalfLifeHours: 72, // 3 days
    incidentTags: [
      'Road blocked',
      'Accident reported',
      'Accident or disturbance',
      'Police presence',
      'Felt uncomfortable',
      'Isolated',
    ],
  },
  evidence: {
    minReports: 2,
    minEffectiveWeight: 1.5,
  },
  confidence: {
    targetEffectiveVolume: 12.0,
    maxStandardDeviation: 50.0,
    thresholds: {
      medium: 0.35,
      high: 0.70,
    },
  },
  safetyStates: {
    higherConcernMax: 40.0,
    cautionMax: 70.0,
    positiveMin: 70.0,
  },
  timeContextWeights: {
    day: 0.35,
    evening: 0.35,
    night: 0.30,
  },
}

// ── TYPES & INTERFACES ────────────────────────────────────────────────────

export type ConfidenceLevel = 'low' | 'medium' | 'high'

export type SafetyState =
  | 'higher-concern'
  | 'caution'
  | 'generally-positive'
  | 'insufficient-data'

export interface ProcessedReportMetric {
  id: string
  normalizedScore: number
  ageHours: number
  recencyWeight: number
  credibilityWeight: number
  effectiveWeight: number
  isIncident: boolean
  timeContext: 'day' | 'evening' | 'night'
}

export interface ContextScoreResult {
  rawMean: number | null
  shrunkScore: number | null
  effectiveVolume: number
  reportCount: number
  variance: number
  stdDev: number
  confidence: ConfidenceLevel
  confidenceScore: number
  state: SafetyState
  stateLabel: string
}

export interface AreaScoreResult {
  overallScore: number | null
  reportCount: number
  effectiveVolume: number
  timeScores: {
    day: number
    evening: number
    night: number
  }
  confidence: ConfidenceLevel
  confidenceScore: number
  safetyState: SafetyState
  safetyStateLabel: string
  consistencyScore: number // 0 to 1 (1 = complete consensus)
  uncertaintyScore: number // standard deviation of perceptions
  hasSufficientData: boolean
  disclaimer: string
}

// ── MATHEMATICAL ENGINE FUNCTIONS ─────────────────────────────────────────

/**
 * 1. Base Score Normalization
 * Converts discrete 1–5 perception rating into continuous 0–100 scale:
 * normalizedScore = ((rating - 1) / 4) * 100
 */
export function normalizeRating(rating: number): number {
  const clamped = Math.max(1, Math.min(5, rating))
  return Math.round(((clamped - 1) / 4) * 100 * 100) / 100 // 2 decimal precision
}

/**
 * 2. Recency & Exponential Decay Weighting
 * Formula: recencyWeight = exp(-ageHours / halfLifeHours)
 *
 * Uses faster decay for transient incident-like reports vs ambient general perception.
 */
export function calculateRecencyWeight(
  ageHours: number,
  isIncident: boolean,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): number {
  const safeAge = Math.max(0, ageHours)
  const halfLife = isIncident
    ? config.recency.incidentHalfLifeHours
    : config.recency.generalHalfLifeHours

  // recencyWeight = exp(-ageHours / halfLifeHours)
  const weight = Math.exp(-safeAge / halfLife)
  return Math.max(0.0001, Math.min(1.0, weight))
}

/**
 * Determines whether a report contains incident-related tags requiring rapid decay.
 */
export function isIncidentReport(
  tags: string[] = [],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): boolean {
  return tags.some((t) => config.recency.incidentTags.includes(t))
}

/**
 * Maps a report to its canonical time context slot: 'day' | 'evening' | 'night'
 */
export function resolveReportTimeContext(report: {
  timeContext?: string
  visitTime?: string
}): 'day' | 'evening' | 'night' {
  const ctx = (report.timeContext || report.visitTime || '').toLowerCase()
  if (ctx === 'night') return 'night'
  if (ctx === 'evening') return 'evening'
  // 'morning', 'afternoon', 'day', or fallback map to 'day'
  return 'day'
}

/**
 * Computes weighted mean and weighted sample variance for a collection of weighted observations.
 */
export function calculateWeightedStats(items: { score: number; weight: number }[]): {
  mean: number
  variance: number
  stdDev: number
  sumWeights: number
} {
  const sumWeights = items.reduce((acc, curr) => acc + curr.weight, 0)
  if (sumWeights <= 0 || items.length === 0) {
    return { mean: 50.0, variance: 0, stdDev: 0, sumWeights: 0 }
  }

  // Weighted sample mean
  const weightedSum = items.reduce((acc, curr) => acc + curr.score * curr.weight, 0)
  const mean = weightedSum / sumWeights

  // Weighted sample variance
  if (items.length <= 1) {
    return { mean, variance: 0, stdDev: 0, sumWeights }
  }

  const weightedSumSqDiff = items.reduce(
    (acc, curr) => acc + curr.weight * Math.pow(curr.score - mean, 2),
    0,
  )
  const variance = weightedSumSqDiff / sumWeights
  const stdDev = Math.sqrt(variance)

  return { mean, variance, stdDev, sumWeights }
}

/**
 * 3. Volume Shrinkage (Empirical Bayes with Neutral Prior)
 * Formula: shrunkScore = (W0 * M0 + sum(wi * si)) / (W0 + sum(wi))
 *
 * Ensures that a single report or tiny sample never dominates the area's perception.
 */
export function computeShrunkScore(
  items: { score: number; weight: number }[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): number {
  const { mean: priorMean, weight: priorWeight } = config.neutralPrior
  const sumWeights = items.reduce((acc, curr) => acc + curr.weight, 0)

  if (sumWeights === 0) {
    return priorMean
  }

  const weightedSum = items.reduce((acc, curr) => acc + curr.score * curr.weight, 0)
  const shrunk = (priorWeight * priorMean + weightedSum) / (priorWeight + sumWeights)
  return Math.round(shrunk * 10) / 10
}

/**
 * 4. Confidence & Uncertainty Computation
 * Confidence is a composite function of:
 * - Volume factor: min(1.0, effectiveVolume / targetEffectiveVolume)
 * - Recency factor: average recency weight of contributing reports
 * - Consistency factor: 1 - (stdDev / maxStandardDeviation)
 *
 * If reports strongly disagree, consistency factor drops, decreasing overall confidence.
 */
export function calculateConfidence(
  items: { score: number; weight: number; recencyWeight: number }[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): {
  level: ConfidenceLevel
  confidenceScore: number
  stdDev: number
  consistencyFactor: number
  effectiveVolume: number
} {
  if (items.length < config.evidence.minReports) {
    return {
      level: 'low',
      confidenceScore: 0.1,
      stdDev: 0,
      consistencyFactor: 1.0,
      effectiveVolume: 0,
    }
  }

  const stats = calculateWeightedStats(items)
  const effectiveVolume = stats.sumWeights

  // 1. Volume Factor (0 to 1)
  const volumeFactor = Math.min(1.0, effectiveVolume / config.confidence.targetEffectiveVolume)

  // 2. Recency Factor (0 to 1)
  const totalRecencyWeight = items.reduce((acc, curr) => acc + curr.recencyWeight, 0)
  const recencyFactor = totalRecencyWeight / items.length

  // 3. Consistency Factor (0 to 1): penalizes high variance without discarding minority reports
  const normalizedStdDev = Math.min(stats.stdDev, config.confidence.maxStandardDeviation)
  const consistencyFactor = Math.max(0, 1.0 - normalizedStdDev / config.confidence.maxStandardDeviation)

  // Composite Confidence Index (0 to 1)
  // Weighted: 50% volume coverage, 25% recency, 25% consensus consistency
  const composite = volumeFactor * (0.5 + 0.25 * recencyFactor + 0.25 * consistencyFactor)
  const confidenceScore = Math.max(0, Math.min(1.0, composite))

  let level: ConfidenceLevel = 'low'
  if (confidenceScore >= config.confidence.thresholds.high && items.length >= 5) {
    level = 'high'
  } else if (confidenceScore >= config.confidence.thresholds.medium && items.length >= config.evidence.minReports) {
    level = 'medium'
  }

  return {
    level,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    stdDev: Math.round(stats.stdDev * 10) / 10,
    consistencyFactor: Math.round(consistencyFactor * 100) / 100,
    effectiveVolume: Math.round(effectiveVolume * 100) / 100,
  }
}

/**
 * 5. Safety State Classification with Insufficient Data Separation
 * Categorizes an area into:
 * - 'insufficient-data': When evidence volume or effective weight is below threshold.
 * - 'higher-concern': 0 to < 40
 * - 'caution': 40 to < 70
 * - 'generally-positive': 70 to 100
 */
export function classifySafetyState(
  score: number | null,
  reportCount: number,
  effectiveWeight: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): { state: SafetyState; label: string; isInsufficient: boolean } {
  // Strict Insufficient Data separation: Never assign a state without evidence
  if (
    score === null ||
    reportCount < config.evidence.minReports ||
    effectiveWeight < config.evidence.minEffectiveWeight
  ) {
    return {
      state: 'insufficient-data',
      label: 'Limited community data',
      isInsufficient: true,
    }
  }

  if (score < config.safetyStates.higherConcernMax) {
    return {
      state: 'higher-concern',
      label: 'Higher concern',
      isInsufficient: false,
    }
  }

  if (score < config.safetyStates.cautionMax) {
    return {
      state: 'caution',
      label: 'Caution',
      isInsufficient: false,
    }
  }

  return {
    state: 'generally-positive',
    label: 'Generally positive community feedback',
    isInsufficient: false,
  }
}

// ── FULL AREA SAFETY SCORE CALCULATION ────────────────────────────────────

/**
 * Master calculation function: Evaluates all approved reports for an area,
 * performs time context disaggregation, recency decay, volume shrinkage,
 * variance penalization, and returns the comprehensive AreaScoreResult.
 */
export function calculateAreaSafetyScore(
  reports: Report[],
  referenceTimeMs: number = Date.now(),
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): AreaScoreResult {
  const disclaimer =
    'This prototype score synthesizes community-perceived comfort and environmental observations. It is NOT an objective measure of crime or actual safety, and must not be used as a predictive crime indicator.'

  // Filter approved or valid reports
  const approvedReports = reports.filter(
    (r) => !r.moderationStatus || r.moderationStatus === 'approved' || r.moderationStatus === 'pending',
  )

  if (approvedReports.length === 0) {
    return {
      overallScore: null,
      reportCount: 0,
      effectiveVolume: 0,
      timeScores: {
        day: config.neutralPrior.mean,
        evening: config.neutralPrior.mean,
        night: config.neutralPrior.mean,
      },
      confidence: 'low',
      confidenceScore: 0,
      safetyState: 'insufficient-data',
      safetyStateLabel: 'Limited community data',
      consistencyScore: 1.0,
      uncertaintyScore: 0,
      hasSufficientData: false,
      disclaimer,
    }
  }

  // Pre-process all reports with timestamps, recency decay, and credibility weights
  const processed: ProcessedReportMetric[] = approvedReports.map((rep) => {
    const reportTimeMs = getReportTimestampMs(rep, referenceTimeMs)

    const ageHours = Math.max(0, (referenceTimeMs - reportTimeMs) / (1000 * 60 * 60))
    const tags = rep.tags || rep.observations || []
    const isIncident = isIncidentReport(tags, config)
    const recencyWeight = calculateRecencyWeight(ageHours, isIncident, config)
    const credibilityWeight = rep.weight ?? 1.0
    const effectiveWeight = recencyWeight * credibilityWeight
    const normalizedScore = normalizeRating(rep.rating)
    const timeContext = resolveReportTimeContext(rep)

    return {
      id: rep.id,
      normalizedScore,
      ageHours,
      recencyWeight,
      credibilityWeight,
      effectiveWeight,
      isIncident,
      timeContext,
    }
  })

  // Group by Time Context
  const dayReports = processed.filter((p) => p.timeContext === 'day')
  const eveningReports = processed.filter((p) => p.timeContext === 'evening')
  const nightReports = processed.filter((p) => p.timeContext === 'night')

  // Calculate Context Scores with Bayesian Shrinkage
  const dayItems = dayReports.map((d) => ({ score: d.normalizedScore, weight: d.effectiveWeight }))
  const eveningItems = eveningReports.map((e) => ({ score: e.normalizedScore, weight: e.effectiveWeight }))
  const nightItems = nightReports.map((n) => ({ score: n.normalizedScore, weight: n.effectiveWeight }))

  const dayScore = computeShrunkScore(dayItems, config)
  const eveningScore = computeShrunkScore(eveningItems, config)
  const nightScore = computeShrunkScore(nightItems, config)

  // Overall Items
  const allItems = processed.map((p) => ({
    score: p.normalizedScore,
    weight: p.effectiveWeight,
    recencyWeight: p.recencyWeight,
  }))

  const rawOverall = computeShrunkScore(allItems, config)
  const stats = calculateWeightedStats(allItems)
  const confResult = calculateConfidence(allItems, config)
  const effectiveVolume = stats.sumWeights

  const hasSufficientData =
    processed.length >= config.evidence.minReports &&
    effectiveVolume >= config.evidence.minEffectiveWeight

  // Classify safety state
  const stateInfo = classifySafetyState(
    hasSufficientData ? rawOverall : null,
    processed.length,
    effectiveVolume,
    config,
  )

  return {
    overallScore: hasSufficientData ? rawOverall : null,
    reportCount: processed.length,
    effectiveVolume: Math.round(effectiveVolume * 100) / 100,
    timeScores: {
      day: Math.round(dayScore),
      evening: Math.round(eveningScore),
      night: Math.round(nightScore),
    },
    confidence: confResult.level,
    confidenceScore: confResult.confidenceScore,
    safetyState: stateInfo.state,
    safetyStateLabel: stateInfo.label,
    consistencyScore: confResult.consistencyFactor,
    uncertaintyScore: confResult.stdDev,
    hasSufficientData,
    disclaimer,
  }
}
