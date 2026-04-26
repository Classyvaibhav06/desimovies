import { NextResponse } from "next/server";
import { getMediaByTmdbIds } from "@/lib/tmdb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") === "tv" ? "tv" : "movie";

  if (!id) {
    return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  }

  try {
    const results = await getMediaByTmdbIds([Number(id)], type);
    if (results.length === 0) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }
    return NextResponse.json(results[0]);
  } catch (error) {
    console.error("Error fetching movie details:", error);
    return NextResponse.json({ error: "Failed to fetch details" }, { status: 500 });
  }
}
