import { NextResponse } from "next/server";
import { getCategoryMovies } from "@/lib/tmdb";

export async function GET() {
  try {
    const categories = await getCategoryMovies();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching movies:", error);
    return NextResponse.json(
      { error: "Failed to fetch movies" },
      { status: 500 }
    );
  }
}
