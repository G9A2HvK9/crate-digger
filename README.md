# CrateDigger

A web-based tool for DJs to streamline the process of acquiring music found on YouTube. CrateDigger bridges the gap between discovering tracks on YouTube playlists and purchasing them legally in high-quality, lossless formats.

## 🎯 What It Does

CrateDigger solves a common problem for DJs: you find great tracks on YouTube playlists, but then face the tedious task of:
- Identifying the actual track from messy YouTube titles (e.g., "ARTIST - TRACK [Official Video] 4K")
- Checking if you already own it in your Rekordbox library
- Finding where to buy it in lossless formats (WAV/FLAC/AIFF)
- Comparing prices across different stores (Beatport, Bandcamp, Discogs, etc.)

## 🔄 How It Works

1. **Upload Your Library**: Import your Rekordbox XML file to establish a baseline of what you already own
2. **Paste Playlist URL**: Provide a YouTube playlist link
3. **Automatic Processing**: The app:
   - Scrapes YouTube metadata (titles, descriptions, comments)
   - Uses NLP to extract clean artist/track information from messy strings
   - Fuzzy-matches against your library to detect duplicates
   - Searches marketplaces for purchase links and pricing
   - Calculates confidence scores for each match
4. **Decision Dashboard**: Review a high-density data table showing owned status, confidence scores, and buy links—filter and edit as needed

## 🛠️ Tech Stack

- **Frontend**: React 19 with TypeScript, Vite
- **Styling**: Tailwind CSS v3 + Shadcn UI
  - Forced Dark Mode theme with Rekordbox-inspired palette
  - Colors: Background `#000000`, Surface `#1e1e1e`, Accent `#00AABB`
- **Backend**: Firebase Cloud Functions (Node.js) for serverless processing
- **Database**: Cloud Firestore (NoSQL)
- **Authentication**: Firebase Authentication (Email/Password) with handle-based login and admin approval
- **Hosting**: Firebase Hosting

## 🚧 Development Status

### ✅ Phase 1: Project Skeleton & Hygiene (Complete)
- [x] Tailwind CSS configured with forced dark mode
- [x] Rekordbox theme palette implemented
- [x] Shadcn UI dependencies installed
- [x] TypeScript type definitions for Firestore models
- [x] Global Layout component with dark theme enforcement
- [x] Firestore security rules with user data access control
- [x] Complete authentication system (sign up, login, password reset/change)
- [x] User profiles with first name, last name, and unique handle
- [x] API key management (YouTube, Discogs) stored per-user in Firestore
- [x] Admin approval system for new accounts (pending until approved)
- [x] Admin Panel for managing user approvals

### ✅ Phase 2: Rekordbox Ingest (Complete)
- [x] XML parser for Rekordbox library files (fast-xml-parser)
- [x] Batch upload to Firestore (500 ops per batch)
- [x] SearchableString normalization function
- [x] Library sync timestamp update
- [x] Upload UI component with drag-and-drop, progress bar, and error handling

### ✅ Phase 3: YouTube Pipeline (Complete)
- [x] YouTube Data API v3 integration with quota management
- [x] Cloud Function for playlist processing (processPlaylist)
- [x] NLP logic for extracting artist/title/remix from messy YouTube titles
- [x] Fuzzy matching against user library using fuse.js
- [x] PlaylistProcessor frontend component

### ✅ Phase 4: Market Connectors (Complete)
- [x] Discogs API integration for physical releases with price lookup
- [x] Digital store integration structure (Beatport, Bandcamp, Juno)
- [x] Lossless format verification structure
- [x] Marketplace results storage in ProcessedTrack documents
- [x] MarketplaceResults frontend component with "Scan Markets" button
- [x] Error handling with retry logic and exponential backoff

