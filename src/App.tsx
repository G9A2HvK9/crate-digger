import { useState, useEffect, Suspense } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase-config';
import { isUserApproved, isAdmin } from './lib/admin';
import { Layout } from './components/Layout'
import { Auth } from './components/Auth'
import { Header } from './components/Header'
import { Tabs } from './components/Tabs'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LibraryUpload } from './components/LibraryUpload'
import { LibraryView } from './components/LibraryView'
import { PlaylistProcessor } from './components/PlaylistProcessor'
import { TracksDashboard } from './components/TracksDashboard'
import { Settings } from './components/Settings'
import { AdminPanel } from './components/AdminPanel'

function App() {
  const [user] = useAuthState(auth);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check approval status
  useEffect(() => {
    if (!user) {
      setIsApproved(null);
      setIsUserAdmin(false);
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      setLoading(true);
      const approved = await isUserApproved(user.uid);
      const admin = await isAdmin(user.uid);
      setIsApproved(approved);
      setIsUserAdmin(admin);
      setLoading(false);
    };

    checkStatus();
  }, [user]);

  // Show auth screen if not logged in
  if (!user) {
    return <Auth />;
  }

  // Show loading state
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center gap-3 text-textMuted">
            <div className="animate-spin">⚙️</div>
            <span>Loading...</span>
          </div>
        </div>
      </Layout>
    );
  }

  // Show pending approval message
  if (!isApproved) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-surfaceLight rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-text mb-4">Account Pending Approval</h1>
            <p className="text-textMuted mb-4">
              Your account has been created successfully, but it's pending admin approval.
            </p>
            <p className="text-textMuted text-sm">
              You will be able to access CrateDigger once an administrator approves your account.
            </p>
            <button
              onClick={() => auth.signOut()}
              className="mt-6 px-4 py-2 bg-background border border-surfaceLight rounded text-text hover:border-accent transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ErrorBoundary>
        <Header 
          onSettingsClick={() => setShowSettings(true)}
          onAdminClick={isUserAdmin ? () => setShowAdmin(true) : undefined}
          isAdmin={isUserAdmin}
        />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Suspense fallback={<div className="text-textMuted">Loading…</div>}>
            {showAdmin ? (
              <div>
                <button
                  onClick={() => setShowAdmin(false)}
                  className="mb-4 text-accent hover:text-accentHover"
                >
                  ← Back to Dashboard
                </button>
                <AdminPanel />
              </div>
            ) : showSettings ? (
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
                
                <Tabs
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  tabs={[
                    {
                      id: 'dashboard',
                      label: 'Dashboard',
                      content: (
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
                      ),
                    },
                    {
                      id: 'library',
                      label: 'My Library',
                      content: (
                        <div className="space-y-6">
                          <LibraryView />
                        </div>
                      ),
                    },
                  ]}
                />
              </>
            )}
          </Suspense>
        </div>
      </ErrorBoundary>
    </Layout>
  )
}

export default App
