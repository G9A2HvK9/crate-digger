import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase-config';
import { Layout } from './components/Layout'
import { Auth } from './components/Auth'
import { Header } from './components/Header'
import { LibraryUpload } from './components/LibraryUpload'
import { PlaylistProcessor } from './components/PlaylistProcessor'
import { TracksDashboard } from './components/TracksDashboard'
import { Settings } from './components/Settings'

function App() {
  const [user] = useAuthState(auth);
  const [showSettings, setShowSettings] = useState(false);

  // Show auth screen if not logged in
  if (!user) {
    return <Auth />;
  }

  return (
    <Layout>
      <Header onSettingsClick={() => setShowSettings(true)} />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {showSettings ? (
          <div>
            <button
              onClick={() => setShowSettings(false)}
              className="mb-4 text-accent hover:text-accentHover"
            >
              ← Back to Dashboard
            </button>
            <Settings />
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-text mb-2">CrateDigger</h1>
              <p className="text-textMuted">A web-based tool for DJs to streamline music acquisition from YouTube playlists</p>
            </div>
            
            <div className="space-y-6">
              <LibraryUpload />
              <PlaylistProcessor />
              <TracksDashboard />
              
              <div className="bg-surface border border-surfaceLight rounded-lg p-6">
                <h2 className="text-xl font-semibold text-text mb-4">Development Status</h2>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-background border border-surfaceLight rounded">
                    <h3 className="font-semibold text-text mb-1">Phase 1: Project Setup ✓</h3>
                    <p className="text-textMuted text-xs">
                      Tailwind CSS, Rekordbox theme, TypeScript types, Layout component
                    </p>
                  </div>
                  <div className="p-3 bg-background border border-surfaceLight rounded">
                    <h3 className="font-semibold text-text mb-1">Phase 2: Rekordbox Ingest ✓</h3>
                    <p className="text-textMuted text-xs">
                      XML parser, batch upload, library sync, upload UI
                    </p>
                  </div>
                  <div className="p-3 bg-background border border-surfaceLight rounded">
                    <h3 className="font-semibold text-text mb-1">Phase 3: YouTube Pipeline ✓</h3>
                    <p className="text-textMuted text-xs">
                      YouTube API integration, NLP extraction, fuzzy matching, Cloud Functions
                    </p>
                  </div>
                  <div className="p-3 bg-background border border-surfaceLight rounded">
                    <h3 className="font-semibold text-text mb-1">Phase 4: Market Connectors ✓</h3>
                    <p className="text-textMuted text-xs">
                      Discogs API, marketplace search, lossless format verification
                    </p>
                  </div>
                  <div className="p-3 bg-background border border-surfaceLight rounded">
                    <h3 className="font-semibold text-text mb-1">Phase 5: Dashboard & Polish ✓</h3>
                    <p className="text-textMuted text-xs">
                      Data grid, filtering, real-time updates, manual corrections
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default App
