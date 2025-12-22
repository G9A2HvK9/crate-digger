import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase-config';
import { cn } from '../lib/utils';
import type { MarketplaceResult } from '../types/firestore';

interface MarketplaceResultsProps {
  artist: string | null;
  title: string | null;
  remix: string | null;
  processedTrackId?: string;
  existingResults?: MarketplaceResult[];
}

export function MarketplaceResults({
  artist,
  title,
  remix,
  processedTrackId,
  existingResults = [],
}: MarketplaceResultsProps) {
  const [user] = useAuthState(auth);
  const [results, setResults] = useState<MarketplaceResult[]>(existingResults);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!user || !artist || !title) {
      setError('Artist and title are required');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchMarketplace = httpsCallable(functions, 'searchMarketplace');
      const result = await searchMarketplace({
        artist,
        title,
        remix,
        userId: user.uid,
        processedTrackId,
      });

      const data = result.data as {
        success: boolean;
        marketplaceResults: MarketplaceResult[];
      };

      if (data.success) {
        setResults(data.marketplaceResults);
      } else {
        setError('Failed to search marketplaces');
      }
    } catch (err: any) {
      console.error('Error searching marketplace:', err);
      setError(err.message || 'An error occurred while searching marketplaces');
    } finally {
      setIsSearching(false);
    }
  };

  if (!artist || !title) {
    return null;
  }

  const hasResults = results.length > 0;
  const storeNames: Record<string, string> = {
    discogs: 'Discogs',
    beatport: 'Beatport',
    bandcamp: 'Bandcamp',
    juno: 'Juno Download',
  };

  return (
    <div className="bg-surface border border-surfaceLight rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-text">Marketplace Results</h3>
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className={cn(
            'px-4 py-1.5 text-sm rounded transition-colors',
            'bg-accent hover:bg-accentHover text-background font-medium',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSearching ? 'Searching...' : 'Scan Markets'}
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {hasResults ? (
        <div className="space-y-2">
          {results.map((result, index) => (
            <div
              key={index}
              className="p-3 bg-background border border-surfaceLight rounded flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-text">
                    {storeNames[result.store] || result.store}
                  </span>
                  {result.available && (
                    <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded">
                      Available
                    </span>
                  )}
                  {result.format && (
                    <span className="text-xs text-textMuted font-mono">
                      {result.format}
                    </span>
                  )}
                </div>
                {result.price && (
                  <p className="text-sm text-textMuted">{result.price}</p>
                )}
              </div>
              {result.url && (
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'ml-4 px-3 py-1.5 text-sm rounded transition-colors',
                    'bg-accent hover:bg-accentHover text-background font-medium'
                  )}
                >
                  View
                </a>
              )}
            </div>
          ))}
        </div>
      ) : !isSearching && (
        <p className="text-textMuted text-sm">
          No marketplace results yet. Click "Scan Markets" to search.
        </p>
      )}

      {isSearching && (
        <div className="flex items-center gap-2 text-textMuted text-sm">
          <div className="animate-spin">⚙️</div>
          <span>Searching marketplaces...</span>
        </div>
      )}
    </div>
  );
}

