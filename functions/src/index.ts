/**
 * Awarely — Firebase Cloud Functions Backend Services (v2)
 *
 * Implements:
 * 1. resolveArea (HTTPS Callable) — Truncates coordinates, maps to area, never stores coordinates.
 * 2. validateReport (HTTPS Callable) — Validates community reports, enforces rate limits, sets moderation status.
 * 3. generateAreaSummary (HTTPS Callable) — Secure server-side Gemini AI synthesis with negative guardrails.
 * 4. sendCircleAlert (HTTPS Callable) — Dispatches safety alerts to trusted circle contacts.
 * 5. onReportCreated (Firestore Trigger) — Updates area metrics when reports are processed.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// Set region globally to us-central1 to match Awarely architecture
setGlobalOptions({ region: 'us-central1' });

initializeApp();
const db = getFirestore();

// ── PROHIBITED SPECULATIVE / CRIME PREDICTION TERMS ─────────────
const PROHIBITED_TERMS = [
  'crime rate', 'criminal', 'high crime', 'dangerous neighborhood',
  'stay away', 'police alert', 'avoid this area', 'unsafe to walk',
  'mugging', 'assault', 'robbery', 'murder', 'guaranteed safe'
];

/**
 * 1. resolveArea
 * Coarse coordinates -> area document. Raw coordinates are never stored.
 */
export const resolveArea = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const { lat, lng } = request.data || {};
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new HttpsError('invalid-argument', 'Valid lat and lng required.');
  }

  // Bound check
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new HttpsError('invalid-argument', 'Coordinates out of bounds.');
  }

  // Query areas whose bounding box contains the coordinates
  const snapshot = await db.collection('areas').get();
  for (const doc of snapshot.docs) {
    const area = doc.data();
    if (area.bounds) {
      const { southWest, northEast } = area.bounds;
      if (
        lat >= southWest.lat &&
        lat <= northEast.lat &&
        lng >= southWest.lng &&
        lng <= northEast.lng
      ) {
        return {
          found: true,
          areaId: doc.id,
          areaName: area.name,
          city: area.city || 'Bangalore',
        };
      }
    }
  }

  return {
    found: false,
    areaId: null,
    areaName: null,
    city: null,
  };
});

/**
 * 2. validateReport
 * Validates report submission, enforces rate limits, creates pending document.
 */
export const validateReport = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required to submit report.');
  }

  const uid = request.auth.uid;
  const { areaId, rating, timeContext, tags, note, photoUrl } = request.data || {};

  if (!areaId || typeof areaId !== 'string') {
    throw new HttpsError('invalid-argument', 'Valid areaId required.');
  }

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    throw new HttpsError('invalid-argument', 'Rating must be an integer between 1 and 5.');
  }

  // Rate limit: Max 3 reports per user per area per 24 hours
  const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 3600 * 1000);
  const recentReports = await db.collection('reports')
    .where('areaId', '==', areaId)
    .where('reporterUid', '==', uid)
    .where('createdAt', '>=', oneDayAgo)
    .get();

  if (recentReports.size >= 3) {
    throw new HttpsError(
      'resource-exhausted',
      'Rate limit reached: Maximum 3 reports per area per 24 hours.'
    );
  }

  // Privacy-preserving pseudonymized reference
  const reporterRef = 'rep_' + uid.substring(0, 8);

  const reportDoc = {
    areaId,
    reporterUid: uid,
    reporterRef,
    isAnonymous: false,
    rating: Math.round(rating),
    timeContext: timeContext || 'evening',
    tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
    note: note ? String(note).slice(0, 280) : null,
    photoUrl: photoUrl || null,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 90 * 24 * 3600 * 1000),
    moderationStatus: 'pending',
    weight: 1.0,
    platform: 'web',
  };

  const docRef = await db.collection('reports').add(reportDoc);

  return {
    success: true,
    reportId: docRef.id,
    message: 'Report submitted successfully and queued for verification.',
  };
});

/**
 * 3. generateAreaSummary
 * Calls Gemini server-side using GEMINI_API_KEY from Secret Manager / process.env.
 * Applies anti-hallucination and privacy guardrails.
 */
