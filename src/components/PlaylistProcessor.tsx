import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase-config';
import { cn } from '../lib/utils';

interface ProcessingState {
  status: 'idle' | 'processing' | 'success' | 'error';
  message: string;
  playlistId: string | null;
  tracksProcessed: number;
}

export function PlaylistProcessor() {
  const [user] = useAuthState(auth);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'idle',
    message: '',
    playlistId: null,
    tracksProcessed: 0,
  });

  const handleProcess = async () => {
    if (!user) {
      setProcessingState({
        status: 'error',
        message: 'You must be logged in to process playlists',
        playlistId: null,
        tracksProcessed: 0,
      });
      return;
    }

    if (!playlistUrl.trim()) {
      setProcessingState({
        status: 'error',
        message: 'Please enter a YouTube playlist URL',
        playlistId: null,
        tracksProcessed: 0,
      });
      return;
    }

    // Validate YouTube playlist URL
    if (!playlistUrl.includes('youtube.com') && !playlistUrl.includes('youtu.be')) {
      setProcessingState({
        status: 'error',
        message: 'Please enter a valid YouTube playlist URL',
        playlistId: null,
        tracksProcessed: 0,
      });
      return;
    }

    try {
      setProcessingState({
        status: 'processing',
        message: 'Processing playlist... This may take a moment.',
        playlistId: null,
        tracksProcessed: 0,
      });

      const processPlaylist = httpsCallable(functions, 'processPlaylist');
      const result = await processPlaylist({
        url: playlistUrl.trim(),
        userId: user.uid,
      });

      const data = result.data as {
        success: boolean;
        playlistId: string;
        tracksProcessed: number;
        tracks: any[];
      };

      if (data.success) {
        setProcessingState({
          status: 'success',
          message: `Successfully processed ${data.tracksProcessed} tracks!`,
          playlistId: data.playlistId,
          tracksProcessed: data.tracksProcessed,
        });
        setPlaylistUrl(''); // Clear input on success
      } else {
        setProcessingState({
          status: 'error',
          message: 'Failed to process playlist',
          playlistId: null,
          tracksProcessed: 0,
        });
      }
    } catch (error: any) {
      console.error('Error processing playlist:', error);
      
      // Check for common error cases
      let errorMessage = 'An error occurred while processing the playlist';
      
      // Check for 404 or function not found (Cloud Functions not deployed)
      if (
        error.code === 'functions/not-found' || 
        error.code === 'functions/unavailable' ||
        error.code === 'internal' ||
        (error.message && error.message.includes('404')) ||
        (error.message && error.message.includes('not found'))
      ) {
        errorMessage = 'Cloud Functions are not deployed. Please upgrade to Firebase Blaze plan and deploy Cloud Functions using: firebase deploy --only functions';
      } else if (error.code === 'functions/failed-precondition') {
        errorMessage = error.message || 'YouTube API key not configured. Please add your API key in Settings.';
      } else if (error.code === 'functions/unauthenticated') {
        errorMessage = 'You must be logged in to process playlists.';
      } else if (error.code === 'functions/permission-denied') {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setProcessingState({
        status: 'error',
        message: errorMessage,
        playlistId: null,
        tracksProcessed: 0,
      });
    }
  };

  if (!user) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-lg p-6">
        <p className="text-textMuted">Please log in to process YouTube playlists.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-surfaceLight rounded-lg p-6">
      <h2 className="text-2xl font-bold text-text mb-4">Process YouTube Playlist</h2>
      <p className="text-textMuted mb-6 text-sm">
        Paste a YouTube playlist URL to extract track information and match against your library.
      </p>
      
      <div className="mb-4 p-3 bg-background border border-surfaceLight rounded text-sm">
        <p className="text-textMuted">
          <strong className="text-text">Note:</strong> This feature requires Cloud Functions to be deployed. 
          If you see an error, make sure you've upgraded to the Firebase Blaze plan and deployed the functions.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="playlist-url" className="block text-sm font-medium text-text mb-2">
            YouTube Playlist URL
          </label>
          <input
            id="playlist-url"
            type="text"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="https://www.youtube.com/playlist?list=..."
            disabled={processingState.status === 'processing'}
            className={cn(
              'w-full px-4 py-2 bg-background border border-surfaceLight rounded',
              'text-text placeholder-textMuted',
              'focus:outline-none focus:border-accent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'font-mono text-sm'
            )}
          />
        </div>

        <button
          onClick={handleProcess}
          disabled={processingState.status === 'processing' || !playlistUrl.trim()}
          className={cn(
            'px-6 py-2 rounded transition-colors',
            'bg-accent hover:bg-accentHover text-background font-semibold',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {processingState.status === 'processing' ? 'Processing...' : 'Process Playlist'}
        </button>

        {processingState.status === 'processing' && (
          <div className="p-4 bg-background border border-surfaceLight rounded">
            <div className="flex items-center gap-3">
              <div className="animate-spin text-accent">⚙️</div>
              <p className="text-text text-sm">{processingState.message}</p>
            </div>
          </div>
        )}

        {processingState.status === 'success' && (
          <div className="p-4 bg-background border border-surfaceLight rounded">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-accent">✅</div>
              <p className="text-text font-semibold">{processingState.message}</p>
            </div>
            {processingState.playlistId && (
              <p className="text-textMuted text-xs">
                Playlist ID: <code className="font-mono text-accent">{processingState.playlistId}</code>
              </p>
            )}
          </div>
        )}

        {processingState.status === 'error' && (
          <div className="p-4 bg-background border border-red-500/50 rounded">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-red-400">❌</div>
              <p className="text-text text-red-400">{processingState.message}</p>
            </div>
            <button
              onClick={() => {
                setProcessingState({
                  status: 'idle',
                  message: '',
                  playlistId: null,
                  tracksProcessed: 0,
                });
              }}
              className="mt-2 text-sm text-accent hover:text-accentHover"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

