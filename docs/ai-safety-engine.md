# Awarely AI Safety Insight Engine — Architecture & Specification

**Version:** 1.0.0  
**Status:** Approved Architecture  
**Model Version:** `gemini-1.5-flash`  
**Execution Environment:** Secure Server-Side (Cloud Functions / Firebase Admin)

---

## 1. Security & Anti-Exposure Principle

> [!CAUTION]
> ### Zero Client-Side Credential Exposure
> **Gemini API credentials (`GEMINI_API_KEY`) are NEVER included in client bundles, Vite environment variables, or frontend code.**
> - All AI synthesis is executed exclusively on **secure server-side infrastructure** (Cloud Functions / backend services).
> - The client application only consumes sanitized, cached summary documents from `areaSummaries/{areaId}` or invokes callable HTTPS wrappers.

---

## 2. Privacy-Preserving Input Protocol

The AI model receives **strictly aggregated, approved, and anonymized** community information:

- **What the AI receives:**
  - Canonical area name and city (e.g. `Bandra West`, `Mumbai`)
  - Aggregated report count (e.g. `24 observations`)
  - Overall comfort score and context breakdown (`day`, `evening`, `night`)
  - Observation tag frequency counts (e.g. `Well-lit: 12`, `High foot traffic: 15`, `Poor lighting: 3`)
  - Statistical disagreement level (`low`, `moderate`, `high`)
  - Time elapsed since the most recent observation (hours)
  - Confidence label (`High confidence`, `Moderate confidence`, `Low confidence`)

- **What the AI NEVER receives:**
  - ❌ Contributor names, usernames, or email addresses
  - ❌ User IDs (`uid`) or device tokens
  - ❌ Exact GPS coordinates or route polylines
  - ❌ Continuous location tracking breadcrumbs
  - ❌ Free-form unmoderated user comments containing PII

---

## 3. Strict Negative Guardrails

To prevent hallucinations, fearmongering, or liability, the prompt templates and server-side verification pipelines enforce the following **absolute prohibitions**:

1. **No Incident Invention:** The AI must **never** invent incidents, disturbances, accidents, or hazards that are not explicitly present in the source observation tags.
2. **No Crime Prediction:** The AI must **never** predict crimes, state crime probabilities, or use law enforcement terminology (e.g. *"theft risk"*, *"assault zone"*, *"felony rate"*).
3. **No Certainty Claims:** The AI must **never** claim certainty (e.g. *"this area is completely safe"* or *"this area is dangerous"*). It must always frame statements in terms of *community perception* and *reported foot traffic*.
4. **No Overriding Community Evidence:** The AI cannot contradict the aggregated ratings (e.g. cannot claim daylight is vibrant if all reports indicate quiet caution).
5. **No Unsupported Facts:** The AI cannot introduce businesses, police stations, or street fixtures unless corroborated by source observation tags.
6. **No Individual Identification:** The AI must never name or reference specific individuals, businesses, or private properties.
7. **No Defamatory Statements:** The AI must never disparage specific groups, commercial establishments, or neighborhoods.

---

## 4. Freshness Phrasing Framework

Freshness is **always communicated** in the insight narrative to provide accurate temporal context:

| Condition | Standardized Freshness Language |
|---|---|
| Latest report $\le 3$ hours ago | `Based on reports from the last 3 hours.` |
| Latest report $\le 24$ hours ago | `Based on reports from the last 24 hours.` |
| Latest report $> 24$ hours ago | `No recent reports in the past 12 hours (latest update from X days ago).` |
| Zero or single report ($< 2$) | `Limited recent community data is available for this area.` |

---

## 5. Narrative Style Examples

- **Balanced Daylight vs Night Context:**  
  *“Most recent community feedback for Bandra West is generally positive during the day with active commercial foot traffic, while fewer recent reports indicate more caution at night due to lower foot traffic and dim side lanes. Based on reports from the last 3 hours.”*

- **Limited Data Scenario:**  
  *“Limited recent community data is available for this area. The current insight should therefore be treated with low confidence.”*

---

## 6. Time-of-Day Context Disaggregation

The AI Safety Engine generates distinct, structured insight objects for three time contexts:
1. **Day (06:00 – 17:00):** Focuses on commercial vitality, pedestrian density, and daylight illumination.
2. **Evening (17:00 – 21:00):** Focuses on commute flow, open market storefronts, and sunset transitions.
3. **Night (21:00 – 06:00):** Focuses on streetlamp illumination, transit terminal activity, and quiet lanes.

---

## 7. Structured JSON Output & Storage Schema

Stored at Firestore document `areaSummaries/{areaId}`:

```typescript
export interface AreaSummaryDoc {
  areaId: string
  summaryText: string               // Overall 2-sentence executive summary
  freshnessText: string             // e.g. "Based on reports from the last 3 hours."
  confidenceLabel: ConfidenceLabel  // "High confidence" | "Moderate confidence" | "Low confidence"
  generatedAt: Timestamp           // Server timestamp
  sourceReportCount: number         // Number of contributing reports at generation time
  modelVersion: string              // "gemini-1.5-flash"

  day: {
    summaryText: string
    freshnessText: string
    confidenceLabel: ConfidenceLabel
    comfortScore: number            // 0–100
    topObservations: string[]       // e.g. ["Well-lit", "High foot traffic"]
  }
  evening: {
    summaryText: string
    freshnessText: string
    confidenceLabel: ConfidenceLabel
    comfortScore: number
    topObservations: string[]
  }
  night: {
    summaryText: string
    freshnessText: string
    confidenceLabel: ConfidenceLabel
    comfortScore: number
    topObservations: string[]
  }
}
```

---

## 8. Caching & Invalidation Architecture

To optimize performance and minimize API consumption:

```
User visits Area Page
       │
       ▼
Check areaSummaries/{areaId} in Firestore
       │
       ├── Cache Hit & Valid? ──[YES]──> Return cached summary instantly (0 API calls)
       │   (reportCount matches Area AND age < 24h)
       │
       └── Cache Miss / Outdated / force=true?
           │
           ▼
Fetch approved reports from reports/{reportId}
           │
           ▼
Execute Gemini Prompt with Negative Guardrails
           │
           ▼
Run Server-Side Guardrail & Fact Grounding Verifier
           │
           ▼
Write updated document to areaSummaries/{areaId}
           │
           ▼
Return fresh summary
```

### Invalidation Triggers:
- A new report is approved through moderation (`reportCount` increments).
- `lastReportAt` is newer than `generatedAt`.
- Cache expiration ($> 24$ hours old).
- Explicit admin refresh (`force = true`).
