# Awarely Area Resolution & Geographic Entity Strategy

## 1. Core Architectural Mandate: Area-Wise, Not Street-Wise

Awarely provides **area-level community safety awareness**.

Unlike navigation apps that model individual road segments, intersections, or turn-by-turn routes, Awarely aggregates environmental perception (illumination, foot traffic, pedestrian density, open businesses) across **meaningful geographic communities**.

### Supported Geographic Entities
Awarely supports and indexes:
- **Neighborhoods** (e.g., Bandra West, Soho, Hauz Khas Village)
- **Localities & Sublocalities** (e.g., Colaba, Connaught Place, Koramangala)
- **Markets & Bazaars** (e.g., Crawford Market, Khan Market, Chandni Chowk)
- **Station Areas** (e.g., CSMT Station Perimeter, King's Cross Station Environs)
- **Chowks & Promenades** (e.g., Hutatma Chowk, Gateway Promenade, Rajiv Chowk)
- **Municipal & City Districts** (e.g., Westminster, South Mumbai, New Delhi Central)

### Why Individual Streets and Lanes are Disallowed
1. **Statistical Robustness:** Individual lanes often receive sparse, noisy, or single-person feedback. Aggregating at the neighborhood or locality level produces statistically credible, crowd-corroborated consensus.
2. **Anti-Stigmatization:** Street-level scoring can inadvertently redline or stigmatize individual blocks or commercial establishments based on transient events.
3. **Privacy by Design:** Preserving coarse area boundaries protects contributors from hyper-local location correlation or movement profiling.

---

## 2. Canonical Area Identifier Strategy

To prevent duplicate entities across spelling variants, languages, and municipal boundaries, Awarely derives a deterministic, normalized, URL-safe **Canonical Area ID**.

### Structure
```
area-[country_code]-[city_slug]-[primary_area_slug]
```

### Component Hierarchy (Order of Precedence)
When geocoding or place components are extracted, Awarely selects the most granular valid area entity according to the following strict hierarchy:
1. `neighborhood` (e.g., Carter Road & Pali Hill → `bandra-west`)
2. `sublocality_level_1` / `sublocality` (e.g., `colaba`)
3. `locality` (e.g., `connaught-place`)
4. `postal_code` (e.g., `400005`)
5. `administrative_area_level_2` / `city` (e.g., `mumbai`)

### Normalization Pipeline
1. **Lowercase:** All characters converted to ASCII lowercase.
2. **De-accenting:** Diacritics and unicode marks are stripped (e.g., `São Paulo` → `sao-paulo`).
3. **Punctuation & Stopwords:** Non-alphanumeric characters replaced with single hyphens (`-`).
4. **Duplicate Hyphens:** Multiple adjacent hyphens collapsed into one.
5. **Trim:** Leading and trailing hyphens removed.

### Canonical Examples
| User Query / Place | Country | City | Primary Component | Canonical Area ID |
|---|---|---|---|---|
| Colaba, Gateway | IN | Mumbai | `neighborhood` / `colaba` | `area-in-mumbai-colaba` |
| Bandra West, Pali Hill | IN | Mumbai | `neighborhood` / `bandra-west` | `area-in-mumbai-bandra-west` |
| Connaught Place Outer Circle | IN | New Delhi | `locality` / `connaught-place` | `area-in-delhi-connaught-place` |
| Soho, West End | GB | London | `neighborhood` / `soho` | `area-gb-london-soho` |
| Crawford Market Area | IN | Mumbai | `market` / `crawford-market` | `area-in-mumbai-crawford-market` |
| Dadar Railway Station Environs | IN | Mumbai | `station` / `dadar-station-area` | `area-in-mumbai-dadar-station-area` |

---

## 3. Street & Road Elevation Protocol

If a user enters a street address, lane, or highway (e.g., *"Hill Road"*, *"Linking Road"*, *"Baker Street"*):

1. **Detection:** Awarely detects Google Place types containing `route`, `street_address`, `street_number`, or `intersection`.
2. **Elevation to Broader Area:** Awarely intercepts the street and inspects the containing `address_components` for the enclosing neighborhood, sublocality, or locality.
3. **Entity Assignment:** The canonical entity used for data retrieval and submission is the **broader enclosing area**, NOT the individual street.
4. **Transparent Communication:** The UI displays an informative notice:
   > *"Awarely provides area-level awareness. Your search for '[Street Name]' has been matched to its containing neighborhood: **[Broader Area]**."*

---

## 4. Search & Resolution Flow

```
[ User Enters Search Query ]
            │
            ▼
[ Google Places Autocomplete / Local Area Catalog ]
            │
            ▼
[ User Selects Suggestion / Location ]
            │
            ▼
[ Geocoding Component Extraction ]
            │
    Is it a street/road?
     ├── YES ──► Elevate to containing Neighborhood / Sublocality
     └── NO  ──► Use Area Entity directly
            │
            ▼
[ Generate Canonical Area ID ]
            │
            ▼
[ Query Firestore `areas/{canonicalId}` ]
            │
    Does area document exist in Firestore?
     ├── YES ──► Load Safety State, Confidence Tier, Freshness, & Observations
     └── NO  ──► Construct Unreported Area Entity (0 reports, 'unknown' status)
            │
            ▼
[ Center Map on Area Coordinates & Display Boundary Overlay ]
```

---

## 5. Non-Fabrication Policy for Unreported Areas

Awarely strictly prohibits synthetic, fabricated, or assumed community ratings.

When an area is resolved that has not yet received community submissions:
1. **Safety State:** Set strictly to `Limited community data` (awareness level `unknown`).
2. **Confidence Level:** Set strictly to `Low confidence`.
3. **Report Count:** Set strictly to `0`.
4. **Messaging Displayed:**
   - **“No community reports yet for this area.”**
   - **“Limited community data.”**
   - **“Be the first to report.”** (with a direct CTA button navigating to the report flow with pre-selected area context).

---

## 6. Cartography & Geometry

Each area entity contains:
- `bounds`: Geographic bounding box (`northEast`, `southWest`).
- `polygon`: GeoJSON representation of the neighborhood boundary.
- `center`: Lat/Lng midpoint used for map camera centering.

When rendering:
- Map centers on the area centroid with a comfortable neighborhood zoom (`z = 14–15`).
- Area polygon is rendered with awarely neutral awareness styling (teal for positive feedback, amber for caution, slate for limited data).
