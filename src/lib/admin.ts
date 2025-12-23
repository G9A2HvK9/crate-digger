import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import type { User } from '../types/firestore';

/**
 * Check if a user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return false;
    }
    const userData = userDoc.data() as User;
    return userData.isAdmin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if a user is approved
 */
export async function isUserApproved(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return false;
    }
    const userData = userDoc.data() as User;
    // Admins are always approved
    if (userData.isAdmin === true) {
      return true;
    }
    return userData.approved === true;
  } catch (error) {
    console.error('Error checking approval status:', error);
    return false;
  }
}

