# Awarely Safety Scoring Engine — Methodology & Specification

**Version:** 1.0.0 (Prototype Specification)  
**Status:** Approved Reference  
**Last Updated:** October 2026

---

> [!CAUTION]
> ### Crucial Ethical & Mathematical Disclaimer
> **This is a prototype methodology for community-perceived comfort and environmental observations.**
> **It is NOT a scientifically validated crime prediction model.**
> 
> - Never describe the result as an objective measure of crime, criminal activity, or actual danger.
> - The score reflects **subjective community perception** (illumination, foot traffic, presence of assistance, comfort).
> - Awarely explicitly separates **safety perception** from **empirical law enforcement crime statistics**.
> - Always accompany scores with **Confidence Levels**, **Data Freshness**, and the **"Limited community data"** state where evidence is sparse.

---

## 1. Architectural Philosophy & Principles

1. **Anti-Dogmatism:** A single report or a small burst of submissions must **never** dominate an area's status or paint a neighborhood as unsafe.
2. **Empirical Bayes (Shrinkage to Neutral Prior):** In the absence of large volumes, scores smoothly shrink toward an un-opinionated neutral midpoint ($50.0$), reflecting uncertainty rather than a false definitive judgment.
3. **Temporal Decay:** Recent observations carry more credibility than aged reports. Furthermore, temporary disruptions (e.g. road blocks, police presence) decay significantly faster than ambient infrastructure observations (e.g. street lighting).
4. **Minority Inclusion (Uncertainty, Not Censorship):** When community members disagree (e.g. some feel comfortable, some do not), minority voices are **never discarded**. Instead, disagreement increases the **uncertainty metric** and lowers the **confidence level**.
5. **No Speculative States:** If evidence falls below minimum volume thresholds, the system returns **Insufficient Data** / **Limited community data** rather than fabricating or guessing a safety state.

---

## 2. Step-by-Step Mathematical Calculation

### Step 1: Base Score Normalization

Community observations collect a discrete rating $r \in [1, 5]$. This is normalized into a continuous scale $s \in [0, 100]$:

$$s = \frac{r - 1}{4} \times 100$$

#### Value Mapping:
| 1–5 User Rating | Normalized Score ($s$) | Qualitative Perception |
|---|---|---|
| **1** | **0.0** | Higher Concern / Very Uncomfortable |
| **2** | **25.0** | Low Comfort / Caution Strongly Advised |
| **3** | **50.0** | Moderate / Caution Advised |
| **4** | **75.0** | Generally Comfortable / Well-Lit |
| **5** | **100.0** | Welcoming / High Foot Traffic |

---

### Step 2: Time Context Separation

Perceptions vary drastically across the day. An area that feels active and comfortable at noon may feel deserted or poorly lit at midnight. Reports are disaggregated into three canonical contexts:

- **Day:** Morning to late afternoon (`06:00 – 17:00`)
- **Evening:** Sunset and commuter hours (`17:00 – 21:00`)
- **Night:** Late night to dawn (`21:00 – 06:00`)

Each context maintains its own independent calculation:
- $\text{timeScores.day}$
- $\text{timeScores.evening}$
- $\text{timeScores.night}$

Overall score combines these contexts with configurable weights (default: Day $35\%$, Evening $35\%$, Night $30\%$) or direct pooled Bayesian shrinkage.

---

### Step 3: Configurable Exponential Recency Decay

Reports lose relevance over time. For a report submitted at time $t_{\text{report}}$, its age in hours is:

$$\text{ageHours} = \max\left(0, \frac{t_{\text{now}} - t_{\text{report}}}{3600 \times 1000}\right)$$

The recency weight $w_{\text{recency}}$ is governed by exponential decay:

$$w_{\text{recency}} = \exp\left(-\frac{\text{ageHours}}{\text{halfLifeHours}}\right)$$

#### Configurable Dual Half-Lives:
Different observation types carry different persistence:

1. **General Safety & Environmental Perception ($t_{1/2} = 720 \text{ hours / 30 days}$):**
   - Observations such as *"Well-lit"*, *"Poor lighting"*, *"Businesses open"*, *"High foot traffic"*.
   - Infrastructure changes slowly, so observations remain informative over weeks.

2. **Incident-Like & Temporary Events ($t_{1/2} = 72 \text{ hours / 3 days}$):**
   - Observations with tags such as *"Road blocked"*, *"Accident reported"*, *"Police presence"*, *"Felt uncomfortable"*.
   - Road obstructions and temporary disturbances clear quickly; their weight decays to $< 37\%$ within 3 days and $< 1\%$ within 14 days.

$$\text{effectiveWeight}_i = w_{\text{recency}, i} \times w_{\text{credibility}, i}$$

*(where $w_{\text{credibility}} = 1.0$ by default, adjustable by server moderation).*

---

### Step 4: Volume Shrinkage (Empirical Bayes with Neutral Prior)

To prevent a single review from swinging an area from $50$ to $100$ or $0$, Awarely applies Bayesian shrinkage against a neutral prior:

$$\text{shrunkScore} = \frac{W_0 \cdot M_0 + \sum_{i=1}^{N} w_i s_i}{W_0 + \sum_{i=1}^{N} w_i}$$

#### Parameters:
- **Prior Mean ($M_0$):** $50.0$ (the un-opinionated neutral center of the $0–100$ scale).
- **Prior Pseudo-Weight ($W_0$):** $3.0$ (represents the inertia of 3 neutral observations).