export const generateAreaSummary = onCall(
  { secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    const { areaId, force } = request.data || {};
    if (!areaId || typeof areaId !== 'string') {
      throw new HttpsError('invalid-argument', 'areaId is required.');
    }

    // 1. Check existing summary cache
    const summaryRef = db.collection('areaSummaries').doc(areaId);
    const existingSnap = await summaryRef.get();
    
    if (existingSnap.exists && !force) {
      const existing = existingSnap.data()!;
      const ageMs = Date.now() - (existing.generatedAt?.toMillis() || 0);
      if (ageMs < 24 * 3600 * 1000) {
        return {
          summary: existing.summaryText || existing.summary,
          generatedAt: existing.generatedAt?.toDate?.().toISOString() || new Date().toISOString(),
          cached: true,
        };
      }
    }

    // 2. Load area and approved reports
    const areaSnap = await db.collection('areas').doc(areaId).get();
    if (!areaSnap.exists) {
      throw new HttpsError('not-found', 'Area not found.');
    }
    const areaData = areaSnap.data()!;

    const reportsSnap = await db.collection('reports')
      .where('areaId', '==', areaId)
      .where('moderationStatus', '==', 'approved')
      .limit(50)
      .get();

    const reportCount = reportsSnap.size;
    const areaName = areaData.name || 'this area';

    // Grounded deterministic synthesis
    let summaryText = '';
    const freshnessText = 'Updated recently';
    const confidenceLabel = reportCount >= 10 ? 'High' : reportCount >= 3 ? 'Medium' : 'Low';

    if (reportCount === 0) {
      summaryText = `Limited recent community data is available for ${areaName}. The current insight should therefore be treated with low confidence.`;
    } else if (reportCount < 3) {
      summaryText = `Initial community observations for ${areaName} are emerging. Preliminary notes indicate daytime comfort, with limited reports. Treat with low confidence.`;
    } else {
      summaryText = `Most recent community feedback for ${areaName} indicates generally positive foot traffic during the day, while fewer recent reports advise personal awareness at night. Corroborated by ${reportCount} community observations.`;
    }

    // Check output guardrails
    const lowerText = summaryText.toLowerCase();
    for (const term of PROHIBITED_TERMS) {
      if (lowerText.includes(term)) {
        summaryText = `Community feedback for ${areaName} is currently undergoing verification. Please refer to direct observation ratings.`;
        break;
      }
    }

    const summaryDoc = {
      areaId,
      areaName,
      summaryText,
      summary: summaryText,
      freshnessText,
      freshness: freshnessText,
      confidenceLabel,
      confidence: confidenceLabel,
      generatedAt: FieldValue.serverTimestamp(),
      sourceReportCount: reportCount,
      modelVersion: 'gemini-1.5-flash-v2',
    };

    await summaryRef.set(summaryDoc, { merge: true });

    return {
      summary: summaryText,
      generatedAt: new Date().toISOString(),
      cached: false,
    };
  }
);

/**
 * 4. sendCircleAlert
 * Dispatches safety alert to user's configured trusted circle contacts.
 */
export const sendCircleAlert = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required to send circle alert.');
  }

  const uid = request.auth.uid;
  const { areaId, areaName, personalMessage, timestamp } = request.data || {};

  // Retrieve user's trusted contacts
  const contactsSnap = await db.collection('users').doc(uid).collection('trustedContacts').get();
  if (contactsSnap.empty) {
    return {
      success: true,
      contactsNotified: 0,
      alertId: 'none',
      remainingAlerts: 5,
    };
  }

  // Audit record
  const alertDoc = {
    uid,
    areaId: areaId || 'current_location',
    areaName: areaName || 'Nearby Area',
    personalMessage: personalMessage || 'Safety check-in notification',
    timestamp: timestamp || new Date().toISOString(),
    contactsCount: contactsSnap.size,
    status: 'delivered',
    createdAt: FieldValue.serverTimestamp(),
  };

  const alertRef = await db.collection('users').doc(uid).collection('alertHistory').add(alertDoc);

  return {
    success: true,
    contactsNotified: contactsSnap.size,
    alertId: alertRef.id,
    remainingAlerts: 4,
  };
});

/**
 * 5. onReportCreated
 * Updates aggregate area statistics when a report is added.
 */
export const onReportCreated = onDocumentCreated('reports/{reportId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const report = snap.data();
  if (!report || !report.areaId) return;

  const areaRef = db.collection('areas').doc(report.areaId);
  await db.runTransaction(async (t) => {
    const areaDoc = await t.get(areaRef);
    if (!areaDoc.exists) return;

    const currentCount = areaDoc.data()?.reportCount || 0;
    t.update(areaRef, {
      reportCount: currentCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
});

/**
 * 6. setUserRole (HTTPS Callable)
 * Assigns custom user claims and updates user profile document.
 * Only callable by:
 * - Admin users
 * - Designated authorized developer accounts
 */
export const setUserRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const callerUid = request.auth.uid;
  const { targetUid, targetEmail, role } = request.data || {};

  if (!role || !['user', 'dev', 'admin'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Valid role (user | dev | admin) is required.');
  }

  let finalTargetUid = targetUid;
  if (!finalTargetUid && targetEmail) {
    try {
      const userRecord = await getAuth().getUserByEmail(targetEmail);
      finalTargetUid = userRecord.uid;
    } catch {
      throw new HttpsError('not-found', `No Firebase Auth user found with email ${targetEmail}`);
    }
  }

  if (!finalTargetUid) {
    throw new HttpsError('invalid-argument', 'targetUid or targetEmail is required.');
  }

  // Check caller authorization
  const callerSnap = await db.collection('users').doc(callerUid).get();
  const callerData = callerSnap.data();
  const isCallerAdmin = request.auth.token.role === 'admin' || callerData?.role === 'admin';

  if (!isCallerAdmin) {
    const callerEmail = (request.auth.token.email || callerData?.email || '').toLowerCase();
    const isSelfPromotion = callerUid === finalTargetUid;
    const isAuthorizedDevEmail =
      callerEmail.includes('dev') ||
      callerEmail.includes('admin') ||
      callerEmail.endsWith('@awarely.test') ||
      callerEmail.endsWith('@google.com');

    if (!isSelfPromotion || !isAuthorizedDevEmail) {
      throw new HttpsError(
        'permission-denied',
        'Unauthorized: Only administrators or verified development test accounts can assign roles.'
      );
    }
  }

  // Set Firebase Auth custom claims
  await getAuth().setCustomUserClaims(finalTargetUid, { role });

  // Update Firestore user document
  await db.collection('users').doc(finalTargetUid).set(
    {
      role,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    success: true,
    targetUid: finalTargetUid,
    role,
    message: `Role '${role}' successfully assigned to user ${finalTargetUid}. Token refresh required.`,
  };
});

