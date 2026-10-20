# Awarely Developer Tools & Zone Simulation Architecture

## 1. System Overview

The **Awarely Developer Tools** console (`/devtools`) provides engineering diagnostics, role privilege switching, isolated demo data generation, and **Zone Simulation** to test location-based safety awareness logic without physical field travel.

---

## 2. Strict Role Protection (RBAC)

- **Access Guard:** Restricted exclusively to authorized profiles with `role: 'dev'` or `role: 'admin'`.
- **Ordinary Users:** Any standard user (`role: 'user'`) attempting to access the developer panel is rejected by the RBAC guard in `ProtectedRoute` and `RestrictedAccess`.
- **Role Switcher:** Includes an internal simulator to instantly switch active roles to test UI privilege boundaries.

---

## 3. Zone Simulation (Real Alert Pipeline Integration)

> [!IMPORTANT]
> **Zero Separate Fake Alerts:** Zone simulation does NOT implement a mocked or separate alert path. It executes the **EXACT SAME production alert pipeline** (`locationAwarenessService.processLocationUpdate`) that handles genuine GPS updates.

### Required Actions

1. **Simulate Danger:**
   - Injects mock coordinates inside a known higher-concern zone (`area-delhi-rail-corridor` — Transit Perimeter).
   - Category: `higher-concern`.
   - Triggers a calm production safety alert with area context, confidence, and freshness.
2. **Simulate Warning:**
   - Injects mock coordinates inside a caution zone (`area-delhi-hauz-khas` — Hauz Khas Village).
   - Category: `caution`.
   - Triggers a calm caution alert via production logic.
3. **Simulate Safe:**
   - Injects mock coordinates inside a generally positive zone (`area-delhi-cp` — Connaught Place).
   - Category: `generally-positive`.
   - Verifies the production invariant: **positive areas do not trigger alarms**.
4. **Reset Location (Neutral Simulation):**
   - Injects neutral baseline sentinel coordinates `{ latitude: 0, longitude: 0 }` outside any monitored areas.
   - Triggers an `EXIT` event via the production pipeline, resetting current area containment.
   - *Intended Semantics:* Resets simulation to neutral/outside monitored areas. It deliberately does NOT invoke or alter real browser geolocation (which remains strictly on-demand via the discrete "Near Me" feature).
5. **Current Simulated Zone:**
   - Displays real-time simulation state: active zone name, coordinates, category badge, and production pipeline trigger/suppression status.
6. **Clear Alert Cooldown:**
   - Resets per-area cooldown timestamps so developers can immediately re-enter and test alerts without waiting 60 minutes.
7. **Reset Simulation:**
   - Resets location state to neutral coordinates and clears active alerts.

---

## 4. Isolated Demo Data Management

- **Demo Tagging:** All generated demo reports are explicitly tagged with `isDemo: true` and `source: 'demo'`.
- **Zero Production Pollution:** Stored in isolated demo storage and filtered from real community statistics.
- **Delete All Demo Data:** One-click purge removing all demo reports while leaving genuine community reports untouched.

---

## 5. Developer Debugging: “Explain Calculation”

Provides end-to-end mathematical transparency for the Safety Scoring Engine:

- **Area Context:** Name, ID, city.
- **Report Count:** Raw reports count and effective weighted volume ($V = \sum w_i$).
- **Current Time Context:** Day, Evening, or Night based on current local hour.
- **Relevant Reports:** Itemized list of contributing reports with individual ratings, normalized scores (0–100), age in hours, and observation tags.
- **Recency Decay Weights:** Explicit exponential decay:
  $$w_{\text{recency}} = \exp\left(-\frac{\Delta t}{t_{1/2}}\right)$$
  (30 days for general perception; 3 days for incidents).
- **Context Weights:** Time-of-day blending weights (Day: 0.35, Evening: 0.35, Night: 0.30).
- **Calculated Scores:** Overall continuous score, day score, evening score, and night score.
- **Confidence Metrics:** Confidence level, consistency factor (0–1), perception standard deviation ($\sigma$), and volume rationale.
- **Freshness:** Timestamp of latest report and categorized freshness label.
- **Selected Safety State & Reason:** Human-readable justification explaining exactly why the area is classified as `higher-concern`, `caution`, `generally-positive`, or `insufficient-data`.
