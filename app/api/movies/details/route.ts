import { NextResponse } from "next/server";
import { getMediaByTmdbIds, getSimilarMedia, getSeasonDetails } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";
  const season = searchParams.get("season");

  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  try {
    const [results, similar] = await Promise.all([
      getMediaByTmdbIds([Number(id)], type),
      getSimilarMedia(type, Number(id))
    ]);

    if (results.length === 0) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    let seasonDetails = null;
    if (type === "tv" && season) {
      seasonDetails = await getSeasonDetails(Number(id), Number(season));
    }

    return NextResponse.json({
      ...results[0],
      similar,
      seasonDetails
    });
  } catch (error) {
    console.error("Error fetching media details:", error);
    return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
  }
}
