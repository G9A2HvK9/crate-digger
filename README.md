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
- **Styling**: Tailwind CSS + Shadcn UI
  - Dark Mode theme with Rekordbox-inspired palette (Background `#111`, Surface `#222`, Accent `#00AABB`)
- **Backend**: Firebase Cloud Functions (Node.js) for serverless processing
- **Database**: Cloud Firestore (NoSQL)
- **Authentication**: Firebase Authentication (Google + Email/Password)
- **Hosting**: Firebase Hosting

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
│   └── ...
├── functions/               # Firebase Cloud Functions
│   └── src/                 # Serverless functions (YouTube processing, marketplace search)
├── public/                  # Static assets
├── dist/                    # Build output (generated)
├── firebase.json            # Firebase project configuration
├── .firebaserc              # Firebase project aliases
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Firestore indexes
├── product-requirements.md  # Product requirements document
└── implementation-strategy.md # Implementation plan
```

## 🔐 Firebase Setup

### Initial Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select an existing one
3. Enable the following services:
   - **Authentication**: Enable Google and Email/Password providers
   - **Firestore Database**: Create database in production mode
   - **Cloud Functions**: Requires Blaze plan for outbound network requests (YouTube API, marketplace APIs)
4. Copy your Firebase configuration and update `src/firebase-config.ts`

### Firestore Security Rules

The default rules in `firestore.rules` allow authenticated users to read and write all documents. **Important**: Review and customize these rules to ensure users can only access their own tracks and playlists before deploying to production.

### Firestore Indexes

Add any required composite indexes to `firestore.indexes.json` as needed. The app requires indexes on:
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
