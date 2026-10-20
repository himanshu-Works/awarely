# Awarely Location-Based Safety Awareness System

**Version:** 1.0.0  
**Status:** Approved Architecture  
**Platform:** Web Foreground MVP & Flutter Mobile Specification

---

> [!IMPORTANT]
> ### Absolute Privacy Guarantee: Zero Continuous Tracking
> **Awarely NEVER continuously tracks user location, records travel trails, or stores route history.**
> - Coordinates are processed **strictly in-memory** to resolve enclosing bounded areas.
> - Raw GPS coordinates are **never saved** to Firestore, local databases, or logs.
> - The Web platform operates exclusively on **foreground checks with explicit user consent**.

---

## 1. Core Concept: Area Entry

Awarely is organized around **bounded geographic areas** (neighborhoods, markets, station zones, districts) rather than individual streets, coordinates, or navigation routes.

When a user's device detects an **Area Entry** into a monitored locality classified as `higher-concern` or `caution`:

```
User Location Update (Foreground)
              │
              ▼
   Resolve Enclosing Area (Haversine Center/Radius & Bounds)
              │
              ├── Outside Monitored Areas ──> Reset Current Area to NULL (Exit Event)
              │
              ├── Same Area As Previous ───> No Alert (Once-Per-Entry Invariant)
              │
              └── New Area Entered!
                    │
                    ├── Category: Positive OR Insufficient Data ──> No Alert
                    │
                    └── Category: Higher Concern OR Caution
                          │
                          ├── User Alerts Disabled or Paused? ──[YES]──> No Alert
                          │
                          ├── Cooldown Active (< 60 min)? ─────[YES]──> Suppress Alert
                          │
                          └── Cooldown Expired & Enabled ──────[YES]──> Trigger Calm Alert!
```

---

## 2. Calm, Non-Alarmist Safety Awareness Alert

Awarely strictly prohibits panic-inducing, alarmist messaging or shrill sirens for passive location awareness. Alerts are calm, informative, and context-rich.

### Alert Structure:
```
Safety awareness:
Recent community feedback indicates [higher concern / caution] in this area [time context].
Confidence: [Moderate / High].
Based on [N] recent reports.
```

### Standardized Examples:
- **Nighttime Caution:**  
  *“Safety awareness: Recent community feedback indicates caution in this area at night. Confidence: Moderate. Based on 24 recent reports.”*
- **Higher Concern:**  
  *“Safety awareness: Recent community feedback indicates higher concern in this area. Confidence: Moderate. Based on 18 recent reports.”*

---

## 3. Cooldown & De-Duplication Protocol

To eliminate notification fatigue and intrusive interruptions, Awarely enforces a 3-tier de-duplication state machine:

1. **Once Per Area Entry:**  
   As long as the user remains inside the same area boundary, repeated location checks will **never** trigger additional alerts.
2. **Per-Area Cooldown Window (Default: 60 minutes):**  
   If a user steps out of an area and steps back in within 60 minutes, the alert remains suppressed.
3. **Reset After Leaving & Cooldown Expiry:**  
   When the user transitions to another area or leaves monitored zones, the state registers an exit event. Once the cooldown window expires, a subsequent entry will appropriately trigger a fresh awareness notice.

---

## 4. User Preference Controls

Users maintain full sovereign control over their notification experience:

| Action | Function | State Effect |
|---|---|---|
| **Toggle Alerts** | `setAlertsEnabled(boolean)` | Enables or completely disables location-based alerts. |
| **Pause Notifications** | `pauseAlerts(durationMinutes)` | Temporarily mutes alerts for 1 hour, 8 hours, or 24 hours. |
| **Resume Notifications** | `resumeAlerts()` | Clears the pause timestamp and resumes immediate evaluation. |
| **Cooldown Tuning** | Configurable `cooldownMinutes` | Adjusts per-area re-alert frequency (default: 60m). |

---

## 5. Web Browser Limitations vs Native Geofencing

### Web MVP Constraints:
- **Foreground Only:** Modern web browsers (Chrome, Safari, Edge) strictly suspend or throttle geolocation queries when the tab is hidden, backgrounded, or the browser is closed.
- **Service Worker Restrictions:** Web Service Workers cannot continuously monitor background GPS without active Web Workers or device screen wake locks.
- **Awarely Web Architecture:** On Web, location awareness runs during **active foreground user sessions** (e.g. while looking at the map or checking area advisories), requesting permission explicitly and processing coordinates in memory.

---

## 6. Flutter / Native Mobile Migration Architecture

The engine is engineered around the universal **`IGeofencingEngine`** interface to ensure seamless porting to the upcoming Flutter application:

```typescript
export interface IGeofencingEngine {
  processLocationUpdate(coords: Coordinates): GeofenceAreaEntryEvent | null
  setAlertsEnabled(enabled: boolean): void
  pauseAlerts(durationMinutes: number): void
  resumeAlerts(): void
  getPreferences(): UserAlertPreferences
}
```

### Flutter Implementation Strategy:
1. **OS Geofencing APIs:**  
   Flutter registers circular boundaries using:
   - **Android:** `GeofencingClient.addGeofences()` (Google Play Services)
   - **iOS:** `CLLocationManager.startMonitoring(for: CLCircularRegion)`
2. **Zero Location History:**  
   Neither Android nor iOS continuous tracking is activated. The operating system handles geofence boundary monitoring at the hardware/cellular level with negligible battery drain.
3. **Transition Wakeup:**  
   The OS wakes the Awarely Flutter background receiver **only on boundary crossing (`GEOFENCE_TRANSITION_ENTER`)**, retrieves the area's cached score, checks the cooldown, and delivers a calm local notification.
