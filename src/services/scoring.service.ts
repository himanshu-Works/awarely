/**
 * Awarely Safety Scoring Service
 *
 * Implements automated recalculation of safety scores when approved reports change:
 * 1. Fetches all valid reports for the specified areaId.
 * 2. Executes the calculateAreaSafetyScore mathematical engine.
 * 3. Updates the target area's computed metrics in Firestore.
 * 4. Invalidates the AI summary cache for the area.
 */

import { Timestamp } from 'firebase/firestore'
import { firestoreService } from './firestore.service'
import {
  calculateAreaSafetyScore,
  DEFAULT_SCORING_CONFIG,
  type AreaScoreResult,
  type ScoringConfig,
} from '@/utils/scoring'
import type { AwarenessLevel } from '@/config/app.config'

export interface RecalculationResult {
  areaId: string
  scoreResult: AreaScoreResult
  updatedAt: Timestamp
}

export const scoringService = {
  /**
   * Recalculates safety score for an area from its community reports.
   * Automates backend recalculation after approved reports change.
   */
  async recalculateAreaScore(
    areaId: string,
    config: ScoringConfig = DEFAULT_SCORING_CONFIG,
  ): Promise<RecalculationResult> {
    // 1. Fetch community reports for this area
    const reports = await firestoreService.getReportsByArea(areaId, 100)

    // 2. Run mathematical scoring engine
    const scoreResult = calculateAreaSafetyScore(reports, Date.now(), config)

    // 3. Map safety state to canonical awareness level ('active' | 'mixed' | 'quiet' | 'unknown')
    let awarenessLevel: AwarenessLevel = 'quiet'
    if (scoreResult.safetyState === 'higher-concern') {
      awarenessLevel = 'quiet'
    } else if (scoreResult.safetyState === 'caution') {
      awarenessLevel = 'mixed'
    } else if (scoreResult.safetyState === 'generally-positive') {
      awarenessLevel = 'active'
    } else {
      awarenessLevel = 'unknown'
    }

    const now = Timestamp.now()

    // 4. Update Area document in Firestore (only server/admin or Cloud Function can mutate computed scores)
    try {
      await firestoreService.updateAreaComputedScore(areaId, {
        reportCount: scoreResult.reportCount,
        overallScore: scoreResult.overallScore,
        timeScores: scoreResult.timeScores,
        confidence: scoreResult.confidence === 'medium' ? 'moderate' : scoreResult.confidence,
        confidenceLevel: scoreResult.confidence === 'medium' ? 'moderate' : scoreResult.confidence,
        awarenessLevel,
        // Invalidate relevant AI summary cache
        aiSummaryGeneratedAt: null,
        updatedAt: now,
      })
    } catch (err) {
      // In offline/demo mode, log notice
      console.warn('[ScoringService] Firestore area update skipped (offline/demo):', err)
    }

    return {
      areaId,
      scoreResult,
      updatedAt: now,
    }
  },
}
