import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
import Fuse from 'fuse.js';
import axios from 'axios';

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
    threshold: 0.55, // Lower = more strict matching
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
    // Get user's API keys from Firestore
    const db = admin.firestore();
    const apiKeysDoc = await db.collection('userApiKeys').doc(userId).get();
    const apiKeys = apiKeysDoc.data();
    const youtubeApiKey = apiKeys?.youtubeApiKey || functions.config().youtube?.api_key;
    
    if (!youtubeApiKey) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'YouTube API key not configured. Please add your API key in Settings.'
      );
    }

    // Fetch playlist items
    const playlistResponse = await youtube.playlistItems.list({
      key: youtubeApiKey,
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

    // Create playlist document (db already initialized above)
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

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Search Discogs API for physical releases
 */
async function searchDiscogs(
  artist: string,
  title: string,
  apiKey?: string,
  apiSecret?: string
): Promise<{
  url: string | null;
  price: string | null;
  condition: string | null;
} | null> {
  try {
    const searchQuery = `${artist} ${title}`.trim();
    const baseUrl = 'https://api.discogs.com';
    
    // Search for releases
    const searchResponse = await retryWithBackoff(async () => {
      const response = await axios.get(`${baseUrl}/database/search`, {
        params: {
          q: searchQuery,
          type: 'release',
          per_page: 5,
        },
        headers: {
          'User-Agent': 'CrateDigger/1.0',
          ...(apiKey && apiSecret ? {
            'Authorization': `Discogs key=${apiKey}, secret=${apiSecret}`
          } : {}),
        },
      });
      return response;
    });

    const results = searchResponse.data.results;
    if (!results || results.length === 0) {
      return null;
    }

    // Get the first result's release details
    const releaseId = results[0].id;
    const releaseUrl = `https://www.discogs.com/release/${releaseId}`;

    // Try to get marketplace listings
    try {
      const marketplaceResponse = await retryWithBackoff(async () => {
        const response = await axios.get(`${baseUrl}/marketplace/listings/${releaseId}`, {
          headers: {
            'User-Agent': 'CrateDigger/1.0',
            ...(apiKey && apiSecret ? {
              'Authorization': `Discogs key=${apiKey}, secret=${apiSecret}`
            } : {}),
          },
        });
        return response;
      });

      const listings = marketplaceResponse.data.listings || [];
      
      // Find cheapest VG or Mint condition
      const preferredConditions = ['Mint (M)', 'Near Mint (NM or M-)', 'Very Good Plus (VG+)', 'Very Good (VG)'];
      let bestListing: any = null;
      let bestPrice: number = Infinity;

      for (const condition of preferredConditions) {
        const listing = listings.find((l: any) => 
          l.condition === condition && l.price && parseFloat(l.price.value) > 0
        );
        if (listing && parseFloat(listing.price.value) < bestPrice) {
          bestListing = listing;
          bestPrice = parseFloat(listing.price.value);
        }
      }

      // Fallback to any available listing
      if (!bestListing && listings.length > 0) {
        const availableListings = listings.filter((l: any) => l.price && parseFloat(l.price.value) > 0);
        if (availableListings.length > 0) {
          bestListing = availableListings.sort((a: any, b: any) => 
            parseFloat(a.price.value) - parseFloat(b.price.value)
          )[0];
        }
      }

      if (bestListing) {
        return {
          url: releaseUrl,
          price: `${bestListing.price.value} ${bestListing.price.currency}`,
          condition: bestListing.condition,
        };
      }

      return {
        url: releaseUrl,
        price: null,
        condition: null,
      };
    } catch (error) {
      // If marketplace API fails, return release URL without price
      console.warn('Discogs marketplace API failed, returning release URL only:', error);
      return {
        url: releaseUrl,
        price: null,
        condition: null,
      };
    }
  } catch (error) {
    console.error('Discogs search failed:', error);
    return null;
  }
}

/**
 * Search Beatport (placeholder - would require scraping)
 */
async function searchBeatport(
  artist: string,
  title: string
): Promise<{
  url: string | null;
  price: string | null;
  format: string | null;
  available: boolean;
} | null> {
  try {
    // Beatport doesn't have a public API, so we'd need to scrape
    // For now, return a search URL
    const searchQuery = encodeURIComponent(`${artist} ${title}`);
    const searchUrl = `https://www.beatport.com/search?q=${searchQuery}`;
    
    // In a real implementation, we would:
    // 1. Scrape the search results page
    // 2. Find the matching track
    // 3. Check for lossless formats (WAV, FLAC)
    // 4. Extract price
    
    return {
      url: searchUrl,
      price: null,
      format: null,
      available: false, // Would be determined by scraping
    };
  } catch (error) {
    console.error('Beatport search failed:', error);
    return null;
  }
}

/**
 * Search Bandcamp (placeholder - would require scraping)
 */
async function searchBandcamp(
  artist: string,
  title: string
): Promise<{
  url: string | null;
  price: string | null;
  format: string | null;
  available: boolean;
} | null> {
  try {
    // Bandcamp doesn't have a public API, so we'd need to scrape
    const searchQuery = encodeURIComponent(`${artist} ${title}`);
    const searchUrl = `https://bandcamp.com/search?q=${searchQuery}`;
    
    // In a real implementation, we would:
    // 1. Scrape the search results
    // 2. Find the matching track/album
    // 3. Check for lossless formats (WAV, FLAC, AIFF)
    // 4. Extract price
    
    return {
      url: searchUrl,
      price: null,
      format: null,
      available: false, // Would be determined by scraping
    };
  } catch (error) {
    console.error('Bandcamp search failed:', error);
    return null;
  }
}

/**
 * Search Juno Download (placeholder - would require scraping)
 */
async function searchJuno(
  artist: string,
  title: string
): Promise<{
  url: string | null;
  price: string | null;
  format: string | null;
  available: boolean;
} | null> {
  try {
    // Juno Download doesn't have a public API
    const searchQuery = encodeURIComponent(`${artist} ${title}`);
    const searchUrl = `https://www.junodownload.com/search/?q[all][]=${searchQuery}`;
    
    // In a real implementation, we would scrape the results
    
    return {
      url: searchUrl,
      price: null,
      format: null,
      available: false,
    };
  } catch (error) {
    console.error('Juno search failed:', error);
    return null;
  }
}

/**
 * Cloud Function to search marketplaces for a track
 */
export const searchMarketplace = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to search marketplaces'
    );
  }

  const { artist, title, remix, userId, processedTrackId } = data;

  if (!artist || !title || typeof artist !== 'string' || typeof title !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Artist and title are required'
    );
  }

  // Verify userId matches authenticated user
  if (userId !== context.auth.uid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User ID does not match authenticated user'
    );
  }

  try {
    const db = admin.firestore();
    const searchQuery = remix ? `${artist} ${title} ${remix}` : `${artist} ${title}`;
    
    // Get user's API keys from Firestore
    const apiKeysDoc = await db.collection('userApiKeys').doc(userId).get();
    const apiKeys = apiKeysDoc.data();
    const discogsKey = apiKeys?.discogsApiKey || functions.config().discogs?.api_key;
    const discogsSecret = apiKeys?.discogsApiSecret || functions.config().discogs?.api_secret;

    // Search all marketplaces in parallel
    const [discogsResult, beatportResult, bandcampResult, junoResult] = await Promise.allSettled([
      searchDiscogs(artist, title, discogsKey, discogsSecret),
      searchBeatport(artist, title),
      searchBandcamp(artist, title),
      searchJuno(artist, title),
    ]);

    // Build marketplace results array
    const marketplaceResults: any[] = [];

    if (discogsResult.status === 'fulfilled' && discogsResult.value) {
      marketplaceResults.push({
        store: 'discogs',
        url: discogsResult.value.url,
        price: discogsResult.value.price,
        format: null, // Physical releases don't have digital formats
        available: discogsResult.value.price !== null,
      });
    }

    if (beatportResult.status === 'fulfilled' && beatportResult.value) {
      marketplaceResults.push({
        store: 'beatport',
        url: beatportResult.value.url,
        price: beatportResult.value.price,
        format: beatportResult.value.format,
        available: beatportResult.value.available,
      });
    }

    if (bandcampResult.status === 'fulfilled' && bandcampResult.value) {
      marketplaceResults.push({
        store: 'bandcamp',
        url: bandcampResult.value.url,
        price: bandcampResult.value.price,
        format: bandcampResult.value.format,
        available: bandcampResult.value.available,
      });
    }

    if (junoResult.status === 'fulfilled' && junoResult.value) {
      marketplaceResults.push({
        store: 'juno',
        url: junoResult.value.url,
        price: junoResult.value.price,
        format: junoResult.value.format,
        available: junoResult.value.available,
      });
    }

    // Update ProcessedTrack document if provided
    if (processedTrackId) {
      const processedTrackRef = db.collection('processedTracks').doc(processedTrackId);
      await processedTrackRef.update({
        marketplaceResults,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return {
      success: true,
      marketplaceResults,
      searched: searchQuery,
    };
  } catch (error: any) {
    console.error('Error searching marketplace:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to search marketplace'
    );
  }
});

