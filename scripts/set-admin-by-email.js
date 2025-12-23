/**
 * Script to set a user as admin by email
 * 
 * Usage:
 * node scripts/set-admin-by-email.js YOUR_EMAIL
 * 
 * This will find the user by email and set them as admin.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
// You can either use a service account key or initialize with default credentials
// For local development, you can use: firebase login and then use applicationDefault
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
} catch (error) {
  console.error('Error initializing Firebase Admin. Make sure you have:');
  console.error('1. Run: firebase login');
  console.error('2. Or provide serviceAccountKey.json');
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address');
  console.log('Usage: node scripts/set-admin-by-email.js YOUR_EMAIL');
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

async function setAdminByEmail() {
  try {
    // Find user by email
    const user = await auth.getUserByEmail(email);
    console.log(`Found user: ${user.email} (UID: ${user.uid})`);
    
    // Update user document in Firestore
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      isAdmin: true,
      approved: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    
    console.log(`✅ User ${email} has been set as admin and approved`);
    console.log(`You can now log in and access the Admin Panel`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User with email ${email} not found.`);
      console.error('Make sure the user has signed up first.');
    } else {
      console.error('Error setting admin:', error);
    }
    process.exit(1);
  }
}

setAdminByEmail().then(() => process.exit(0));

