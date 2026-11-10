"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Plus } from "lucide-react";
import { backdropUrl, posterUrl } from "@/lib/media-urls";

export type RailItem = {
  id: number;
  title: string;
  overview?: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  rating: number;
  mediaType: "movie" | "tv";
};

type MovieCardProps<T extends RailItem> = {
  movie: T;
  rank?: number;
  inList?: boolean;
  onOpen: (movie: T) => void;
  onToggleList?: (movie: T) => void;
};

export function MovieCard<T extends RailItem>({
  movie,
  rank,
  inList = false,
  onOpen,
  onToggleList,
}: MovieCardProps<T>) {
  const poster = posterUrl(movie.posterPath);
  const backdrop = backdropUrl(movie.backdropPath, "w500");
  const image = poster || backdrop;

  return (
    <div className="movie-card group/card">
      <div className="movie-card__image">
        {image ? (
          <Image
            src={image}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 36vw, (max-width: 1024px) 22vw, 15vw"
            className="movie-card__poster"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#181818] p-3 text-center">
            <p className="text-[11px] font-semibold uppercase leading-tight text-[#6f6f6f]">
              {movie.title}
            </p>
          </div>
        )}

        <div className="movie-card__filter" />

        {rank !== undefined && (
          <span className="movie-card__rank">
            <span className="movie-card__rank-label">Top</span>
            <span className="movie-card__rank-num">{rank}</span>
          </span>
        )}

        <button
          type="button"
          onClick={() => onOpen(movie)}
          aria-label={movie.title}
          className="absolute inset-0 z-[2] h-full w-full cursor-pointer"
        />

        {onToggleList && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleList(movie);
            }}
            aria-label={inList ? "Remove from My List" : "Add to My List"}
            className="movie-card__corner"
          >
            {inList ? (
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            ) : (
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
          </button>
        )}
      </div>

      <h3 className="movie-card__title">{movie.title}</h3>

      <p className="movie-card__meta">
        {movie.rating > 0 ? (
          <>
            <span className="movie-card__score">
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3 fill-[#e50914] text-[#e50914]"
                aria-hidden="true"
              >
                <path d="M12 2l2.9 6.26L21.5 9.3l-4.8 4.4 1.3 6.5L12 16.9 6 20.2l1.3-6.5L2.5 9.3l6.6-1.04L12 2z" />
              </svg>
              {movie.rating.toFixed(1)}
            </span>
            <span className="movie-card__dot">•</span>
          </>
        ) : null}
        {movie.releaseDate ? (
          <>
            <span>{movie.releaseDate.slice(0, 4)}</span>
            <span className="movie-card__dot">•</span>
          </>
        ) : null}
        <span>{movie.mediaType === "tv" ? "Series" : "Movie"}</span>
      </p>
    </div>
  );
}

type MovieRowProps<T extends RailItem> = {
  title: string;
  movies: T[];
  isTop10?: boolean;
  onOpen: (movie: T) => void;
  onToggleList?: (movie: T) => void;
  isInList?: (movie: T) => boolean;
};

export function MovieRow<T extends RailItem>({
  title,
  movies,
  isTop10 = false,
  onOpen,
  onToggleList,
  isInList,
}: MovieRowProps<T>) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges, movies.length]);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 240);
    el.scrollBy({ left: amount * direction, behavior: "smooth" });
  };

  return (
    <section className="scroll-row group/row">
      <h2 className="row-heading">{title}</h2>

      <div className="relative">
        <div ref={trackRef} className="scroll-row__track">
          {movies.length === 0 ? (
            <div className="w-full rounded-xl border border-white/[0.06] bg-[#181818] px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[#f2f2f2]">
                No titles here yet
              </p>
              <p className="mt-1 text-xs text-[#6f6f6f]">
                We couldn&apos;t find anything in this category. Try another
                section.
              </p>
            </div>
          ) : (
            movies.map((movie, index) => (
              <MovieCard
                key={`${movie.mediaType}-${movie.id}`}
                movie={movie}
                rank={isTop10 ? index + 1 : undefined}
                inList={isInList ? isInList(movie) : false}
                onOpen={onOpen}
                onToggleList={onToggleList}
              />
            ))
          )}
        </div>

        {!atStart && (
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="scroll-row__arrow scroll-row__arrow--prev"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {!atEnd && (
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="scroll-row__arrow scroll-row__arrow--next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </section>
  );
}