### ✅ Phase 5: Dashboard & Polish (Complete)
- [x] Data grid with @tanstack/react-table (high-density, monospace fonts)
- [x] Filtering (All, Not in Library, Low Confidence, Owned, Unmatched)
- [x] Search functionality by artist/title/YouTube title
- [x] Real-time updates with Firestore onSnapshot listeners
- [x] Manual correction UI with inline editing and persistent Firestore updates
- [x] Buy links display with accent colors
- [x] Loading states and error handling

## 📋 Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project (or create one at [Firebase Console](https://console.firebase.google.com))

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select an existing one
3. Go to Project Settings > General
4. Scroll down to "Your apps" and copy the Firebase configuration
5. Update `src/firebase-config.ts` with your Firebase config values

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

### 5. Deploy to Firebase

```bash
npm run deploy
```

Or deploy manually:

```bash
firebase deploy --only hosting
```

## 📁 Project Structure

```
CrateDigger/
├── src/
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # React entry point
│   ├── firebase-config.ts   # Firebase configuration
│   ├── index.css            # Global styles with Tailwind directives
│   ├── components/
│   │   ├── Layout.tsx             # Global layout wrapper with dark theme enforcement
│   │   ├── Auth.tsx               # Authentication (sign up, login, password reset)
│   │   ├── Header.tsx             # App header with user menu
│   │   ├── Settings.tsx           # User settings (password change, API keys)
│   │   ├── LibraryUpload.tsx      # Rekordbox XML upload component
│   │   ├── PlaylistProcessor.tsx  # YouTube playlist processing component
│   │   ├── MarketplaceResults.tsx # Marketplace search results component
│   │   └── TracksDashboard.tsx    # Main dashboard with data grid
│   ├── lib/
│   │   ├── utils.ts         # Utility functions (cn for class merging)
│   │   ├── rekordboxParser.ts # XML parser for Rekordbox files
│   │   └── firestoreUpload.ts # Batch upload utilities
│   └── types/
│       └── firestore.ts     # TypeScript type definitions for Firestore models
├── functions/               # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts         # Cloud Functions (processPlaylist, searchMarketplace)
│   ├── package.json         # Functions dependencies
│   └── tsconfig.json        # TypeScript configuration
├── public/                  # Static assets
├── dist/                    # Build output (generated)
├── firebase.json            # Firebase project configuration
├── .firebaserc              # Firebase project aliases
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Firestore indexes
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── product-requirements.md  # Product requirements document
└── implementation-strategy.md # Implementation plan
```

## 🔐 Firebase Setup

### Initial Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select an existing one
3. Enable the following services:
   - **Authentication**: Enable Email/Password provider
   - **Firestore Database**: Create database in production mode
   - **Cloud Functions**: Requires Blaze plan for outbound network requests (YouTube API, marketplace APIs)
4. Copy your Firebase configuration and update `src/firebase-config.ts`
5. **Optional**: Add your API keys in Settings after creating an account:
   - YouTube Data API v3 key (for playlist processing)
   - Discogs API key and secret (for marketplace search)

### Firestore Security Rules

The security rules in `firestore.rules` enforce user-specific access control:
- Users can only read/write their own `User`, `UserApiKeys`, `Track`, `Playlist`, and `ProcessedTrack` documents
- All write operations validate that `userId` matches the authenticated user
- Rules are configured for the collections: `users`, `userApiKeys`, `tracks`, `playlists`, `processedTracks`

### Firestore Indexes

Add any required composite indexes to `firestore.indexes.json` as needed. The app requires indexes on:
- `handle` field in `users` collection for efficient handle lookups
- `userId` and `searchableString` for efficient track lookups

## 📝 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (creates optimized bundle in `dist/`)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run deploy` - Build and deploy to Firebase Hosting

## 🚢 Deployment

The app is configured to deploy to Firebase Hosting. After building, run:

```bash
firebase deploy --only hosting
```

Or use the npm script:

```bash
npm run deploy
```

## 📚 Documentation

- [Product Requirements](./product-requirements.md) - Detailed feature specifications and user stories
- [Implementation Strategy](./implementation-strategy.md) - Technical implementation plan and development phases

---

**Made with React, TypeScript, and Firebase** 🚀
