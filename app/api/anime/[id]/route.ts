import { NextResponse } from "next/server";
import { getAnimeById } from "@/lib/anilist";
import { searchMediaByTitle } from "@/lib/tmdb";

/**
 * Fallback lookup: many anime also exist on TMDB (as a movie or a series).
 * When the anime provider has no source, we can still play it through the
 * TMDB id using Vidy's movie/tv routes.
 */
async function findTmdbFallback(title: string, romaji: string) {
  for (const mediaType of ["tv", "movie"] as const) {
    for (const query of [romaji, title]) {
      if (!query) continue;
      try {
        const results = await searchMediaByTitle(query, mediaType);
        const match = results.find((item) => {
          const name = (item.title || "").toLowerCase();
          return name === query.toLowerCase() || name.includes(query.toLowerCase());
        });
        if (match) return { id: match.id, mediaType, title: match.title };
      } catch {
        /* no TMDB key or request failed */
      }
    }
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const anilistId = Number(id);

  if (!Number.isFinite(anilistId) || anilistId <= 0) {
    return NextResponse.json({ error: "Invalid anime id" }, { status: 400 });
  }

  const anime = await getAnimeById(anilistId);

  if (!anime) {
    return NextResponse.json({ error: "Anime not found" }, { status: 404 });
  }

  const tmdbFallback = await findTmdbFallback(anime.title, anime.titleRomaji);

  return NextResponse.json({
    id: anime.anilistId,
    anilistId: anime.anilistId,
    title: anime.title,
    titleRomaji: anime.titleRomaji,
    overview: anime.overview,
    posterPath: anime.posterPath,
    backdropPath: anime.backdropPath,
    releaseDate: anime.releaseDate,
    rating: anime.rating,
    mediaType: "tv",
    genres: anime.genres,
    tagline: anime.format,
    episodes: anime.episodes,
    status: anime.status,
    studios: anime.studios,
    numberOfSeasons: 1,
    seasons: [],
    tmdbFallback,
  });
}
