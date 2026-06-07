# Desi Movies Stream (Next.js)
ygyugiihjhbibk
Movie streaming frontend built with Next.js App Router + Tailwind CSS.
It fetches category-wise movie data from TMDB and streams selected movies via VidKing embed route.

## API Routes Used

- VidKing embed: `/embed/movie/{tmdbId}`
- Example: `https://www.vidking.net/embed/movie/1078605`

## Features

- Next.js + TypeScript + Tailwind setup
- TMDB-powered category rails (Trending, Popular, Top Rated, In Cinemas, Desi Picks)
- AI-assisted search: resolves TMDB IDs using NVIDIA OpenAI-compatible API on submit
- Click any movie card to load player
- Manual TMDB ID input for direct streaming
- Mobile-friendly responsive layout

## Setup

1. Create `.env.local` in the project root.
2. Add the required and optional keys:

```env
TMDB_READ_ACCESS_TOKEN=your_tmdb_read_access_token_here
# Optional fallback (v3 auth)
TMDB_API_KEY=your_tmdb_api_key_here

# Optional poster fallback for movie entries missing TMDB poster_path
FANART_API_KEY=your_fanart_tv_api_key_here

# Optional AI-based TMDB ID resolver (used for submit search)
NVIDIA_API_KEY=your_nvidia_api_key_here
# Optional model override
NVIDIA_MODEL=openai/gpt-oss-120b
```

You can copy from `.env.local.example`.
After updating env values, restart the dev server.

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
