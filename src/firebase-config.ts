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
import { getFunctions } from 'firebase/functions';
import type { Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyA_kwSMzDmmo61iGajGzidB1Gf8FhDt6RU",
  authDomain: "crate-digger-app.firebaseapp.com",
  projectId: "crate-digger-app",
  storageBucket: "crate-digger-app.firebasestorage.app",
  messagingSenderId: "360221209260",
  appId: "1:360221209260:web:4787c757384839d0e6a509"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app);

export default app;

