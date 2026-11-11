import { NextResponse } from "next/server";
import { findAnimeInCatalogue, getAnimeById } from "@/lib/anilist";
import { searchMediaByTitle, type SearchResult } from "@/lib/tmdb";

/**
 * Normalises a title so "Attack on Titan!", "attack  on titan" and
 * "ATTACK ON TITAN" all compare equal.
 */
function normaliseTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Picks the best TMDB candidate for an anime title.
 *
 * An anime title often matches several TMDB entries ("Attack on Titan",
 * "Attack on Titan: The Final Season", ...). An exact match has to win,
 * otherwise the id we hand to the stream providers points at the wrong show.
 */
function pickBestMatch(results: SearchResult[], query: string) {
  const target = normaliseTitle(query);
  if (!target) return null;

  let best: { item: SearchResult; score: number } | null = null;

  for (const item of results) {
    const name = normaliseTitle(item.title ?? "");
    if (!name) continue;

    let score = 0;
    if (name === target) {
      score = 3;
    } else if (name.startsWith(target) || target.startsWith(name)) {
      score = 2;
    } else if (name.includes(target) || target.includes(name)) {
      score = 1;
    }

    if (score === 0) continue;
    if (!best || score > best.score) {
      best = { item, score };
    }
  }

  return best?.item ?? null;
}

export type TmdbFallback = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
};

/**
 * Cached per AniList id — the lookup costs several live TMDB searches, and
 * /api/anime/{id} is hit on every deep link and page refresh.
 */
const fallbackCache = new Map<number, TmdbFallback | null>();

/**
 * Fallback lookup: many anime also exist on TMDB (as a movie or a series).
 * When the anime provider has no source, we can still play it through the
 * TMDB id using Vidy's movie/tv routes.
 *
 * The mapping has to go through the title: AniList and TMDB id spaces
 * overlap numerically, so AniList 16498 and TMDB tv 16498 are different
 * shows. Feeding one namespace's id to the other silently plays the wrong
 * title rather than failing.
 */
async function findTmdbFallback(titles: string[]): Promise<TmdbFallback | null> {
  const queries = titles
    .map((title) => (title ?? "").trim())
    .filter(Boolean);

  for (const mediaType of ["tv", "movie"] as const) {
    for (const query of queries) {
      try {
        const results = await searchMediaByTitle(query, mediaType);
        const match = pickBestMatch(results, query);
        if (match) {
          return {
            id: match.id,
            mediaType,
            title: match.title,
          };
        }
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
    // AniList can rate-limit a direct lookup — fall back to the cached
    // catalogue entry so the page still resolves instead of 404ing.
    const cached = await findAnimeInCatalogue(anilistId);
    if (!cached) {
      return NextResponse.json({ error: "Anime not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: cached.anilistId,
      anilistId: cached.anilistId,
      title: cached.title,
      titleRomaji: cached.titleRomaji,
      titleNative: cached.titleNative ?? "",
      overview: cached.overview,
      posterPath: cached.posterPath,
      backdropPath: cached.backdropPath,
      releaseDate: cached.releaseDate,
      rating: cached.rating,
      mediaType: "tv",
      genres: cached.genres,
      tagline: cached.format,
      episodes: cached.episodes,
      status: "UNKNOWN",
      studios: [],
      numberOfSeasons: 1,
      seasons: [],
      tmdbFallback: fallbackCache.get(anilistId) ?? null,
    });
  }

  let tmdbFallback = fallbackCache.get(anilistId);
  if (tmdbFallback === undefined) {
    tmdbFallback = await findTmdbFallback([
      anime.title,
      anime.titleRomaji,
      anime.titleNative ?? "",
    ]);
    fallbackCache.set(anilistId, tmdbFallback);
  }

  return NextResponse.json({
    id: anime.anilistId,
    anilistId: anime.anilistId,
    title: anime.title,
    titleRomaji: anime.titleRomaji,
    titleNative: anime.titleNative,
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
