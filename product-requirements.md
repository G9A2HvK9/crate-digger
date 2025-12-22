# Product Requirements Document: DJ Crate Digger App

## 1. Executive Summary
A web-based tool for DJs to streamline the process of acquiring music found on YouTube. The app ingests YouTube playlists, identifies tracks using NLP/Fuzzy matching, cross-references the user's existing Rekordbox library to prevent duplicates, and locates high-quality (Lossless) purchase links (Discogs, Beatport, etc.) with pricing information.

## 2. Epics & User Stories (MECE)

### Epic A: Authentication & Account Hygiene
**Goal:** Secure user access using Firebase Authentication.
* **Story A1 (Sign Up/Login):** As a DJ, I want to create an account using Google Auth or Email/Password so my library data is synced across devices.
* **Story A2 (Session Persistence):** As a user, I want my session to persist automatically so I don't have to log in every time I open the app.
* **Story A3 (Profile Management):** As a user, I want to manage my account details securely via the settings panel.

### Epic B: Library Ingestion (Rekordbox)
**Goal:** Establish the "Base-line" of what the DJ already owns using Firestore.
* **Story B1 (XML Upload):** As a DJ, I want to upload my `rekordbox.xml` file via the browser.
* **Story B2 (Parsing & Storage):** As a system, I want to parse the XML client-side (or via Cloud Function) and batch-write the tracks to the database to ensure scalability.
* **Story B3 (Upload History):** As a user, I want to see the timestamp of my last library sync.

### Epic C: Playlist Ingestion & NLP (The Input)
**Goal:** Extract and clean data from the raw YouTube source.
* **Story C1 (Link Validation):** As a user, I want to paste a YouTube playlist link and have the system validate it immediately.
* **Story C2 (Metadata Scrape):** As a system, I want to fetch the Video Title, Description, and top Comments for every video in the playlist.
* **Story C3 (NLP Cleaning):** As a system, I want to process "dirty" strings (e.g., "ARTIST - TRACK [Official Video] 4K") into structured `Artist`, `Track Name`, and `Remix` entities.
* **Story C4 (Fallback Logic):** As a system, if the Title is ambiguous, I want to analyze the Video Description and top Comments to extract potential track names.

### Epic D: Matching & Confidence Logic (The Brain)
**Goal:** Determine if the track is known or owned, and how sure we are about it.
* **Story D1 (Library Matching):** As a system, I want to fuzzy-match the cleaned YouTube metadata against my Firestore collection to check for ownership.
* **Story D2 (Version Handling):** As a system, I want to detect if the user owns the specific remix (e.g., "Dub Mix" vs "Radio Edit") or just the base track.
* **Story D3 (Confidence Scoring):** As a system, I want to assign a Confidence Score (0-100%) to every match based on string similarity distances.

### Epic E: Market Intelligence (The Value)
**Goal:** Find purchase links and pricing for missing tracks via Cloud Functions.
* **Story E1 (Store Search):** As a system, I want to search Digital Stores (Beatport, Bandcamp, Juno) for the identified track to find purchase URLs.
* **Story E2 (Format Verification):** As a system, I want to verify if the track is available in Lossless formats (WAV/FLAC/AIFF).
* **Story E3 (Discogs Pricing):** As a system, I want to query the Discogs API to find the physical release and return the cheapest price for "VG" or "Mint" condition.

### Epic F: Triage Dashboard (The Functionality)
**Goal:** Present data for decision making.
* **Story F1 (Results Grid):** As a DJ, I want to see a table of processed tracks showing: YouTube Title, Detected Artist/Track, Confidence Score, Owned Status, and Buy Links.
* **Story F2 (Filtering):** As a DJ, I want to filter the list by "Not in Library" or "Low Confidence" so I can focus on what I need to do.
* **Story F3 (Manual Correction):** As a DJ, I want to manually edit the detected Artist/Track text if the NLP got it wrong, and trigger a re-search.

### Epic G: UI/UX & Aesthetics (The Vibe)
**Goal:** A professional, minimalist environment that feels native to a DJ's workflow.
* **Story G1 (Rekordbox Aesthetic):** As a user, I want the UI to be strictly **Dark Mode** (Dark Greys #1e1e1e, Black #000000) with high-contrast text.
* **Story G2 (Minimalist Dashboard):** As a user, I want a high-density data display with minimal whitespace, distinct borders, and tech-inspired fonts (Monospace for metadata).
* **Story G3 (Visual Hierarchy):** As a user, I want actionable elements (Buy Links, Edit Buttons) to use sharp accent colors (e.g., Cyan or Electric Blue) that pop against the dark background.

