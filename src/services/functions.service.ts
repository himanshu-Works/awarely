/**
 * Cloud Functions service — typed wrappers for all HTTPS Callable Functions.
 *
 * All server-side operations (report submission, area resolution, AI summaries,
 * circle alerts) go through these wrappers. Direct Firestore writes from the
 * client are intentionally avoided.
 */

import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase/firebase'
import type {
  ResolveAreaRequest,
  GenerateAreaSummaryRequest,
  GenerateAreaSummaryResponse,
  SendCircleAlertRequest,
  SendCircleAlertResponse,
} from '@/types/functions'
import type { ResolvedArea } from '@/types/area'
import type { ReportSubmissionPayload } from '@/types/report'

export interface ValidateReportResponse {
  success: boolean
  reportId: string
  message: string
}

export const functionsService = {
  /**
   * Resolve coarse coordinates to a named area.
   * Coordinates are truncated client-side before sending.
   * The Cloud Function never stores coordinates.
   */
  async resolveArea(lat: number, lng: number): Promise<ResolvedArea> {
    const fn = httpsCallable<ResolveAreaRequest, ResolvedArea>(functions, 'resolveArea')
    const result = await fn({ lat, lng })
    return result.data
  },

  /**
   * Submit a community awareness report.
   * Server-side: uid, timestamp, expiry, platform are added by the Cloud Function.
   */
  async submitReport(payload: ReportSubmissionPayload): Promise<ValidateReportResponse> {
    const fn = httpsCallable<ReportSubmissionPayload, ValidateReportResponse>(
      functions,
      'validateReport',
    )
    const result = await fn(payload)
    return result.data
  },

  /**
   * Request an AI-generated (Gemini) awareness summary for an area.
   * Returns cached result if available and fresh.
   * The Gemini API key is handled entirely server-side.
   */
  async generateAreaSummary(
    areaId: string,
    force = false,
  ): Promise<GenerateAreaSummaryResponse> {
    const fn = httpsCallable<GenerateAreaSummaryRequest, GenerateAreaSummaryResponse>(
      functions,
      'generateAreaSummary',
    )
    const result = await fn({ areaId, force })
    return result.data
  },

  /**
   * Send safety awareness alerts to the user's trusted circle contacts.
   * This is always explicitly user-triggered — never automatic.
   */
  async sendCircleAlert(
    payload: SendCircleAlertRequest,
  ): Promise<SendCircleAlertResponse> {
    const fn = httpsCallable<SendCircleAlertRequest, SendCircleAlertResponse>(
      functions,
      'sendCircleAlert',
    )
    const result = await fn(payload)
    return result.data
  },
}
