import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase-config';
import type { Track } from '../types/firestore';

type TrackWithId = Track & { id?: string };

export function LibraryView() {
  const [user] = useAuthState(auth);
  const [tracks, setTracks] = useState<TrackWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'tracks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const libraryTracks: TrackWithId[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as TrackWithId));
        setTracks(libraryTracks);
        setLoading(false);
        setError(null);
      },
      (err: any) => {
        console.error('Error fetching library tracks:', err);
        if (err.code === 'failed-precondition' && err.message?.includes('index')) {
          setError('Firestore index required. The index is being created automatically. Please wait a few minutes and refresh the page.');
        } else {
          setError('Failed to load library tracks: ' + (err.message || 'Unknown error'));
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-lg p-6">
        <p className="text-textMuted">Please log in to view your library.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-lg p-6">
        <div className="flex items-center gap-3 text-textMuted">
          <div className="animate-spin">⚙️</div>
          <span>Loading library...</span>
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
        <h2 className="text-2xl font-bold text-text">Your Library</h2>
        <div className="text-sm text-textMuted">
          {tracks.length} tracks
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-textMuted mb-4">No tracks in your library yet.</p>
          <p className="text-textMuted text-sm">Upload your Rekordbox XML file to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-surfaceLight">
                <th className="px-3 py-2 text-left text-sm font-semibold text-textMuted bg-background sticky top-0">
                  Artist
                </th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-textMuted bg-background sticky top-0">
                  Title
                </th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-textMuted bg-background sticky top-0">
                  Remix
                </th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-textMuted bg-background sticky top-0">
                  Format
                </th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => (
                <tr key={track.id || Math.random()} className="border-b border-surfaceLight hover:bg-background/50">
                  <td className="px-3 py-2 font-mono text-sm text-text">{track.artist}</td>
                  <td className="px-3 py-2 font-mono text-sm text-text">{track.title}</td>
                  <td className="px-3 py-2 font-mono text-sm text-textMuted">{track.remix || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-textMuted uppercase">{track.format}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

