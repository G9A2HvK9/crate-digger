import { useState, useRef, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase-config';
import { parseRekordboxXML } from '../lib/rekordboxParser';
import { uploadTracksToFirestore, updateLibrarySyncTimestamp } from '../lib/firestoreUpload';
import { cn } from '../lib/utils';

interface UploadState {
  status: 'idle' | 'parsing' | 'uploading' | 'success' | 'error';
  message: string;
  progress: number; // 0-100
  tracksParsed: number;
  tracksUploaded: number;
  tracksTotal: number;
}

export function LibraryUpload() {
  const [user] = useAuthState(auth);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    message: '',
    progress: 0,
    tracksParsed: 0,
    tracksUploaded: 0,
    tracksTotal: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!user) {
      setUploadState({
        status: 'error',
        message: 'You must be logged in to upload your library',
        progress: 0,
        tracksParsed: 0,
        tracksUploaded: 0,
        tracksTotal: 0,
      });
      return;
    }

    if (!file.name.endsWith('.xml')) {
      setUploadState({
        status: 'error',
        message: 'Please upload a valid Rekordbox XML file (.xml)',
        progress: 0,
        tracksParsed: 0,
        tracksUploaded: 0,
        tracksTotal: 0,
      });
      return;
    }

    try {
      // Step 1: Parse XML
      setUploadState(prev => ({ ...prev, status: 'parsing', message: 'Parsing Rekordbox XML...' }));
      
      const fileContent = await file.text();
      const tracks = parseRekordboxXML(fileContent, user.uid);
      
      setUploadState(prev => ({
        ...prev,
        tracksParsed: tracks.length,
        tracksTotal: tracks.length,
        message: `Found ${tracks.length} tracks. Starting upload...`,
      }));

      // Step 2: Upload to Firestore (with deduplication)
      setUploadState(prev => ({ ...prev, status: 'uploading', message: 'Checking for duplicates...' }));
      
      const result = await uploadTracksToFirestore(tracks, user.uid, (uploaded, total) => {
        const progress = Math.round((uploaded / total) * 100);
        setUploadState(prev => ({
          ...prev,
          progress,
          tracksUploaded: uploaded,
          message: `Uploading... ${uploaded} of ${total} tracks`,
        }));
      });

      // Step 3: Update sync timestamp
      await updateLibrarySyncTimestamp(user.uid);

      let message = '';
      if (result.duplicates > 0) {
        message = `Uploaded ${result.success} new tracks. ${result.duplicates} duplicates skipped.`;
      } else {
        message = `Successfully uploaded ${result.success} tracks!`;
      }

      if (result.failed > 0) {
        setUploadState(prev => ({
          ...prev,
          status: 'error',
          message: `${message} ${result.failed} failed.`,
        }));
      } else {
        setUploadState(prev => ({
          ...prev,
          status: 'success',
          message,
          progress: 100,
        }));
      }
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        message: error instanceof Error ? error.message : 'An error occurred during upload',
      }));
    }
  }, [user]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!user) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-lg p-6">
        <p className="text-textMuted">Please log in to upload your Rekordbox library.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-surfaceLight rounded-lg p-6">
      <h2 className="text-2xl font-bold text-text mb-4">Upload Rekordbox Library</h2>
      <p className="text-textMuted mb-6 text-sm">
        Upload your <code className="font-mono text-accent">rekordbox.xml</code> file to sync your music library.
        This file is typically located in your Rekordbox installation directory.
      </p>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-accent bg-background'
            : 'border-surfaceLight hover:border-accent hover:bg-background',
          uploadState.status === 'uploading' || uploadState.status === 'parsing'
            ? 'pointer-events-none opacity-50'
            : ''
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {uploadState.status === 'idle' && (
          <>
            <div className="text-4xl mb-4">📁</div>
            <p className="text-text mb-2">Drag and drop your rekordbox.xml file here</p>
            <p className="text-textMuted text-sm">or click to browse</p>
          </>
        )}

        {uploadState.status === 'parsing' && (
          <>
            <div className="text-4xl mb-4 animate-pulse">⚙️</div>
            <p className="text-text mb-2">{uploadState.message}</p>
            <p className="text-textMuted text-sm">Please wait...</p>
          </>
        )}

        {uploadState.status === 'uploading' && (
          <>
            <div className="text-4xl mb-4">📤</div>
            <p className="text-text mb-4">{uploadState.message}</p>
            <div className="w-full bg-background rounded-full h-2 mb-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <p className="text-textMuted text-xs">
              {uploadState.tracksUploaded} / {uploadState.tracksTotal} tracks
            </p>
          </>
        )}

        {uploadState.status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <p className="text-text mb-2 font-semibold">{uploadState.message}</p>
            <p className="text-textMuted text-sm">
              Your library has been synced successfully.
            </p>
          </>
        )}

        {uploadState.status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <p className="text-text mb-2 text-red-400">{uploadState.message}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUploadState({
                  status: 'idle',
                  message: '',
                  progress: 0,
                  tracksParsed: 0,
                  tracksUploaded: 0,
                  tracksTotal: 0,
                });
              }}
              className="mt-4 px-4 py-2 bg-accent hover:bg-accentHover text-background rounded transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

