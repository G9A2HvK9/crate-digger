import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
import Fuse from 'fuse.js';

admin.initializeApp();

const youtube = google.youtube('v3');

/**
 * Extract YouTube playlist ID from URL
 */
function extractPlaylistId(url: string): string | null {
  const patterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/,
    /\/playlist\?list=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract artist, title, and remix from YouTube video title using NLP
 */
function extractTrackInfo(title: string, description?: string): {
  artist: string | null;
  trackTitle: string | null;
  remix: string | null;
} {
  // Common patterns in YouTube titles
  const patterns = [
    // "ARTIST - TITLE [Official Video]"
    /^([^-]+?)\s*-\s*([^[(\n]+?)(?:\s*\[.*?\])?$/i,
    // "TITLE (Remix) by ARTIST"
    /^(.+?)\s*\(([^)]+)\s*remix\)(?:\s*by\s*(.+?))?$/i,
    // "ARTIST - TITLE (Remix)"
    /^([^-]+?)\s*-\s*(.+?)\s*\(([^)]+)\s*remix\)$/i,
    // "TITLE - ARTIST"
    /^(.+?)\s*-\s*(.+?)$/,
  ];

  let artist: string | null = null;
  let trackTitle: string | null = null;
  let remix: string | null = null;

  // Try patterns in order
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      if (pattern.source.includes('remix')) {
        // Remix pattern
        if (match[1] && match[2]) {
          trackTitle = match[1].trim();
          remix = match[2].trim();
          artist = match[3]?.trim() || null;
        }
      } else if (match[1] && match[2]) {
        // Standard pattern
        artist = match[1].trim();
        trackTitle = match[2].trim();
      }
      break;
    }
  }

  // Fallback: if no pattern matched, try to extract from description
  if (!artist && !trackTitle && description) {
    // Look for common patterns in description
    const descPattern = /(?:artist|by):\s*(.+?)(?:\n|$)/i;
    const descMatch = description.match(descPattern);
    if (descMatch) {
      artist = descMatch[1].trim();
      trackTitle = title.split(/[-\[]/)[0].trim();
    }
  }

  // Final fallback: use title as track title
  if (!trackTitle) {
    trackTitle = title.trim();
  }

  return { artist, trackTitle, remix };
}

/**
 * Create searchable string (same logic as frontend)
 */
function createSearchableString(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fuzzy match track against user's library
 */
function fuzzyMatchTrack(
  detectedArtist: string | null,
  detectedTitle: string | null,
  userTracks: Array<{ searchableString: string; id: string }>
): { matchId: string | null; confidence: number } {
  if (!detectedArtist || !detectedTitle) {
    return { matchId: null, confidence: 0 };
  }

  const searchString = createSearchableString(`${detectedArtist} ${detectedTitle}`);

  const fuse = new Fuse(userTracks, {
    keys: ['searchableString'],
    threshold: 0.3, // Lower = more strict matching
    includeScore: true,
  });

  const results = fuse.search(searchString);

  if (results.length > 0 && results[0].score !== undefined) {
    // Convert score (0-1, lower is better) to confidence (0-100, higher is better)
    const confidence = Math.round((1 - results[0].score) * 100);
    return {
      matchId: results[0].item.id,
      confidence: Math.max(0, confidence),
    };
  }

  return { matchId: null, confidence: 0 };
}

/**
 * Cloud Function to process YouTube playlist
 */
export const processPlaylist = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to process playlists'
    );
  }

  const { url, userId } = data;

  if (!url || typeof url !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'YouTube playlist URL is required'
    );
 }

  // Verify userId matches authenticated user
  if (userId !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User ID does not match authenticated user'
    );
  }

  const playlistId = extractPlaylistId(url);
  if (!playlistId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid YouTube playlist URL'
    );
  }

  try {
    // Get YouTube API key from environment (set in Firebase Console)
    const apiKey = functions.config().youtube?.api_key;
    if (!apiKey) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'YouTube API key not configured'
      );
    }

    // Fetch playlist items
    const playlistResponse = await youtube.playlistItems.list({
      key: apiKey,
      part: ['snippet'],
      playlistId,
      maxResults: 50, // YouTube API limit per request
    });

    const items = playlistResponse.data.items || [];
    if (items.length === 0) {
      throw new functions.https.HttpsError(
        'not-found',
        'Playlist is empty or not accessible'
      );
    }

    // Create playlist document
    const db = admin.firestore();
    const playlistRef = db.collection('playlists').doc();
    await playlistRef.set({
      userId,
      youtubeUrl: url,
      status: 'processing',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: null,
    });

    // Fetch user's tracks for matching
    const tracksSnapshot = await db
      .collection('tracks')
      .where('userId', '==', userId)
      .select('searchableString')
      .get();

    const userTracks = tracksSnapshot.docs.map((doc) => ({
      searchableString: doc.data().searchableString,
      id: doc.id,
    }));

    // Process each video
    const processedTracks: any[] = [];

    for (const item of items) {
      const videoId = item.snippet?.resourceId?.videoId;
      const videoTitle = item.snippet?.title || '';
      const videoDescription = item.snippet?.description || '';

      if (!videoId) continue;

      // Extract track info using NLP
      const trackInfo = extractTrackInfo(videoTitle, videoDescription);

      // Fuzzy match against user's library
      const match = fuzzyMatchTrack(
        trackInfo.artist,
        trackInfo.trackTitle,
        userTracks
      );

      // Create ProcessedTrack document
      const processedTrackRef = db.collection('processedTracks').doc();
      await processedTrackRef.set({
        userId,
        playlistId: playlistRef.id,
        youtubeVideoId: videoId,
        youtubeTitle: videoTitle,
        detectedArtist: trackInfo.artist,
        detectedTitle: trackInfo.trackTitle,
        detectedRemix: trackInfo.remix,
        confidenceScore: match.confidence,
        ownedStatus: match.matchId !== null,
        ownedTrackId: match.matchId,
        marketplaceResults: [],
        manualCorrections: [],
        status: match.matchId ? 'matched' : 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      processedTracks.push({
        id: processedTrackRef.id,
        youtubeTitle: videoTitle,
        detectedArtist: trackInfo.artist,
        detectedTitle: trackInfo.trackTitle,
        confidence: match.confidence,
        owned: match.matchId !== null,
      });
    }

    // Update playlist status
    await playlistRef.update({
      status: 'completed',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      playlistId: playlistRef.id,
      tracksProcessed: processedTracks.length,
      tracks: processedTracks,
    };
  } catch (error: any) {
    console.error('Error processing playlist:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to process playlist'
    );
  }
});

