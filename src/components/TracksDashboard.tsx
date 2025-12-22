import { useState, useEffect, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { auth, db } from '../firebase-config';
import type { ProcessedTrack } from '../types/firestore';
import { cn } from '../lib/utils';
import { MarketplaceResults } from './MarketplaceResults';

type FilterType = 'all' | 'not-in-library' | 'low-confidence' | 'owned' | 'unmatched';

export function TracksDashboard() {
  const [user] = useAuthState(auth);
  const [tracks, setTracks] = useState<ProcessedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: 'artist' | 'title' } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Real-time Firestore listener
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'processedTracks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const processedTracks: ProcessedTrack[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as ProcessedTrack));
        setTracks(processedTracks);
        setLoading(false);
        setError(null);
      },
      (err: any) => {
        console.error('Error fetching tracks:', err);
        
        // Check if it's a missing index error
        if (err.code === 'failed-precondition' && err.message?.includes('index')) {
          setError('Firestore index required. The index is being created automatically. Please wait a few minutes and refresh the page.');
        } else {
          setError('Failed to load tracks: ' + (err.message || 'Unknown error'));
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Filter and search tracks
  const filteredTracks = useMemo(() => {
    let filtered = [...tracks];

    // Apply filter
    switch (filter) {
      case 'not-in-library':
        filtered = filtered.filter((t) => !t.ownedStatus);
        break;
      case 'low-confidence':
        filtered = filtered.filter((t) => t.confidenceScore < 70);
        break;
      case 'owned':
        filtered = filtered.filter((t) => t.ownedStatus);
        break;
      case 'unmatched':
        filtered = filtered.filter((t) => !t.ownedStatus && t.confidenceScore < 50);
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.detectedArtist?.toLowerCase().includes(query) ||
          t.detectedTitle?.toLowerCase().includes(query) ||
          t.youtubeTitle.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [tracks, filter, searchQuery]);

  // Table columns
  const columns = useMemo<ColumnDef<ProcessedTrack>[]>(
    () => [
      {
        accessorKey: 'youtubeTitle',
        header: 'YouTube Title',
        cell: ({ row }) => (
          <div className="font-mono text-xs text-textMuted max-w-xs truncate" title={row.original.youtubeTitle}>
            {row.original.youtubeTitle}
          </div>
        ),
      },
      {
        accessorKey: 'detectedArtist',
        header: 'Artist',
        cell: ({ row }) => {
          const track = row.original;
          const isEditing = editingCell !== null && editingCell.rowId === track.id && editingCell.field === 'artist';
          
          if (isEditing) {
            return track.id ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSaveEdit(track.id!, 'artist', editValue)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && track.id) handleSaveEdit(track.id, 'artist', editValue);
                  if (e.key === 'Escape') setEditingCell(null);
                }}
                className="px-2 py-1 bg-background border border-accent rounded text-text text-sm font-mono w-full"
                autoFocus
              />
            ) : null;
          }
          
          return (
            <div
              className="font-mono text-sm text-text cursor-pointer hover:text-accent"
              onClick={() => {
                if (track.id) {
                  setEditingCell({ rowId: track.id, field: 'artist' });
                  setEditValue(track.detectedArtist || '');
                }
              }}
            >
              {track.detectedArtist || '—'}
            </div>
          );
        },
      },
      {
        accessorKey: 'detectedTitle',
        header: 'Title',
        cell: ({ row }) => {
          const track = row.original;
          const isEditing = editingCell !== null && editingCell.rowId === track.id && editingCell.field === 'title';
          
          if (isEditing) {
            return track.id ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSaveEdit(track.id!, 'title', editValue)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && track.id) handleSaveEdit(track.id, 'title', editValue);
                  if (e.key === 'Escape') setEditingCell(null);
                }}
                className="px-2 py-1 bg-background border border-accent rounded text-text text-sm font-mono w-full"
                autoFocus
              />
            ) : null;
          }
          
          return (
            <div
              className="font-mono text-sm text-text cursor-pointer hover:text-accent"
              onClick={() => {
                if (track.id) {
                  setEditingCell({ rowId: track.id, field: 'title' });
                  setEditValue(track.detectedTitle || '');
                }
              }}
            >
              {track.detectedTitle || '—'}
            </div>
          );
        },
      },
      {
        accessorKey: 'confidenceScore',
        header: 'Confidence',
        cell: ({ row }) => {
          const score = row.original.confidenceScore;
          const colorClass =
            score >= 80 ? 'text-accent' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
          return (
            <div className={cn('font-mono text-sm font-semibold', colorClass)}>
              {score}%
            </div>
          );
        },
      },
      {
        accessorKey: 'ownedStatus',
        header: 'Owned',
        cell: ({ row }) => (
          <div className="text-center">
            {row.original.ownedStatus ? (
              <span className="text-accent">✓</span>
            ) : (
              <span className="text-textMuted">—</span>
            )}
          </div>
        ),
      },
      {
        id: 'marketplace',
        header: 'Buy Links',
        cell: ({ row }) => {
          const track = row.original;
          return track.id ? (
            <MarketplaceResults
              artist={track.detectedArtist}
              title={track.detectedTitle}
              remix={track.detectedRemix}
              processedTrackId={track.id}
              existingResults={track.marketplaceResults || []}
              compact={true}
            />
          ) : null;
        },
      },
    ],
    [editingCell, editValue]
  );

  const table = useReactTable({
    data: filteredTracks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  const handleSaveEdit = async (trackId: string, field: 'artist' | 'title', newValue: string) => {
    if (!user || !trackId) return;

    try {
      const trackRef = doc(db, 'processedTracks', trackId);
      const track = tracks.find(t => t.id === trackId);
      const oldValue = field === 'artist' 
        ? track?.detectedArtist
        : track?.detectedTitle;

      await updateDoc(trackRef, {
        [`detected${field.charAt(0).toUpperCase() + field.slice(1)}`]: newValue || null,
        manualCorrections: [
          ...(track?.manualCorrections || []),
          {
            field,
            oldValue,
            newValue: newValue || null,
            correctedAt: serverTimestamp(),
          },
        ],
        updatedAt: serverTimestamp(),
      });

      // Trigger re-search of marketplace with corrected data
      // This will be handled by the frontend calling searchMarketplace
      // For now, we just update the document

      setEditingCell(null);
    } catch (error) {
      console.error('Error updating track:', error);
      setError('Failed to update track');
    }
  };

  if (!user) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-lg p-6">
        <p className="text-textMuted">Please log in to view your processed tracks.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-lg p-6">
        <div className="flex items-center gap-3 text-textMuted">
          <div className="animate-spin">⚙️</div>
          <span>Loading tracks...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-lg p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-surfaceLight rounded-lg p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text">Processed Tracks</h2>
          <p className="text-textMuted text-sm mt-1">
            Tracks from processed YouTube playlists. Upload your library and process a playlist to see tracks here.
          </p>
        </div>
        <div className="text-sm text-textMuted">
          {filteredTracks.length} of {tracks.length} tracks
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'not-in-library', 'low-confidence', 'owned', 'unmatched'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-sm rounded transition-colors',
                filter === f
                  ? 'bg-accent text-background font-semibold'
                  : 'bg-background border border-surfaceLight text-text hover:border-accent'
              )}
            >
              {f === 'not-in-library' ? 'Not in Library' : f === 'low-confidence' ? 'Low Confidence' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by artist, title, or YouTube title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-surfaceLight rounded text-text placeholder-textMuted focus:outline-none focus:border-accent font-mono text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-surfaceLight">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left text-sm font-semibold text-textMuted bg-background sticky top-0"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          'flex items-center gap-2',
                          header.column.getCanSort() && 'cursor-pointer hover:text-text'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' ↑',
                          desc: ' ↓',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-textMuted">
                  No tracks found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-surfaceLight hover:bg-background/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

