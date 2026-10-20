/** Payload sent to the resolveArea Cloud Function */
export interface ResolveAreaRequest {
  lat: number
  lng: number
}

/** Payload sent to the validateReport Cloud Function */
export type ValidateReportRequest = import('./report').ReportSubmissionPayload

/** Payload sent to the generateAreaSummary Cloud Function */
export interface GenerateAreaSummaryRequest {
  areaId: string
  force?: boolean
}

/** Response from generateAreaSummary */
export interface GenerateAreaSummaryResponse {
  summary: string
  generatedAt: string  // ISO 8601
  cached: boolean
}

/** Payload sent to the sendCircleAlert Cloud Function */
export interface SendCircleAlertRequest {
  areaId: string
  areaName: string
  userAlias?: string
  personalMessage?: string
  timestamp: string    // ISO 8601
}

/** Response from sendCircleAlert */
export interface SendCircleAlertResponse {
  success: boolean
  contactsNotified: number
  alertId: string
  remainingAlerts: number
}
