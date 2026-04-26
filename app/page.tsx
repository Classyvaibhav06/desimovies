import StreamDashboard from "@/components/stream-dashboard";
import { getCategoryMovies } from "@/lib/tmdb";

const defaultMovieId = 1078605;

export default async function HomePage() {
  try {
    const categories = await getCategoryMovies();
    const firstMovieId =
      categories.find((category) => category.movies.length > 0)?.movies[0]
        ?.id ?? defaultMovieId;

    return (
      <StreamDashboard categories={categories} fallbackMovieId={firstMovieId} />
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-6">
        <div className="rounded-3xl border border-rose-300/40 bg-rose-950/40 p-6 text-rose-100">
          <h1 className="mb-2 text-2xl font-semibold">TMDB Setup Needed</h1>
          <p className="text-sm text-rose-100/90">
            Add your TMDB API key to .env.local as TMDB_API_KEY and restart the
            server.
          </p>
          <p className="mt-2 text-xs text-rose-200/80">{errorMessage}</p>
        </div>
      </main>
    );
  }
}
