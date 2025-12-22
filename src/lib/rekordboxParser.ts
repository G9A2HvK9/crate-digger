import { XMLParser } from 'fast-xml-parser';
import type { Track } from '../types/firestore';

/**
 * Track data before upload (without createdAt timestamp)
 */
type PreTrack = Omit<Track, 'createdAt'>;

/**
 * Rekordbox XML structure (simplified)
 * The XML contains a COLLECTION with TRACK elements
 */
interface RekordboxTrack {
  Name?: string;
  Artist?: string;
  Album?: string;
  Location?: string;
  Kind?: string; // Format: MP3, WAV, etc.
  // Remix info might be in Name or Artist field
}

interface RekordboxCollection {
  COLLECTION?: {
    TRACK?: RekordboxTrack | RekordboxTrack[];
  };
}

/**
 * Normalize a string for searching
 * - Convert to lowercase
 * - Remove punctuation
 * - Normalize whitespace
 */
export function createSearchableString(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract remix information from track name or artist
 * Looks for patterns like "(Remix)", "[Remix]", " - Remix", etc.
 */
function extractRemix(name: string, artist: string): string | null {
  const combined = `${name} ${artist}`.toLowerCase();
  
  // Common remix patterns
  const remixPatterns = [
    /\(([^)]+)\s+remix\)/i,
    /\[([^\]]+)\s+remix\]/i,
    /\s+-\s+([^-]+)\s+remix/i,
    /\(remix\s+by\s+([^)]+)\)/i,
  ];

  for (const pattern of remixPatterns) {
    const match = combined.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Parse Rekordbox XML file and extract track information
 * Returns tracks without createdAt (will be set by serverTimestamp during upload)
 */
export function parseRekordboxXML(xmlContent: string, userId: string): PreTrack[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  try {
    const parsed = parser.parse(xmlContent) as RekordboxCollection;
    const collection = parsed.COLLECTION;
    
    if (!collection || !collection.TRACK) {
      throw new Error('No tracks found in Rekordbox XML');
    }

    // Handle both single track and array of tracks
    const tracks = Array.isArray(collection.TRACK) 
      ? collection.TRACK 
      : [collection.TRACK];

    const parsedTracks: PreTrack[] = [];

    for (const track of tracks) {
      // Skip if essential fields are missing
      if (!track.Name && !track.Artist) {
        continue;
      }

      const artist = track.Artist || 'Unknown Artist';
      const title = track.Name || 'Unknown Title';
      const format = extractFormat(track.Kind || track.Location || '');
      const remix = extractRemix(title, artist);

      // Create searchable string from artist + title + remix
      const searchableParts = [artist, title];
      if (remix) {
        searchableParts.push(remix);
      }
      const searchableString = createSearchableString(searchableParts.join(' '));

      // createdAt will be set by serverTimestamp() during upload
      parsedTracks.push({
        userId,
        artist,
        title,
        remix,
        format,
        searchableString,
      });
    }

    return parsedTracks;
  } catch (error) {
    throw new Error(`Failed to parse Rekordbox XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract format from file path or kind
 */
function extractFormat(kindOrLocation: string): string {
  const lower = kindOrLocation.toLowerCase();
  
  if (lower.includes('wav')) return 'wav';
  if (lower.includes('flac')) return 'flac';
  if (lower.includes('aiff')) return 'aiff';
  if (lower.includes('mp3')) return 'mp3';
  
  // Default to mp3 if unknown
  return 'mp3';
}

