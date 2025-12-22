import { 
  writeBatch, 
  collection, 
  doc, 
  setDoc,
  serverTimestamp,
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
 * Upload tracks to Firestore in batches
 * Returns the number of tracks successfully uploaded
 */
export async function uploadTracksToFirestore(
  tracks: PreTrack[],
  onProgress?: (uploaded: number, total: number) => void
): Promise<{ success: number; failed: number; errors: Error[] }> {
  if (tracks.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: Error[] = [];

  // Process in batches of 500 (Firestore limit)
  for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchTracks = tracks.slice(i, i + BATCH_SIZE);

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
        onProgress(successCount, tracks.length);
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

  return { success: successCount, failed: failedCount, errors };
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

