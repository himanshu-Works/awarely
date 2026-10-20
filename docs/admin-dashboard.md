# Awarely Admin Dashboard & Moderation Governance Architecture

## 1. System Overview

The **Awarely Admin Dashboard** (`/admin`) provides verified administrators with a centralized governance console to review community reports, enforce community veracity standards, inspect immutable audit trails, and trigger downstream scoring recalculations.

---

## 2. Role Protection (RBAC)

- **Admin Only Access:** Restricted strictly to profiles with `role: 'admin'`.
- **Ordinary Users & Developers:** Ordinary users (`role: 'user'`) and developers (`role: 'dev'`) are strictly blocked at both the route level (`ProtectedRoute allowedRoles={['admin']}`) and page component level (`RestrictedAccess`).
- **Zero Fabrication Invariant:** Administrators **cannot fabricate or invent community reports**. The administrative interface provides no report creation endpoints; data originates exclusively from legitimate community contributors.

---

## 3. Moderation Lifecycle & States

Community reports transition through the following states:

1. **`pending`**: Default state upon report submission. Awaiting administrative verification.
2. **`approved`**: Verified as compliant with community guidelines. Included in the mathematical scoring engine and AI summaries.
3. **`rejected`**: Discarded from consensus calculations due to unverified claims, spam, or promotional text.
4. **`flagged`**: Placed under senior moderator investigation due to suspected coordinated bursts or reported violations.

---

## 4. Administrative Moderation Actions

| Action | Behavior | Downstream Pipeline Effects |
| :--- | :--- | :--- |
| **Approve Report** | Marks report `moderationStatus: 'approved'`. | Recalculates area score, updates confidence level, and invalidates cached AI summary. |
| **Reject Report** | Prompts for administrative reason; marks `moderationStatus: 'rejected'`. | Recalculates area score (removes contribution) and invalidates AI summary. |
| **Flag Report** | Flags inappropriate content with an administrative reason; sets `moderationStatus: 'flagged'`. | Retains report for review while suppressing from unverified scoring. |
| **Remove Content** | Soft-deletes inappropriate content, marking status as rejected with reason. | Recalculates area score and logs action. |
| **Review Details** | Opens contextual inspection modal with rating, observations, note, and contextual photo. | Non-destructive view. |

---

## 5. Immutable Governance Audit Trail

Every administrative action automatically generates an audit record stored in `adminAuditLogs/{logId}`:

- **`adminUid`**: Authenticated UID of the moderator.
- **`adminEmail`**: Moderator email address.
- **`adminDisplayName`**: Moderator name.
- **`action`**: `APPROVE_REPORT`, `REJECT_REPORT`, `FLAG_REPORT`, `REMOVE_REPORT`, etc.
- **`affectedEntity`**: Reference to target resource (e.g. `reports/rep-101`).
- **`areaId` & `areaName`**: Geographic area context.
- **`reason` & `details`**: Documented rationale.
- **`timestamp`**: Server timestamp.

---

## 6. Privacy Safeguards for Administrators

Even authorized administrators cannot bypass the core Awarely privacy model:
1. **Masked Reporter Identifiers:** Raw user IDs (`reporterUid`) are stripped and replaced with pseudonymized references (e.g. `usr-***38a`).
2. **No Raw GPS Tracks:** Only the coarse canonical `areaId` is referenced. No continuous routes, turn-by-turn vectors, or travel trails exist in the database or admin interface.
3. **Zero IP Logging:** Contributor IP addresses and hardware fingerprints are never stored or displayed.
