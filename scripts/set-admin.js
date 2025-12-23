/**
 * Script to set a user as admin
 * 
 * Usage:
 * 1. Get your user UID from Firebase Console > Authentication
 * 2. Run: node scripts/set-admin.js YOUR_USER_UID
 * 
 * Or set it manually in Firestore:
 * - Go to Firestore Console
 * - Find your user document in the 'users' collection
 * - Set isAdmin: true and approved: true
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You'll need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const userId = process.argv[2];

if (!userId) {
  console.error('Please provide a user ID');
  console.log('Usage: node scripts/set-admin.js USER_ID');
  process.exit(1);
}

const db = admin.firestore();

async function setAdmin() {
  try {
    await db.collection('users').doc(userId).update({
      isAdmin: true,
      approved: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ User ${userId} has been set as admin`);
  } catch (error) {
    console.error('Error setting admin:', error);
    process.exit(1);
  }
}

setAdmin().then(() => process.exit(0));

