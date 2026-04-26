# Desi Movies Stream (Next.js)

Movie streaming frontend built with Next.js App Router + Tailwind CSS.
It fetches category-wise movie data from TMDB and streams selected movies via VidKing embed route.

## API Routes Used

- VidKing embed: `/embed/movie/{tmdbId}`
- Example: `https://www.vidking.net/embed/movie/1078605`

## Features

- Next.js + TypeScript + Tailwind setup
- TMDB-powered category rails (Trending, Popular, Top Rated, In Cinemas, Desi Picks)
- Click any movie card to load player
- Manual TMDB ID input for direct streaming
- Mobile-friendly responsive layout

## Setup

1. Create `.env.local` in the project root.
2. Add your key:

```env
TMDB_API_KEY=your_tmdb_api_key_here
```

You can copy from `.env.local.example`.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Project Structure

- `app/page.tsx` - server page that loads TMDB categories
- `components/stream-dashboard.tsx` - interactive player and category UI
- `lib/tmdb.ts` - TMDB fetching and category mapping
- `app/globals.css` - Tailwind base + visual theme