#### Behavioral Illustration:
- **Scenario A (Single 5-star report):**  
  $N = 1, s_1 = 100, w_1 = 1.0$  
  $$\text{shrunkScore} = \frac{3 \times 50 + 1 \times 100}{3 + 1} = \frac{250}{4} = 62.5$$  
  *Result:* The single report shifts the score moderately from $50$ to $62.5$, but cannot declare the area "100/100 safe".
- **Scenario B (Single 1-star report):**  
  $N = 1, s_1 = 0, w_1 = 1.0$  
  $$\text{shrunkScore} = \frac{3 \times 50 + 1 \times 0}{3 + 1} = \frac{150}{4} = 37.5$$  
  *Result:* Moderately drops, but cannot unilaterally declare high concern.
- **Scenario C (Robust community consensus of 15 reports at rating 4.5 $\rightarrow s = 87.5$):**  
  $$\text{shrunkScore} = \frac{3 \times 50 + 15 \times 87.5}{3 + 15} = \frac{150 + 1312.5}{18} \approx 81.3$$  
  *Result:* The evidence easily overcomes the prior.

---

### Step 5: Consistency, Disagreement & Uncertainty

When community members submit conflicting reports, we calculate the weighted variance:

$$\bar{s} = \frac{\sum w_i s_i}{\sum w_i}$$

$$V = \frac{\sum_{i=1}^{N} w_i (s_i - \bar{s})^2}{\sum_{i=1}^{N} w_i}, \quad \sigma = \sqrt{V}$$

#### Consistency Factor:
We define the consistency metric relative to maximum potential dispersion ($\sigma_{\max} = 50.0$ on a bounded $[0, 100]$ interval):

$$\text{consistencyFactor} = \max\left(0, 1.0 - \frac{\sigma}{\sigma_{\max}}\right)$$

- **High agreement** ($\sigma \approx 0 \implies \text{consistencyFactor} \approx 1.0$): High confidence in the score.
- **High disagreement** ($\sigma \ge 35 \implies \text{consistencyFactor} \le 0.3$): Confidence is heavily penalized. The UI represents this as **high uncertainty / mixed observations**. Minority voices are retained in the mean and lower the confidence grade.

---

### Step 6: Confidence Determination

Confidence is synthesized from **Volume**, **Recency**, and **Consistency**:

1. **Volume Ratio:** $\min\left(1.0, \frac{\sum w_i}{V_{\text{target}}}\right)$ where $V_{\text{target}} = 12.0$.
2. **Average Recency Factor:** $\frac{1}{N} \sum_{i=1}^N w_{\text{recency}, i}$
3. **Consistency Factor:** $1.0 - \frac{\sigma}{50}$

$$\text{ConfidenceScore} = \text{VolumeRatio} \times \left(0.50 + 0.25 \times \text{RecencyFactor} + 0.25 \times \text{ConsistencyFactor}\right)$$

#### Classification Tiers:
| Tier | Confidence Score ($C$) | Minimum Requirements | Presentation Label |
|---|---|---|---|
| **Low** | $C < 0.35$ | $< 2$ reports or sparse volume | **Low confidence** |
| **Medium** | $0.35 \le C < 0.70$ | $\ge 2$ reports with moderate recency | **Moderate confidence** |
| **High** | $C \ge 0.70$ | $\ge 5$ consistent, recent reports | **High confidence** |

---

### Step 7: Safety States & Insufficient Data Separation

Areas are classified into 4 non-judgmental community feedback states:

```
[Insufficient Data]  <── (Report Count < 2 OR Effective Weight < 1.5)
         │
         ├── [0 – 39.99]   ──> Higher concern
         ├── [40 – 69.99]  ──> Caution
         └── [70 – 100.0]  ──> Generally positive community feedback
```

> [!IMPORTANT]
> **Strict Separation of Insufficient Data:**  
> If an area has 0 or 1 report, or if contributing reports are so old that cumulative recency weight $< 1.5$, the engine returns `safetyState = 'insufficient-data'` and `overallScore = null`. **No safety state is assigned without sufficient evidence.**

---

## 3. Configuration Matrix Summary

All parameters are externalized in `DEFAULT_SCORING_CONFIG`:

| Parameter | Default Value | Purpose |
|---|---|---|
| `neutralPrior.mean` | `50.0` | Bayesian shrinkage anchor |
| `neutralPrior.weight` | `3.0` | Inertia weight of prior |
| `recency.generalHalfLifeHours` | `720` (30 days) | Decay rate for ambient tags |
| `recency.incidentHalfLifeHours` | `72` (3 days) | Decay rate for incident tags |
| `evidence.minReports` | `2` | Minimum reports required before state assignment |
| `evidence.minEffectiveWeight` | `1.5` | Minimum cumulative recency weight |
| `confidence.targetEffectiveVolume` | `12.0` | Volume needed for full volume score |
| `confidence.thresholds.medium` | `0.35` | Cutoff for moderate confidence |
| `confidence.thresholds.high` | `0.70` | Cutoff for high confidence |
| `safetyStates.higherConcernMax` | `40.0` | Upper bound for Higher Concern |
| `safetyStates.cautionMax` | `70.0` | Upper bound for Caution |
| `safetyStates.positiveMin` | `70.0` | Lower bound for Generally Positive |
| `timeContextWeights.day` | `0.35` | Daytime weight in overall score |
| `timeContextWeights.evening` | `0.35` | Evening weight in overall score |
| `timeContextWeights.night` | `0.30` | Nighttime weight in overall score |
