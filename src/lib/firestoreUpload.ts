import { 
  writeBatch, 
  collection, 
  doc, 
  setDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import type { Track } from '../types/firestore';
import { db } from '../firebase-config';

/**
 * Track data before upload (without createdAt timestamp)
 */
type PreTrack = Omit<Track, 'createdAt'>;

/**
 * Firestore batch write limit
 */
const BATCH_SIZE = 500;

/**
 * Check for existing tracks and filter out duplicates
 */
async function filterDuplicates(
  userId: string,
  tracks: PreTrack[]
): Promise<{ newTracks: PreTrack[]; duplicates: number }> {
  if (tracks.length === 0) {
    return { newTracks: [], duplicates: 0 };
  }

  // Get all existing searchableStrings for this user
  const existingTracksQuery = query(
    collection(db, 'tracks'),
    where('userId', '==', userId)
  );
  
  const existingSnapshot = await getDocs(existingTracksQuery);
  const existingSearchableStrings = new Set(
    existingSnapshot.docs.map(doc => doc.data().searchableString)
  );

  // Filter out tracks that already exist
  const newTracks: PreTrack[] = [];
  let duplicates = 0;

  for (const track of tracks) {
    if (existingSearchableStrings.has(track.searchableString)) {
      duplicates++;
    } else {
      newTracks.push(track);
      // Add to set to prevent duplicates within the same upload batch
      existingSearchableStrings.add(track.searchableString);
    }
  }

  return { newTracks, duplicates };
}

/**
 * Upload tracks to Firestore in batches with deduplication
 * Returns the number of tracks successfully uploaded
 */
export async function uploadTracksToFirestore(
  tracks: PreTrack[],
  userId: string,
  onProgress?: (uploaded: number, total: number) => void
): Promise<{ success: number; failed: number; duplicates: number; errors: Error[] }> {
  if (tracks.length === 0) {
    return { success: 0, failed: 0, duplicates: 0, errors: [] };
  }

  // Filter out duplicates
  const { newTracks, duplicates } = await filterDuplicates(userId, tracks);

  if (newTracks.length === 0) {
    return { success: 0, failed: 0, duplicates, errors: [] };
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: Error[] = [];

  // Process in batches of 500 (Firestore limit)
  for (let i = 0; i < newTracks.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchTracks = newTracks.slice(i, i + BATCH_SIZE);

    try {
      for (const track of batchTracks) {
        // Create a document reference with auto-generated ID
        const trackRef = doc(collection(db, 'tracks'));
        batch.set(trackRef, {
          ...track,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      successCount += batchTracks.length;
      
      // Report progress
      if (onProgress) {
        onProgress(successCount, newTracks.length);
      }
    } catch (error) {
      // If batch fails, try individual writes
      console.error(`Batch ${i / BATCH_SIZE + 1} failed, attempting individual writes:`, error);
      
      for (const track of batchTracks) {
        try {
          const trackRef = doc(collection(db, 'tracks'));
          await setDoc(trackRef, {
            ...track,
            createdAt: serverTimestamp(),
          });
          successCount++;
          if (onProgress) {
            onProgress(successCount, tracks.length);
          }
        } catch (individualError) {
          failedCount++;
          errors.push(individualError instanceof Error ? individualError : new Error(String(individualError)));
          console.error('Failed to upload individual track:', individualError);
        }
      }
    }
  }

  return { success: successCount, failed: failedCount, duplicates, errors };
}

/**
 * Delete all tracks for a user
 */
export async function deleteUserLibrary(userId: string): Promise<{ deleted: number; errors: Error[] }> {
  const tracksQuery = query(
    collection(db, 'tracks'),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(tracksQuery);
  const errors: Error[] = [];
  let deleted = 0;

  // Delete in batches
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchDocs = docs.slice(i, i + BATCH_SIZE);

    for (const doc of batchDocs) {
      batch.delete(doc.ref);
    }

    try {
      await batch.commit();
      deleted += batchDocs.length;
    } catch (error) {
      console.error('Error deleting batch:', error);
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Update sync timestamp
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        lastLibrarySync: null,
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating sync timestamp:', error);
  }

  return { deleted, errors };
}

/**
 * Update user's lastLibrarySync timestamp
 */
export async function updateLibrarySyncTimestamp(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        lastLibrarySync: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Failed to update library sync timestamp:', error);
    throw error;
  }
}

