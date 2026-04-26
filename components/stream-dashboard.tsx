"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { CategoryWithMovies } from "@/lib/tmdb";

type StreamDashboardProps = {
  categories: CategoryWithMovies[];
  fallbackMovieId: number;
};

function buildEmbedUrl(tmdbId: number): string {
  return `https://www.vidking.net/embed/movie/${tmdbId}`;
}

function posterUrl(path: string | null): string {
  if (!path) {
    return "https://placehold.co/400x600/0a1b2a/e8f3fb?text=No+Poster";
  }

  return `https://image.tmdb.org/t/p/w500${path}`;
}

export default function StreamDashboard({
  categories,
  fallbackMovieId,
}: StreamDashboardProps) {
  const [selectedMovieId, setSelectedMovieId] =
    useState<number>(fallbackMovieId);
  const [manualId, setManualId] = useState<string>(String(fallbackMovieId));

  const selectedEmbedUrl = useMemo(
    () => buildEmbedUrl(selectedMovieId),
    [selectedMovieId],
  );

  function onSubmitManualId(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = manualId.trim();

    if (!/^\d+$/.test(value)) {
      return;
    }

    setSelectedMovieId(Number(value));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1320px] px-4 pb-10 pt-8 md:px-6">
      <header className="mb-6 rounded-3xl border border-white/20 bg-white/5 p-5 backdrop-blur-md">
        <p className="text-sm uppercase tracking-[0.3em] text-saffron/90">
          Movie Streaming Platform
        </p>
        <h1 className="font-[var(--font-heading)] text-5xl leading-none tracking-[0.08em] text-saffron md:text-7xl">
          DESI MOVIES
        </h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Category-wise discovery from TMDB. Click any movie card to stream with
          VidKing embed.
        </p>
      </header>

      <section className="mb-8 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-3xl border border-white/15 bg-ink/70 p-4 shadow-glow backdrop-blur-xl">
          <h2 className="mb-3 text-xl font-semibold text-white">
            Load by TMDB ID
          </h2>
          <form onSubmit={onSubmitManualId} className="space-y-3">
            <label htmlFor="tmdb-id" className="text-sm text-slate-300">
              Custom TMDB Movie ID
            </label>
            <input
              id="tmdb-id"
              value={manualId}
              onChange={(event) => setManualId(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 text-white outline-none ring-saffron transition focus:ring-2"
              placeholder="e.g. 1078605"
              inputMode="numeric"
            />
            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-gradient-to-r from-saffron to-coral font-semibold text-ink transition hover:brightness-110"
            >
              Play Movie
            </button>
          </form>

          <a
            href={selectedEmbedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-saffron/50 bg-saffron/10 font-semibold text-saffron transition hover:bg-saffron/20"
          >
            Open in New Tab
          </a>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/15 bg-black/40 shadow-glow">
          <div className="border-b border-white/15 px-4 py-3 text-sm text-slate-300">
            Streaming TMDB ID:{" "}
            <span className="font-semibold text-saffron">
              {selectedMovieId}
            </span>
          </div>
          <div className="aspect-video w-full">
            <iframe
              key={selectedMovieId}
              src={selectedEmbedUrl}
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              title="Movie Player"
              className="h-full w-full border-0"
            />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {categories.map((category) => (
          <div
            key={category.key}
            className="rounded-3xl border border-white/15 bg-white/[0.03] p-4 backdrop-blur-md"
          >
            <h3 className="mb-4 text-2xl font-semibold text-white">
              {category.label}
            </h3>

            {category.movies.length === 0 ? (
              <p className="text-sm text-rose-300">
                No movies loaded for this category.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {category.movies.map((movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => {
                      setSelectedMovieId(movie.id);
                      setManualId(String(movie.id));
                    }}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 text-left transition hover:-translate-y-1 hover:border-saffron/70"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden">
                      <Image
                        src={posterUrl(movie.posterPath)}
                        alt={movie.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 200px"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="line-clamp-2 text-sm font-semibold text-white">
                        {movie.title}
                      </p>
                      <p className="text-xs text-slate-300">
                        ⭐ {movie.rating} • {movie.releaseDate || "N/A"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
