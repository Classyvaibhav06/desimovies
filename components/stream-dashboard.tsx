"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryWithMovies, SearchResult } from "@/lib/tmdb";

type StreamDashboardProps = {
  categories: CategoryWithMovies[];
  fallbackMovieId: number;
};

type MediaType = "movie" | "tv";

function buildEmbedUrl(
  mediaType: MediaType,
  tmdbId: number,
  season: number,
  episode: number,
): string {
  if (mediaType === "tv") {
    return `https://www.vidking.net/embed/tv/${tmdbId}/${season}/${episode}`;
  }

  return `https://www.vidking.net/embed/movie/${tmdbId}`;
}

function posterUrl(path: string | null): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `https://image.tmdb.org/t/p/w500${path}`;
}

export default function StreamDashboard({
  categories,
  fallbackMovieId,
}: StreamDashboardProps) {
  const previewAbortRef = useRef<AbortController | null>(null);
  const [selectedMediaType, setSelectedMediaType] =
    useState<MediaType>("movie");
  const [selectedMovieId, setSelectedMovieId] =
    useState<number>(fallbackMovieId);
  const [season, setSeason] = useState<string>("1");
  const [episode, setEpisode] = useState<string>("1");
  const [manualId, setManualId] = useState<string>(String(fallbackMovieId));
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchType, setSearchType] = useState<MediaType>("movie");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const parsedSeason = Number.parseInt(season, 10);
  const parsedEpisode = Number.parseInt(episode, 10);
  const safeSeason =
    Number.isFinite(parsedSeason) && parsedSeason > 0 ? parsedSeason : 1;
  const safeEpisode =
    Number.isFinite(parsedEpisode) && parsedEpisode > 0 ? parsedEpisode : 1;

  const selectedEmbedUrl = useMemo(
    () =>
      buildEmbedUrl(
        selectedMediaType,
        selectedMovieId,
        safeSeason,
        safeEpisode,
      ),
    [selectedMediaType, selectedMovieId, safeSeason, safeEpisode],
  );

  function onSubmitManualId(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = manualId.trim();

    if (!/^\d+$/.test(value)) {
      return;
    }

    setSelectedMovieId(Number(value));
  }

  async function fetchSearchResults(
    query: string,
    mediaType: MediaType,
    closeMatchOnly: boolean,
    signal?: AbortSignal,
  ): Promise<{ results: SearchResult[]; message: string }> {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(query)}&type=${mediaType}&closeMatch=${closeMatchOnly ? "1" : "0"}`,
      { signal },
    );
    const data = (await response.json()) as {
      results?: SearchResult[];
      message?: string;
    };

    return {
      results: data.results ?? [],
      message: data.message ?? "",
    };
  }

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length === 0) {
      if (previewAbortRef.current) {
        previewAbortRef.current.abort();
      }

      setSearchResults([]);
      setSearchMessage("");
      setIsPreviewLoading(false);
      return;
    }

    if (query.length < 2) {
      if (previewAbortRef.current) {
        previewAbortRef.current.abort();
      }

      setSearchResults([]);
      setSearchMessage("Type at least 2 characters.");
      setIsPreviewLoading(false);
      return;
    }

    const debounceId = setTimeout(async () => {
      if (previewAbortRef.current) {
        previewAbortRef.current.abort();
      }

      const controller = new AbortController();
      previewAbortRef.current = controller;

      setIsPreviewLoading(true);
      setSearchMessage("");

      try {
        const data = await fetchSearchResults(
          query,
          searchType,
          true,
          controller.signal,
        );

        setSearchResults(data.results);

        if (data.message) {
          setSearchMessage(data.message);
        } else if (data.results.length === 0) {
          setSearchMessage(
            searchType === "tv"
              ? "No close web series matches found."
              : "No close movie matches found.",
          );
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSearchResults([]);
        setSearchMessage("Preview timed out. Keep typing or press Search.");
      } finally {
        setIsPreviewLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(debounceId);
    };
  }, [searchQuery, searchType]);

  async function onSubmitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setSearchMessage("Type at least 2 characters.");
      return;
    }

    if (previewAbortRef.current) {
      previewAbortRef.current.abort();
    }

    setIsSearching(true);
    setIsPreviewLoading(false);
    setSearchMessage("");
    setSearchResults([]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const data = await fetchSearchResults(
        query,
        searchType,
        false,
        controller.signal,
      );
      const results = data.results;
      setSearchResults(results);

      if (data.message) {
        setSearchMessage(data.message);
      } else if (results.length === 0) {
        setSearchMessage(
          searchType === "tv"
            ? "No web series found for that name."
            : "No movies found for that name.",
        );
      }
    } catch {
      setSearchResults([]);
      setSearchMessage("Search timed out. Please try again.");
    } finally {
      clearTimeout(timeoutId);
      setIsSearching(false);
    }
  }

  function pickMovie(movieId: number, mediaType: MediaType = "movie") {
    setSelectedMediaType(mediaType);
    setSelectedMovieId(movieId);
    setManualId(String(movieId));
  }

  function handleImageLoad(movieId: number) {
    setLoadedImages((prev) => new Set(prev).add(movieId));
  }

  function handleImageError(movieId: number) {
    console.warn(`Failed to load poster for movie ID: ${movieId}`);
    setFailedImages((prev) => new Set(prev).add(movieId));
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
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedMediaType("movie")}
              className={`h-10 rounded-lg border text-sm font-semibold transition ${
                selectedMediaType === "movie"
                  ? "border-saffron/70 bg-saffron/20 text-saffron"
                  : "border-white/15 bg-slate-950/40 text-slate-300 hover:border-saffron/40"
              }`}
            >
              Movie
            </button>
            <button
              type="button"
              onClick={() => setSelectedMediaType("tv")}
              className={`h-10 rounded-lg border text-sm font-semibold transition ${
                selectedMediaType === "tv"
                  ? "border-saffron/70 bg-saffron/20 text-saffron"
                  : "border-white/15 bg-slate-950/40 text-slate-300 hover:border-saffron/40"
              }`}
            >
              TV / Web Series
            </button>
          </div>
          <form onSubmit={onSubmitManualId} className="space-y-3">
            <label htmlFor="tmdb-id" className="text-sm text-slate-300">
              Custom TMDB {selectedMediaType === "tv" ? "Series" : "Movie"} ID
            </label>
            <input
              id="tmdb-id"
              value={manualId}
              onChange={(event) => setManualId(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 text-white outline-none ring-saffron transition focus:ring-2"
              placeholder="e.g. 1078605"
              inputMode="numeric"
            />
            {selectedMediaType === "tv" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="season" className="text-xs text-slate-300">
                    Season
                  </label>
                  <input
                    id="season"
                    value={season}
                    onChange={(event) => setSeason(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-white/20 bg-slate-950/70 px-3 text-white outline-none ring-saffron transition focus:ring-2"
                    inputMode="numeric"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label htmlFor="episode" className="text-xs text-slate-300">
                    Episode
                  </label>
                  <input
                    id="episode"
                    value={episode}
                    onChange={(event) => setEpisode(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-white/20 bg-slate-950/70 px-3 text-white outline-none ring-saffron transition focus:ring-2"
                    inputMode="numeric"
                    placeholder="1"
                  />
                </div>
              </div>
            ) : null}
            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-gradient-to-r from-saffron to-coral font-semibold text-ink transition hover:brightness-110"
            >
              {selectedMediaType === "tv" ? "Play Episode" : "Play Movie"}
            </button>
          </form>

          <div className="mt-5 border-t border-white/10 pt-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Search by Name
            </h3>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSearchType("movie")}
                className={`h-9 rounded-lg border text-xs font-semibold uppercase tracking-[0.08em] transition ${
                  searchType === "movie"
                    ? "border-saffron/70 bg-saffron/20 text-saffron"
                    : "border-white/15 bg-slate-950/40 text-slate-300 hover:border-saffron/40"
                }`}
              >
                Movies
              </button>
              <button
                type="button"
                onClick={() => setSearchType("tv")}
                className={`h-9 rounded-lg border text-xs font-semibold uppercase tracking-[0.08em] transition ${
                  searchType === "tv"
                    ? "border-saffron/70 bg-saffron/20 text-saffron"
                    : "border-white/15 bg-slate-950/40 text-slate-300 hover:border-saffron/40"
                }`}
              >
                Web Series
              </button>
            </div>
            <form onSubmit={onSubmitSearch} className="space-y-3">
              <label htmlFor="movie-name" className="text-sm text-slate-300">
                {searchType === "tv" ? "Series title" : "Movie title"}
              </label>
              <input
                id="movie-name"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchMessage("");
                }}
                className="h-11 w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 text-white outline-none ring-saffron transition focus:ring-2"
                placeholder={
                  searchType === "tv"
                    ? "e.g. Breaking Bad"
                    : "e.g. Interstellar"
                }
              />
              {searchQuery.trim().length >= 2 ? (
                <p className="text-xs text-slate-400">
                  Showing close matches for &quot;{searchQuery.trim()}&quot;
                  {isPreviewLoading ? "..." : ""}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={isSearching}
                className="h-11 w-full rounded-xl border border-saffron/40 bg-saffron/10 font-semibold text-saffron transition hover:bg-saffron/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSearching
                  ? "Searching..."
                  : searchType === "tv"
                    ? "Search Web Series"
                    : "Search Movie"}
              </button>
            </form>

            {searchMessage ? (
              <p className="mt-3 text-xs text-amber-300">{searchMessage}</p>
            ) : null}

            {searchResults.length > 0 ? (
              <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                {searchResults.map((movie) => (
                  <button
                    key={`search-${movie.mediaType}-${movie.id}`}
                    type="button"
                    onClick={() => pickMovie(movie.id, movie.mediaType)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-2 text-left transition hover:border-saffron/60"
                  >
                    <div className="relative h-16 w-12 overflow-hidden rounded-md bg-slate-900">
                      {posterUrl(movie.posterPath) &&
                      !failedImages.has(movie.id) ? (
                        <Image
                          src={posterUrl(movie.posterPath)!}
                          alt={movie.title}
                          fill
                          sizes="48px"
                          onLoad={() => handleImageLoad(movie.id)}
                          onError={() => handleImageError(movie.id)}
                          className={`object-cover transition-opacity duration-500 ${
                            loadedImages.has(movie.id)
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                          No Poster
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {movie.title}
                      </p>
                      <p className="text-xs text-slate-300">
                        {movie.mediaType === "tv" ? "TV" : "Movie"} • ⭐{" "}
                        {movie.rating} • {movie.releaseDate || "N/A"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

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
            Streaming {selectedMediaType === "tv" ? "Series" : "Movie"} ID:{" "}
            <span className="font-semibold text-saffron">
              {selectedMovieId}
            </span>
            {selectedMediaType === "tv" ? (
              <span className="ml-2 text-slate-300">
                • S{safeSeason} E{safeEpisode}
              </span>
            ) : null}
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
                    onClick={() => pickMovie(movie.id)}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 text-left transition hover:-translate-y-1 hover:border-saffron/70"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                      {posterUrl(movie.posterPath) &&
                      !failedImages.has(movie.id) ? (
                        <>
                          {!loadedImages.has(movie.id) && (
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-700 animate-pulse" />
                          )}
                          <Image
                            src={posterUrl(movie.posterPath)!}
                            alt={movie.title}
                            fill
                            sizes="(max-width: 768px) 50vw, 200px"
                            onLoad={() => handleImageLoad(movie.id)}
                            onError={() => handleImageError(movie.id)}
                            className={`object-cover transition-opacity duration-500 group-hover:scale-105 ${
                              loadedImages.has(movie.id)
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                        </>
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-saffron/20 to-coral/20 flex items-center justify-center transition duration-300 group-hover:from-saffron/30 group-hover:to-coral/30">
                          <div className="text-center text-xs text-slate-400">
                            <p>🎬</p>
                            <p>No Poster</p>
                          </div>
                        </div>
                      )}
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
