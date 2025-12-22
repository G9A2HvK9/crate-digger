import { Layout } from './components/Layout'

function App() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-surface border border-surfaceLight rounded-lg p-8">
          <h1 className="text-4xl font-bold text-text mb-4">CrateDigger</h1>
          <p className="text-textMuted mb-6">A web-based tool for DJs to streamline music acquisition from YouTube playlists</p>
          
          <div className="space-y-4">
            <div className="p-4 bg-background border border-surfaceLight rounded">
              <h2 className="text-xl font-semibold text-text mb-2">Phase 1: Project Setup</h2>
              <p className="text-textMuted text-sm">
                ✓ Tailwind CSS configured with dark mode<br />
                ✓ Rekordbox theme palette applied<br />
                ✓ TypeScript types for Firestore models<br />
                ✓ Global layout wrapper with dark theme enforcement
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default App
