import { NextResponse } from "next/server";
import { getAnimeById } from "@/lib/anilist";

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
  });
}
