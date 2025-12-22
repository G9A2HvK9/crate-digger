/**
 * Firebase Configuration
 * 
 * This file initializes Firebase services (Authentication, Firestore, etc.)
 * Replace the placeholder values with your actual Firebase project configuration.
 * 
 * To get your Firebase config:
 * 1. Go to Firebase Console: https://console.firebase.google.com
 * 2. Select your project
 * 3. Go to Project Settings > General
 * 4. Scroll down to "Your apps" and copy the config object
 */

import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

export default app;

