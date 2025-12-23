import { Timestamp } from 'firebase/firestore';

/**
 * Firestore data models for CrateDigger
 */

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  handle: string; // Unique username
  approved: boolean; // Admin approval status
  isAdmin: boolean; // Admin role
  lastLibrarySync: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserApiKeys {
  userId: string;
  youtubeApiKey: string | null;
  discogsApiKey: string | null;
  discogsApiSecret: string | null;
  updatedAt: Timestamp;
}

export interface Track {
  userId: string;
  artist: string;
  title: string;
  remix: string | null;
  format: 'mp3' | 'wav' | 'flac' | 'aiff' | string;
  searchableString: string; // Lowercase, normalized for searching
  createdAt: Timestamp;
}

export interface Playlist {
  userId: string;
  youtubeUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  createdAt: Timestamp;
  processedAt: Timestamp | null;
}

export interface MarketplaceResult {
  store: 'beatport' | 'bandcamp' | 'juno' | 'discogs' | string;
  url: string;
  price: string | null;
  format: 'WAV' | 'FLAC' | 'AIFF' | 'MP3' | string | null;
  available: boolean;
}

export interface ProcessedTrack {
  id?: string; // Document ID from Firestore
  userId: string;
  playlistId: string;
  youtubeVideoId: string;
  youtubeTitle: string;
  detectedArtist: string | null;
  detectedTitle: string | null;
  detectedRemix: string | null;
  confidenceScore: number; // 0-100
  ownedStatus: boolean;
  ownedTrackId: string | null; // Reference to Track document
  marketplaceResults: MarketplaceResult[];
  manualCorrections: Array<{
    field: 'artist' | 'title' | 'remix';
    oldValue: string | null;
    newValue: string | null;
    correctedAt: Timestamp;
  }>;
  status: 'pending' | 'processing' | 'matched' | 'completed' | 'error';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

