import { Layout } from './components/Layout'
import { LibraryUpload } from './components/LibraryUpload'

function App() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text mb-2">CrateDigger</h1>
          <p className="text-textMuted">A web-based tool for DJs to streamline music acquisition from YouTube playlists</p>
        </div>
        
        <div className="space-y-6">
          <LibraryUpload />
          
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
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default App
