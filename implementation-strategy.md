# Implementation Strategy: CrateDigger (React + Firebase)

## Tech Stack Definition
* **Frontend:** React (Vite) + TypeScript.
* **Styling:** Tailwind CSS + Shadcn UI.
    * *Theme:* Force Dark Mode. "Rekordbox" palette (Background `#111`, Surface `#222`, Accent `#00AABB`).
* **Backend / Serverless:** Firebase Cloud Functions (Node.js).
* **Database:** Cloud Firestore (NoSQL).
* **Auth:** Firebase Authentication.
* **Hosting:** Firebase Hosting.
* **NLP:** Consider `compromise` or custom regex-based parser for track title extraction.
* **Fuzzy Matching:** `fuse.js` for client-side, `string-similarity` or `fuse.js` for server-side.
* **YouTube:** YouTube Data API v3 (with quota management) + fallback scraping if needed (consider `youtube-dl` alternatives or `@distube/ytdl-core`).

## Phase 1: Project Skeleton & Hygiene (Days 1-2)
* [x] **Init:** Initialize Vite project (`npm create vite@latest`) with React/TS.
* [x] **Firebase Setup:** Run `firebase init` to configure Hosting, Firestore, and Functions. Enable Auth (Email/Password) in the Firebase Console.
* [x] **Authentication System:**
    * Sign up: Email/password with first name, last name, and unique handle (username).
    * Login: Support email or handle + password authentication.
    * Password reset: Email or handle lookup for password recovery.
    * Password change: In-app password change with re-authentication requirement.
    * Session persistence: Automatic session management via Firebase Auth.
* [x] **User Profile Management:**
    * User document stores: `uid`, `email`, `firstName`, `lastName`, `handle`, `lastLibrarySync`, `createdAt`, `updatedAt`.
    * Handle uniqueness validation and Firestore index for efficient lookups.
* [x] **API Key Management:**
    * User-specific API key storage in `userApiKeys` collection.
    * Support for YouTube Data API v3 and Discogs API keys.
    * Secure storage with user access control.
    * Cloud Functions use user keys with fallback to Firebase config.
* [x] **Styling Config:**
    * Configure Tailwind for Dark Mode (forced, no light mode toggle).
    * Install Shadcn UI components.
    * Create a global layout wrapper that enforces the dark grey/black aesthetic.
    * Set up theme tokens for the Rekordbox palette.
* [x] **Firestore Schema:** Define data models (TS Interfaces):
    * `User`: `{ uid, email, firstName, lastName, handle, lastLibrarySync, createdAt, updatedAt }`
    * `UserApiKeys`: `{ userId, youtubeApiKey, discogsApiKey, discogsApiSecret, updatedAt }`
    * `Track`: `{ userId, artist, title, remix, format, searchableString, createdAt }` (Index `userId` and `searchableString`).
    * `Playlist`: `{ userId, youtubeUrl, status, createdAt, processedAt }`
    * `ProcessedTrack`: `{ userId, playlistId, youtubeVideoId, youtubeTitle, detectedArtist, detectedTitle, detectedRemix, confidenceScore, ownedStatus, ownedTrackId (ref), marketplaceResults, manualCorrections, status, createdAt, updatedAt }`
* [x] **Security Rules (Early):** Write basic `firestore.rules` to ensure users can only access their own data. Includes `users`, `userApiKeys`, `tracks`, `playlists`, `processedTracks` collections. Refine in Phase 6.
* [x] **TypeScript Types:** Create shared type definitions for all Firestore models.

## Phase 2: The Rekordbox Ingest (Days 3-4)
* [x] **XML Parser:** Implement a client-side XML parser (using `fast-xml-parser` or similar) to read the user's `rekordbox.xml`.
    * Extract: Artist, Title, Remix info, Format (mp3/wav/flac).
    * Handle edge cases (missing fields, malformed XML).
* [x] **Batch Upload:** Create a utility to upload tracks to Firestore.
    * *Critical:* Use Firestore Batched Writes (max 500 ops per batch) to handle large libraries (10k+ tracks) efficiently.
    * Show progress indicator for large uploads.
    * Handle errors gracefully (retry failed batches).
* [x] **Search Index:** When saving a track, create a simplified "searchableString" (lowercase, stripped of punctuation, normalized) to help with simpler lookups later.
* [x] **Library Sync:** Update `User.lastLibrarySync` timestamp after successful upload.
* [x] **UI:** Create upload component with drag-and-drop or file picker, progress bar, and success/error feedback.

## Phase 3: The YouTube Pipeline (Days 5-7)
* [x] **YouTube Data Strategy:**
    * *Primary:* Use YouTube Data API v3 with API key (requires quota management).
        * Quota cost: ~1 unit per video metadata fetch.
        * Default quota: 10,000 units/day (can request increase).
        * Implement rate limiting and quota tracking.
    * *Fallback:* Consider `@distube/ytdl-core` or similar for scraping if API quota is exhausted (use carefully, respect ToS).
* [x] **Cloud Function (Ingest):** Create an `onCall` Cloud Function `processPlaylist(url, userId)`.
    * Validates YouTube playlist URL format.
    * Fetches playlist metadata and video list.
    * For each video, fetch: Title, Description, top Comments (if available via API).
    * Store initial `ProcessedTrack` documents in Firestore with `status: 'pending'`.
    * Return job ID or use Firestore triggers for async processing.
