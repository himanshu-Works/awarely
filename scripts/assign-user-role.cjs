/**
 * assign-user-role.cjs — Secure CLI script to assign Firebase custom claims & Firestore role
 * 
 * Usage:
 *   node scripts/assign-user-role.cjs <email-or-uid> <user|dev|admin>
 * 
 * Example:
 *   node scripts/assign-user-role.cjs developer@example.com dev
 */

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const target = process.argv[2];
const newRole = process.argv[3] || 'dev';

if (!target) {
  console.error('Usage: node scripts/assign-user-role.cjs <email-or-uid> [user|dev|admin]');
  process.exit(1);
}

if (!['user', 'dev', 'admin'].includes(newRole)) {
  console.error('Error: Role must be one of: user, dev, admin');
  process.exit(1);
}

try {
  initializeApp({
    projectId: 'awarely-safety',
  });
} catch (e) {
  // Already initialized or fallback
}

const auth = getAuth();
const db = getFirestore();

async function run() {
  let uid = target;

  if (target.includes('@')) {
    console.log(`Looking up user by email: ${target}...`);
    try {
      const userRecord = await auth.getUserByEmail(target);
      uid = userRecord.uid;
      console.log(`Found user UID: ${uid} (${userRecord.email})`);
    } catch (err) {
      console.error(`Error: User with email '${target}' not found in Firebase Auth.`);
      process.exit(1);
    }
  }

  console.log(`Setting Firebase custom claim { role: '${newRole}' } for UID: ${uid}...`);
  await auth.setCustomUserClaims(uid, { role: newRole });

  console.log(`Updating Firestore document users/${uid} with { role: '${newRole}' }...`);
  await db.collection('users').doc(uid).set(
    {
      role: newRole,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`\nSUCCESS! User ${uid} now has role: '${newRole}' in custom claims and Firestore.`);
  console.log(`To see changes immediately in the web app, call refreshProfile() or log in again.\n`);
}

run().catch((err) => {
  console.error('Failed to assign user role:', err);
  process.exit(1);
});