* [x] **NLP Logic (Server-side):** Implement the string cleaning logic inside the Cloud Function.
    * Use regex patterns + heuristics to extract Artist/Title/Remix from messy titles.
    * Patterns to handle: "ARTIST - TITLE [Official Video]", "TITLE (Remix)", etc.
    * Fallback: Parse Description and Comments if Title is ambiguous (Story C4).
    * Store cleaned `detectedArtist`, `detectedTitle`, `detectedRemix` in `ProcessedTrack`.
* [x] **Fuzzy Matcher (Optimized):**
    * *Performance:* Don't fetch entire library. Instead:
        1. Fetch only `searchableString` fields (lightweight query).
        2. Use `fuse.js` in Node.js to fuzzy-match against the lightweight index.
        3. Calculate Confidence Score (0-100%) based on similarity.
        4. If match found, store `ownedStatus: true` and `ownedTrackId` reference.
        5. Handle version detection (remix vs base track) via confidence thresholds.
    * Update `ProcessedTrack` with match results and `status: 'matched'`.

## Phase 4: Market Connectors (Days 8-10)
* [x] **Cloud Function (MarketSearch):** Create an `onCall` function `searchMarketplace(artist, title, remix)` or batch process via Firestore trigger.
    * *Note:* Requires Firebase "Blaze" plan for outbound network requests.
    * *Strategy:* Process in batches to avoid timeout limits. Consider background jobs for large playlists.
* [x] **Discogs API Integration:**
    * Use Discogs API (requires OAuth or API key).
    * Search by artist + title.
    * Parse results for: Release URL, cheapest "VG" or "Mint" condition price.
    * Fallback to next available condition if preferred not found.
* [x] **Digital Store Integration:**
    * *Beatport:* May require scraping (no public API). Use carefully, respect rate limits.
    * *Bandcamp:* Scraping required. Search by artist/title, check for lossless formats (WAV/FLAC).
    * *Juno Download:* Scraping or check if API exists.
    * For each store, verify lossless format availability (Story E2).
* [x] **Marketplace Results Storage:**
    * Store results in `ProcessedTrack.marketplaceResults` as array:
        `[{ store: 'beatport', url: '...', price: '...', format: 'WAV', available: true }, ...]`
* [x] **Frontend Integration:**
    * Auto-trigger market search after playlist processing completes (for unmatched tracks).
    * Manual trigger via "Scan Markets" button for selected tracks.
    * Show loading states and progress.
* [x] **Error Handling:**
    * Handle API failures gracefully (retry logic, exponential backoff).
    * Store partial results if some stores fail.
    * Log errors for debugging.

## Phase 5: The Dashboard & Polish (Days 11-14)
* [x] **Data Grid:** Build the main dashboard using `@tanstack/react-table`.
    * *Style:* High density, monospace fonts for data, sticky headers.
    * *Columns:* YouTube Title, Detected Artist, Detected Title, Confidence Score, Owned Status, Buy Links (grouped by store).
    * *Features:* Sorting, column resizing, row selection.
* [x] **Filtering & Search:**
    * Filter by: "Not in Library", "Low Confidence" (< 70%), "Owned", "Unmatched".
    * Search by artist/title.
* [x] **Real-time Updates:** Use Firestore `onSnapshot` listeners to update the UI instantly as tracks are processed in the background.
    * Show processing status indicators (pending, processing, completed, error).
* [x] **Manual Correction (Persistent):**
    * UI for inline editing of `detectedArtist`/`detectedTitle` (Story F3).
    * *Critical:* Update Firestore `ProcessedTrack` document, not just local state.
    * Store corrections in `ProcessedTrack.manualCorrections` array for audit trail.
    * Trigger re-run of `searchMarketplace` function with corrected data.
    * Re-run fuzzy matching against library with corrected values.
* [x] **Buy Links:** Render clickable links to external stores (open in new tab).
    * Use accent colors (Cyan/Electric Blue) for visual hierarchy.
* [x] **Loading States:** Show skeletons/placeholders while data loads.
* [x] **Error States:** Display user-friendly error messages with retry options.

## Phase 6: Refinement & Production Readiness
* [x] **Security Rules (Final):** Refine `firestore.rules` with comprehensive access control:
    * Users can only read/write their own `Track`, `Playlist`, and `ProcessedTrack` documents.
    * Validate `userId` matches authenticated user on all writes.
    * Admins can manage user documents for approval via `isAdmin` checks.
    * Prevent unauthorized access to other users' data.
* [x] **Cost Optimization:**
    * Review Firestore read/write usage. Minimize unnecessary queries.
    * Use Firestore indexes efficiently (composite indexes where needed).
    * Limit real-time listeners to the most recent records (e.g., latest 200 `ProcessedTrack` and 500 `Track` documents).
* [x] **Error Handling & Resilience:**
    * Add top-level `ErrorBoundary` component to catch render-time errors.
    * Show friendly fallback UI when an unexpected error occurs.
    * Improve Cloud Functions error messaging (e.g., when Functions are not deployed).
* [x] **Performance:**
    * Implement lazy loading for heavy components (`TracksDashboard`, `LibraryView`, `PlaylistProcessor`, `Settings`, `AdminPanel`).
    * Use `Suspense` fallbacks to keep UX responsive.
* [ ] **Testing:**
    * Unit tests for NLP parsing logic.
    * Unit tests for fuzzy matching algorithms.
    * Integration tests for Cloud Functions.
    * E2E tests for critical user flows (upload library, process playlist).
* [ ] **Documentation:**
    * API documentation for Cloud Functions.
    * User guide for uploading Rekordbox XML.
    * Troubleshooting guide for common issues.
* [ ] **Monitoring:**
    * Set up Firebase Performance Monitoring.
    * Track key metrics: processing time, success rates, API quota usage.
    * Set up alerts for errors and quota exhaustion.

