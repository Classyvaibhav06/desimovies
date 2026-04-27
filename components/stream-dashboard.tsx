/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CategoryWithMovies,
  SearchResult,
  MovieSummary,
} from "@/lib/tmdb";
import {
  Play,
  Info,
  Search as SearchIcon,
  Bell,
  User,
  X,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  Maximize,
} from "lucide-react";

type StreamDashboardProps = {
  categories: CategoryWithMovies[];
  fallbackMovieId: number;
};

type MediaType = "movie" | "tv";

const CATEGORY_CONFIGS: Array<{
  key: string;
  label: string;
  endpoint: string;
  mediaType: "movie" | "tv";
}> = [
  {
    key: "trending",
    label: "Trending Now",
    endpoint: "/trending/all/day",
    mediaType: "movie",
  },
  {
    key: "popular-movies",
    label: "Popular Movies",
    endpoint: "/movie/popular",
    mediaType: "movie",
  },
  {
    key: "top-10-movies",
    label: "Top 10 Movies Today",
    endpoint: "/movie/popular",
    mediaType: "movie",
  },
  {
    key: "top-rated",
    label: "Top Rated Movies",
    endpoint: "/movie/top_rated",
    mediaType: "movie",
  },
  {
    key: "popular-tv",
    label: "Popular TV Shows",
    endpoint: "/tv/popular",
    mediaType: "tv",
  },
  {
    key: "top-10-tv",
    label: "Top 10 TV Shows Today",
    endpoint: "/tv/popular",
    mediaType: "tv",
  },
  {
    key: "new-movies",
    label: "New on desimaovies",
    endpoint: "/movie/now_playing",
    mediaType: "movie",
  },
  {
    key: "new-tv",
    label: "New TV Series",
    endpoint: "/tv/on_the_air",
    mediaType: "tv",
  },
  {
    key: "upcoming",
    label: "Coming Soon",
    endpoint: "/movie/upcoming",
    mediaType: "movie",
  },
  {
    key: "desi-picks",
    label: "Desi Picks",
    endpoint: "/discover/movie?with_origin_country=IN&sort_by=popularity.desc",
    mediaType: "movie",
  },
];

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
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/w500${path}`;
}

function backdropUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/original${path}`;
}

export default function StreamDashboard({
  categories,
  fallbackMovieId,
}: StreamDashboardProps) {
  const [selectedMediaType, setSelectedMediaType] =
    useState<MediaType>("movie");
  const [selectedMovieId, setSelectedMovieId] =
    useState<number>(fallbackMovieId);
  const [season, setSeason] = useState<number>(1);
  const [episode, setEpisode] = useState<number>(1);
  const [selectedMovieDetails, setSelectedMovieDetails] =
    useState<SearchResult | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNavbarBlack, setIsNavbarBlack] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "home" | "tv" | "movies" | "new-popular" | "my-list"
  >("home");
  const [myList, setMyList] = useState<(MovieSummary | SearchResult)[]>([]);
  const [watchHistory, setWatchHistory] = useState<
    (MovieSummary | SearchResult)[]
  >([]);
  const [language, setLanguage] = useState("en-US");
  const [detailMovie, setDetailMovie] = useState<
    MovieSummary | SearchResult | null
  >(null);
  const [detailData, setDetailData] = useState<
    (SearchResult & { similar?: SearchResult[]; seasonDetails?: any[] }) | null
  >(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailSeason, setDetailSeason] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const GENRES = useMemo(() => {
    if (activeSection === "movies")
      return [
        { id: "28", name: "Action" },
        { id: "12", name: "Adventure" },
        { id: "16", name: "Animation" },
        { id: "35", name: "Comedy" },
        { id: "80", name: "Crime" },
        { id: "18", name: "Drama" },
        { id: "27", name: "Horror" },
        { id: "10749", name: "Romance" },
        { id: "878", name: "Sci-Fi" },
      ];
    if (activeSection === "tv")
      return [
        { id: "10759", name: "Action & Adventure" },
        { id: "16", name: "Animation" },
        { id: "35", name: "Comedy" },
        { id: "80", name: "Crime" },
        { id: "18", name: "Drama" },
        { id: "9648", name: "Mystery" },
        { id: "10765", name: "Sci-Fi & Fantasy" },
      ];
    return [];
  }, [activeSection]);

  // Load history and list from local storage
  useEffect(() => {
    const savedList = localStorage.getItem("myList");
    if (savedList) setMyList(JSON.parse(savedList));

    const savedHistory = localStorage.getItem("watchHistory");
    if (savedHistory) setWatchHistory(JSON.parse(savedHistory));
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem("myList", JSON.stringify(myList));
  }, [myList]);

  useEffect(() => {
    localStorage.setItem("watchHistory", JSON.stringify(watchHistory));
  }, [watchHistory]);

  // Auto-scroll navbar effect
  useEffect(() => {
    const handleScroll = () => {
      setIsNavbarBlack(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch movie details when ID changes
  useEffect(() => {
    async function fetchDetails() {
      try {
        const response = await fetch(
          `/api/movies/details?id=${selectedMovieId}&type=${selectedMediaType}`,
        );
        if (response.ok) {
          const data = await response.json();
          setSelectedMovieDetails(data);
        }
      } catch (error) {
        console.error("Failed to fetch details:", error);
      }
    }
    fetchDetails();
  }, [selectedMovieId, selectedMediaType]);

  const embedUrl = useMemo(
    () => buildEmbedUrl(selectedMediaType, selectedMovieId, season, episode),
    [selectedMediaType, selectedMovieId, season, episode],
  );

  const heroMovie = useMemo(() => {
    const list =
      activeSection === "my-list"
        ? myList
        : activeSection === "home"
          ? categories.flatMap((c) => c.movies)
          : activeSection === "tv"
            ? categories
                .filter((c) => c.mediaType === "tv")
                .flatMap((c) => c.movies)
            : activeSection === "movies"
              ? categories
                  .filter((c) => c.mediaType === "movie")
                  .flatMap((c) => c.movies)
              : categories
                  .filter((c) =>
                    ["new-movies", "new-tv", "upcoming", "trending"].includes(
                      c.key,
                    ),
                  )
                  .flatMap((c) => c.movies);

    // Try to find "The Boys" or a prominent item in the list
    const featured = list.find(
      (m) =>
        m.title.toLowerCase().includes("boys") ||
        m.title.toLowerCase().includes("inception") ||
        m.title.toLowerCase().includes("dark"),
    );
    if (featured) return featured;
    return list[0];
  }, [categories, activeSection, myList]);

  async function handleSearch(q: string) {
    setSearchQuery(q);
    const isNumeric = /^\d+$/.test(q);
    if (!isNumeric && q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      // Search for both movies and TV to ensure everything is found
      const [moviesRes, tvRes] = await Promise.all([
        fetch(
          `/api/search?q=${encodeURIComponent(q)}&type=movie&lang=${language}`,
        ),
        fetch(
          `/api/search?q=${encodeURIComponent(q)}&type=tv&lang=${language}`,
        ),
      ]);

      const [moviesData, tvData] = await Promise.all([
        moviesRes.json(),
        tvRes.json(),
      ]);

      const combined = [
        ...(moviesData.results || []),
        ...(tvData.results || []),
      ];
      // Basic deduplication and sorting by rating/relevance
      const uniqueResults = combined.filter(
        (v, i, a) =>
          a.findIndex((t) => t.id === v.id && t.mediaType === v.mediaType) ===
          i,
      );

      setSearchResults(uniqueResults.slice(0, 20));
    } catch (e) {
      console.error(e);
    }
  }

  function playMovie(movie: MovieSummary | SearchResult) {
    setSelectedMovieId(movie.id);
    setSelectedMediaType(movie.mediaType);
    setSeason(1);
    setEpisode(1);
    setIsPlayerOpen(true);
    setDetailMovie(null);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Update watch history
    setWatchHistory((prev) => {
      const filtered = prev.filter(
        (m) => !(m.id === movie.id && m.mediaType === movie.mediaType),
      );
      return [movie, ...filtered].slice(0, 10);
    });
  }

  async function openDetail(movie: MovieSummary | SearchResult) {
    setDetailMovie(movie);
    setDetailData(null);
    setDetailSeason(1);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(
        `/api/movies/details?id=${movie.id}&type=${movie.mediaType}&season=1`,
      );
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      }
    } catch {
      /* use basic info */
    } finally {
      setIsLoadingDetail(false);
    }
  }

  useEffect(() => {
    async function fetchNewSeason() {
      if (!detailMovie || detailMovie.mediaType !== "tv" || !detailSeason)
        return;
      try {
        const res = await fetch(
          `/api/movies/details?id=${detailMovie.id}&type=tv&season=${detailSeason}`,
        );
        if (res.ok) {
          const data = await res.json();
          setDetailData((prev) =>
            prev ? { ...prev, seasonDetails: data.seasonDetails } : null,
          );
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchNewSeason();
  }, [detailSeason, detailMovie]);

  const filteredCategories = useMemo(() => {
    let base = categories;
    if (activeSection === "my-list")
      return [
        {
          key: "my-list",
          label: "My List",
          movies: myList,
          mediaType: "movie",
        },
      ];
    if (activeSection === "tv")
      base = categories.filter((c) => c.mediaType === "tv");
    else if (activeSection === "movies")
      base = categories.filter((c) => c.mediaType === "movie");
    else if (activeSection === "new-popular")
      base = categories.filter((c) =>
        ["new-movies", "new-tv", "upcoming", "trending"].includes(c.key),
      );

    if (selectedGenre) {
      return base
        .map((category) => ({
          ...category,
          movies: category.movies.filter((m) =>
            m.genreIds?.includes(Number(selectedGenre)),
          ),
        }))
        .filter((c) => c.movies.length > 0);
    }

    return base;
  }, [categories, activeSection, myList, selectedGenre]);

  function toggleMyList(movie: MovieSummary | SearchResult) {
    setMyList((prev) => {
      const exists = prev.some(
        (m) => m.id === movie.id && m.mediaType === movie.mediaType,
      );
      return exists
        ? prev.filter(
            (m) => !(m.id === movie.id && m.mediaType === movie.mediaType),
          )
        : [movie, ...prev];
    });
  }

  function isInMyList(movie: MovieSummary | SearchResult) {
    return myList.some(
      (m) => m.id === movie.id && m.mediaType === movie.mediaType,
    );
  }

  return (
    <div className="relative min-h-screen bg-[#141414]">
      {/* Navbar */}
      <nav
        className={`fixed top-0 z-[100] w-full px-3 py-3 transition-all duration-500 md:px-12 md:py-4 ${isNavbarBlack || isPlayerOpen ? "bg-[#141414]/95 backdrop-blur-md shadow-2xl" : "bg-transparent bg-gradient-to-b from-black/80 to-transparent"}`}
      >
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-8">
            <div className="flex flex-col leading-none">
              <div className="text-2xl font-black tracking-tighter text-[#E50914] sm:text-3xl">
                desi_movies
              </div>
              <div className="mt-1 whitespace-nowrap text-[7px] font-medium uppercase tracking-[0.18em] text-white/60 max-[380px]:hidden sm:text-[10px] sm:tracking-[0.3em]">
                made by vaibhav ghoshi
              </div>
            </div>
            <div className="hidden items-center gap-5 text-sm font-medium text-gray-200 lg:flex">
              <button
                onClick={() => {
                  setActiveSection("home");
                  setIsPlayerOpen(false);
                  setSelectedGenre(null);
                }}
                className={`transition-colors hover:text-gray-300 ${activeSection === "home" ? "text-white font-bold" : "text-gray-400"}`}
              >
                Home
              </button>
              <button
                onClick={() => {
                  setActiveSection("tv");
                  setIsPlayerOpen(false);
                  setSelectedGenre(null);
                }}
                className={`transition-colors hover:text-gray-300 ${activeSection === "tv" ? "text-white font-bold" : "text-gray-400"}`}
              >
                TV Shows
              </button>
              <button
                onClick={() => {
                  setActiveSection("movies");
                  setIsPlayerOpen(false);
                  setSelectedGenre(null);
                }}
                className={`transition-colors hover:text-gray-300 ${activeSection === "movies" ? "text-white font-bold" : "text-gray-400"}`}
              >
                Movies
              </button>
              <button
                onClick={() => {
                  setActiveSection("new-popular");
                  setIsPlayerOpen(false);
                  setSelectedGenre(null);
                }}
                className={`transition-colors hover:text-gray-300 ${activeSection === "new-popular" ? "text-white font-bold" : "text-gray-400"}`}
              >
                New &amp; Popular
              </button>
              <button
                onClick={() => {
                  setActiveSection("my-list");
                  setIsPlayerOpen(false);
                  setSelectedGenre(null);
                }}
                className={`transition-colors hover:text-gray-300 ${activeSection === "my-list" ? "text-white font-bold" : "text-gray-400"}`}
              >
                My List{" "}
                {myList.length > 0 && (
                  <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold">
                    {myList.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white sm:gap-4 md:gap-6">
            <div
              className={`flex items-center gap-2 border border-white/40 bg-black/40 px-2 py-1 transition-all ${isSearchOpen ? "w-[min(16rem,52vw)] opacity-100 sm:w-64" : "w-9 overflow-hidden sm:w-10"}`}
            >
              <SearchIcon
                className="h-4 w-4 cursor-pointer shrink-0 sm:h-5 sm:w-5"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              />
              <input
                type="text"
                placeholder="Titles, genres, or TMDB ID"
                className="w-full bg-transparent text-xs outline-none sm:text-sm"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searchQuery && (
                <X
                  className="h-4 w-4 cursor-pointer"
                  onClick={() => setSearchQuery("")}
                />
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="hidden bg-transparent text-xs text-gray-400 outline-none border border-white/20 px-1 py-0.5 transition-colors hover:text-white sm:block"
              >
                <option value="en-US" className="bg-[#141414]">
                  English
                </option>
                <option value="hi-IN" className="bg-[#141414]">
                  हिन्दी (Hindi)
                </option>
              </select>
              <Bell className="hidden h-5 w-5 cursor-pointer transition-colors hover:text-gray-300 sm:block" />
              <div className="relative">
                <div
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                  <div className="h-8 w-8 overflow-hidden rounded bg-blue-500 group-hover:ring-2 group-hover:ring-white transition-all">
                    <User className="h-full w-full p-1" />
                  </div>
                  <div
                    className={`hidden border-l-4 border-r-4 border-t-4 border-transparent border-t-white transition-transform duration-300 sm:block ${isProfileOpen ? "rotate-180" : ""}`}
                  />
                </div>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-4 w-48 bg-black/95 border border-white/10 py-2 shadow-2xl backdrop-blur-md">
                    <div className="absolute -top-2 right-4 h-0 w-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white/10" />
                    <div className="px-4 py-2 flex items-center gap-3 border-b border-white/10 hover:bg-white/5 cursor-pointer">
                      <div className="h-8 w-8 rounded bg-red-600 flex items-center justify-center text-[10px] font-bold">
                        KIDS
                      </div>
                      <span className="text-xs font-medium">Kids Profile</span>
                    </div>
                    <button className="w-full text-left px-4 py-2 text-[11px] font-medium hover:underline">
                      Manage Profiles
                    </button>
                    <div className="border-t border-white/10 mt-2 pt-2">
                      <button className="w-full text-left px-4 py-2 text-[11px] font-medium hover:underline">
                        Account
                      </button>
                      <button className="w-full text-left px-4 py-2 text-[11px] font-medium hover:underline">
                        Help Center
                      </button>
                      <button className="w-full text-left px-4 py-2 text-[11px] font-bold hover:underline mt-2">
                        Sign Out of desimaovies
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium text-gray-200 lg:hidden">
          <button
            onClick={() => {
              setActiveSection("home");
              setIsPlayerOpen(false);
              setSelectedGenre(null);
            }}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 transition-colors ${activeSection === "home" ? "border-white bg-white text-black" : "border-white/20 bg-black/35 text-gray-200"}`}
          >
            Home
          </button>
          <button
            onClick={() => {
              setActiveSection("tv");
              setIsPlayerOpen(false);
              setSelectedGenre(null);
            }}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 transition-colors ${activeSection === "tv" ? "border-white bg-white text-black" : "border-white/20 bg-black/35 text-gray-200"}`}
          >
            TV Shows
          </button>
          <button
            onClick={() => {
              setActiveSection("movies");
              setIsPlayerOpen(false);
              setSelectedGenre(null);
            }}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 transition-colors ${activeSection === "movies" ? "border-white bg-white text-black" : "border-white/20 bg-black/35 text-gray-200"}`}
          >
            Movies
          </button>
          <button
            onClick={() => {
              setActiveSection("new-popular");
              setIsPlayerOpen(false);
              setSelectedGenre(null);
            }}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 transition-colors ${activeSection === "new-popular" ? "border-white bg-white text-black" : "border-white/20 bg-black/35 text-gray-200"}`}
          >
            New &amp; Popular
          </button>
          <button
            onClick={() => {
              setActiveSection("my-list");
              setIsPlayerOpen(false);
              setSelectedGenre(null);
            }}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 transition-colors ${activeSection === "my-list" ? "border-white bg-white text-black" : "border-white/20 bg-black/35 text-gray-200"}`}
          >
            My List {myList.length > 0 ? `(${myList.length})` : ""}
          </button>
        </div>
      </nav>

      {/* Hero Banner / Player Overlay */}
      <section className="relative h-[82vh] w-full pt-8 sm:h-[85vh] lg:h-[95vh] lg:pt-0">
        {/* Section Title & Genre Filter for Movies/TV */}
        {!isPlayerOpen &&
          (activeSection === "movies" || activeSection === "tv") && (
            <div className="absolute left-4 top-32 z-[45] flex items-center gap-3 sm:top-24 sm:gap-6 md:left-12">
              <h2 className="text-2xl font-bold text-white capitalize sm:text-3xl">
                {activeSection}
              </h2>
              <div className="relative">
                <select
                  value={selectedGenre || ""}
                  onChange={(e) => setSelectedGenre(e.target.value || null)}
                  className="appearance-none rounded-sm border border-white/40 bg-black px-3 py-1 pr-8 text-xs font-bold text-white transition-colors hover:bg-zinc-900 sm:px-4 sm:pr-10 sm:text-sm"
                >
                  <option value="">Genres</option>
                  {GENRES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white">
                  <div className="h-0 w-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />
                </div>
              </div>
            </div>
          )}
        {isPlayerOpen ? (
          <div className="absolute inset-0 z-40 flex flex-col bg-[#141414] pt-16 md:pt-20">
            <div className="relative flex-grow">
              <iframe
                src={embedUrl}
                className="h-full w-full border-0"
                allowFullScreen
              />
              <button
                onClick={() => setIsPlayerOpen(false)}
                className="absolute right-3 top-3 z-50 rounded-full bg-black/60 p-2 text-white transition-all hover:scale-110 hover:bg-black/80 md:right-8 md:top-8"
                title="Close Player"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {selectedMediaType === "tv" && (
              <div className="flex flex-wrap items-center gap-4 border-t border-white/10 bg-[#141414] px-4 py-4 md:px-12">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                    Season
                  </label>
                  <select
                    value={season}
                    onChange={(e) => {
                      setSeason(Number(e.target.value));
                      setEpisode(1);
                    }}
                    className="bg-zinc-800 text-white text-sm px-3 py-1.5 rounded border border-white/10 outline-none focus:border-red-600 transition-colors cursor-pointer"
                  >
                    {Array.from(
                      { length: selectedMovieDetails?.numberOfSeasons || 1 },
                      (_, i) => i + 1,
                    ).map((s) => (
                      <option key={s} value={s}>
                        Season {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                    Episode
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={episode}
                      onChange={(e) => setEpisode(Number(e.target.value))}
                      className="w-20 rounded border border-white/10 bg-zinc-800 px-2 py-1.5 text-sm text-white outline-none transition-colors focus:border-red-600 sm:w-24 sm:px-3"
                    >
                      {Array.from(
                        {
                          length:
                            selectedMovieDetails?.seasons?.find(
                              (s) => s.seasonNumber === season,
                            )?.episodeCount || 20,
                        },
                        (_, i) => i + 1,
                      ).map((e) => (
                        <option key={e} value={e}>
                          Episode {e}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEpisode(Math.max(1, episode - 1))}
                        className="bg-zinc-800 p-1.5 rounded hover:bg-zinc-700 disabled:opacity-30"
                        disabled={episode <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          const maxEp =
                            selectedMovieDetails?.seasons?.find(
                              (s) => s.seasonNumber === season,
                            )?.episodeCount || 99;
                          if (episode < maxEp) setEpisode(episode + 1);
                        }}
                        className="bg-zinc-800 p-1.5 rounded hover:bg-zinc-700 disabled:opacity-30"
                        disabled={
                          episode >=
                          (selectedMovieDetails?.seasons?.find(
                            (s) => s.seasonNumber === season,
                          )?.episodeCount || 99)
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="w-full sm:ml-auto sm:w-auto">
                  <p className="text-sm font-medium text-white truncate max-w-xs">
                    Playing: {selectedMovieDetails?.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    S{season} E{episode}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          heroMovie && (
            <>
              <div className="absolute inset-0 z-0">
                <Image
                  src={
                    backdropUrl(heroMovie.backdropPath) ||
                    posterUrl(heroMovie.posterPath)!
                  }
                  alt={heroMovie.title}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="hero-vignette absolute inset-0 z-10" />
                <div className="hero-vignette-left absolute inset-0 z-10" />
              </div>

              <div className="absolute bottom-20 left-4 z-20 flex max-w-[90%] flex-col gap-3 sm:bottom-1/4 sm:max-w-xl sm:gap-4 md:left-12 lg:bottom-1/3">
                <h1 className="animate-banner-text text-3xl font-extrabold uppercase italic tracking-tighter text-white drop-shadow-2xl sm:text-5xl md:text-7xl">
                  {heroMovie.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white drop-shadow-md sm:gap-3 sm:text-sm">
                  <span className="text-green-400">
                    {heroMovie.rating * 10}% Match
                  </span>
                  <span>{heroMovie.releaseDate.slice(0, 4)}</span>
                  <span className="border border-white/40 px-1 py-0.5 text-[10px] uppercase">
                    HD
                  </span>
                  {heroMovie.mediaType === "tv" && (
                    <span className="text-gray-300">TV Series</span>
                  )}
                </div>
                <p className="line-clamp-3 max-w-2xl text-sm text-white drop-shadow-md sm:text-base md:text-lg">
                  {heroMovie.overview}
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => playMovie(heroMovie)}
                    className="flex items-center gap-2 rounded bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-white/80 sm:px-8 sm:text-lg"
                  >
                    <Play className="h-5 w-5 fill-black sm:h-6 sm:w-6" /> Play
                  </button>
                  <button className="flex items-center gap-2 rounded bg-gray-500/70 px-5 py-2 text-sm font-bold text-white transition hover:bg-gray-500/50 sm:px-8 sm:text-lg">
                    <Info className="h-5 w-5 sm:h-6 sm:w-6" /> More Info
                  </button>
                </div>
              </div>

              <div className="absolute bottom-20 right-0 z-20 flex items-center gap-2 pr-3 sm:bottom-1/4 sm:gap-4 sm:pr-12 lg:bottom-1/3">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="rounded-full border-2 border-white/50 p-2 text-white hover:border-white"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </button>
                <div className="border-l-4 border-white bg-black/40 px-2 py-1 text-sm font-medium text-white backdrop-blur-sm sm:px-4 sm:text-lg">
                  TV-MA
                </div>
              </div>
            </>
          )
        )}
      </section>

      {/* Rows & Footer (Hidden when player is open for distraction-free viewing) */}
      {!isPlayerOpen && (
        <>
          <div className="relative z-30 -mt-20 space-y-8 pb-20 md:-mt-32">
            {/* Continue Watching Section (Only in Home) */}
            {activeSection === "home" && watchHistory.length > 0 && (
              <div className="space-y-2 px-4 md:px-12">
                <h2 className="flex items-center gap-1 text-lg font-bold text-white transition-colors hover:text-gray-300">
                  Continue Watching <ChevronRight className="h-4 w-4 ml-1" />
                </h2>
                <div className="no-scrollbar flex gap-3 overflow-x-auto overflow-y-hidden px-2 py-4 sm:gap-4">
                  {watchHistory.map((movie, idx) => (
                    <div
                      key={`continue-${movie.id}-${idx}`}
                      className="group relative aspect-video w-[170px] flex-shrink-0 cursor-pointer overflow-hidden rounded-md transition-transform duration-300 hover:scale-105 hover:z-40 sm:w-[200px] md:w-[280px]"
                      onClick={() => playMovie(movie)}
                    >
                      <Image
                        src={
                          backdropUrl(movie.backdropPath) ||
                          posterUrl(movie.posterPath)!
                        }
                        alt={movie.title}
                        fill
                        sizes="(max-width: 640px) 170px, (max-width: 768px) 200px, 280px"
                        className="object-cover"
                      />
                      <div className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white uppercase border border-white/20 backdrop-blur-sm">
                        {movie.mediaType === "tv"
                          ? "Resuming"
                          : "Recently Played"}
                      </div>
                      {/* Progress Bar Mockup */}
                      <div className="absolute bottom-0 h-1 w-full bg-gray-600/50">
                        <div
                          className="h-full bg-red-600"
                          style={{ width: `${((idx * 7 + 40) % 80) + 20}%` }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-10 w-10 text-white fill-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredCategories.map((category) => {
              const isTop10 = category.key.includes("top-10");
              return (
                <div key={category.key} className="space-y-3 px-4 md:px-12">
                  <h2 className="flex items-center gap-1.5 text-xl font-bold text-white hover:text-gray-200 transition-colors cursor-pointer group/title">
                    {category.label}
                    <ChevronRight className="h-5 w-5 text-[#E50914] opacity-0 -translate-x-1 transition-all duration-200 group-hover/title:opacity-100 group-hover/title:translate-x-0" />
                  </h2>

                  <div className="relative">
                    <div className="no-scrollbar flex gap-3 overflow-x-auto overflow-y-hidden py-6 px-1">
                      {category.movies.map((movie, index) => (
                        <div
                          key={`${category.key}-${movie.id}`}
                          className={`group/card relative flex-shrink-0 cursor-pointer ${isTop10 ? "h-[220px] w-[160px] ml-8 first:ml-5 sm:h-[250px] sm:w-[180px] sm:ml-10 sm:first:ml-7 md:h-[280px] md:w-[200px] md:ml-12 md:first:ml-8" : "h-[200px] w-[140px] sm:h-[220px] sm:w-[150px] md:h-[270px] md:w-[185px]"}`}
                          onClick={() => openDetail(movie)}
                        >
                          {isTop10 && (
                            <span className="top10-number -left-14">
                              {index + 1}
                            </span>
                          )}

                          {/* Card */}
                          <div className="relative h-full w-full overflow-hidden rounded-lg shadow-xl bg-zinc-900 transition-all duration-300 group-hover/card:scale-110 group-hover/card:shadow-[0_20px_60px_rgba(0,0,0,0.8)] group-hover/card:z-40 group-hover/card:ring-2 group-hover/card:ring-white/20">
                            {posterUrl(movie.posterPath) ||
                            backdropUrl(movie.backdropPath) ? (
                              <Image
                                src={
                                  posterUrl(movie.posterPath) ||
                                  backdropUrl(movie.backdropPath)!
                                }
                                alt={movie.title}
                                fill
                                sizes="(max-width: 640px) 140px, (max-width: 768px) 150px, 185px"
                                className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-zinc-800 p-3 text-center">
                                <p className="text-xs font-bold text-gray-500 uppercase">
                                  {movie.title}
                                </p>
                              </div>
                            )}

                            {/* Gradient overlay always visible at bottom */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

                            {/* Hover info panel */}
                            <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover/card:translate-y-0 transition-transform duration-300 p-3 bg-gradient-to-t from-black via-black/95 to-transparent rounded-b-lg">
                              <p className="text-xs font-bold text-white leading-tight line-clamp-2 mb-2">
                                {movie.title}
                              </p>
                              <div className="flex items-center gap-2">
                                {/* Play button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetail(movie);
                                  }}
                                  className="flex items-center justify-center w-8 h-8 rounded-full bg-white hover:bg-gray-200 transition-all duration-200 hover:scale-110 flex-shrink-0"
                                  title="Play"
                                >
                                  <Play className="h-3.5 w-3.5 text-black fill-black ml-0.5" />
                                </button>
                                {/* My List button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMyList(movie);
                                  }}
                                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 flex-shrink-0 ${
                                    isInMyList(movie)
                                      ? "border-white bg-white text-black"
                                      : "border-gray-400 bg-transparent text-white hover:border-white"
                                  }`}
                                  title={
                                    isInMyList(movie)
                                      ? "Remove from My List"
                                      : "Add to My List"
                                  }
                                >
                                  <span className="text-sm font-bold leading-none">
                                    {isInMyList(movie) ? "✓" : "+"}
                                  </span>
                                </button>
                                {/* Rating */}
                                {movie.rating > 0 && (
                                  <span className="ml-auto text-[10px] font-bold text-green-400">
                                    ⭐ {movie.rating}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* New badge */}
                            {index === 0 && (
                              <div className="absolute top-2 left-0 bg-[#E50914] px-2 py-0.5 text-[9px] font-black text-white uppercase tracking-widest">
                                NEW
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Empty My List state */}
                  {activeSection === "my-list" && myList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <div className="mb-4 text-6xl">📋</div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        Your list is empty
                      </h3>
                      <p className="text-gray-400 text-sm max-w-xs">
                        Hover over any movie or show and click{" "}
                        <strong>+</strong> to save it here for later.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <footer className="px-4 py-10 text-gray-500 md:px-12">
            <div className="mb-8 flex gap-8">
              {/* Social links placeholder */}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
              <div>Audio and Subtitles</div>
              <div>Audio Description</div>
              <div>Help Center</div>
              <div>Gift Cards</div>
              <div>Media Center</div>
              <div>Investor Relations</div>
              <div>Jobs</div>
              <div>Terms of Use</div>
              <div>Privacy</div>
              <div>Legal Notices</div>
              <div>Cookie Preferences</div>
              <div>Corporate Information</div>
              <div>Contact Us</div>
            </div>
            <div className="mt-8">
              <button className="border border-gray-500 px-2 py-1 text-xs">
                Service Code
              </button>
            </div>
            <div className="mt-4 text-[10px]">
              © 1997-2026 desimaovies, Inc.
            </div>
          </footer>
        </>
      )}

      {/* Search Results Overlay */}
      {searchQuery && (
        <div className="fixed inset-0 z-[60] bg-[#141414] overflow-y-auto">
          {/* Search Header */}
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-[#141414] px-4 py-4 md:px-12">
            <div className="flex w-full items-center gap-3 sm:w-auto sm:gap-8">
              <div
                className="cursor-pointer text-xl font-black tracking-tighter text-[#E50914] sm:text-2xl"
                onClick={() => setSearchQuery("")}
              >
                desimaovies
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 border border-white/40 bg-black/40 px-3 py-1.5 sm:w-64 md:w-96">
                <SearchIcon className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Titles, genres, or TMDB ID"
                  className="bg-transparent text-sm text-white outline-none w-full"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
                <X
                  className="h-5 w-5 cursor-pointer text-gray-400 hover:text-white"
                  onClick={() => setSearchQuery("")}
                />
              </div>
            </div>
            <button
              onClick={() => setSearchQuery("")}
              className="ml-auto flex items-center gap-2 text-white hover:text-gray-300"
            >
              <span className="hidden md:inline text-sm font-medium">
                Close
              </span>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="px-4 pb-20 pt-8 md:px-12">
            <h2 className="mb-8 text-xl font-medium text-gray-400">
              Showing results for:{" "}
              <span className="text-white font-bold">
                &quot;{searchQuery}&quot;
              </span>
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
              {searchResults.length > 0 ? (
                searchResults.map((movie) => (
                  <div
                    key={movie.id}
                    className="group relative aspect-[2/3] cursor-pointer overflow-hidden rounded-md bg-zinc-800 transition hover:scale-110 hover:z-10"
                    onClick={() => {
                      playMovie(movie);
                      setSearchQuery("");
                    }}
                  >
                    {posterUrl(movie.posterPath) ||
                    backdropUrl(movie.backdropPath) ? (
                      <Image
                        src={
                          posterUrl(movie.posterPath) ||
                          backdropUrl(movie.backdropPath)!
                        }
                        alt={movie.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-800 p-2 text-center">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">
                          {movie.title}
                        </p>
                        <p className="text-[8px] text-gray-600 italic">
                          No Artwork
                        </p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100 flex flex-col justify-end">
                      <p className="line-clamp-2 text-[10px] font-bold text-white leading-tight">
                        {movie.title}
                      </p>
                      <p className="text-[8px] text-gray-300">
                        {movie.rating} •{" "}
                        {movie.mediaType === "tv" ? "TV" : "Movie"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <SearchIcon className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 font-medium">
                    No results found for &quot;{searchQuery}&quot;
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Try checking your spelling or searching for a different
                    title.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailMovie && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 md:p-8"
          onClick={() => setDetailMovie(null)}
        >
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal Card */}
          <div
            className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-zinc-900 shadow-2xl scrollbar-thin scrollbar-track-zinc-800 scrollbar-thumb-zinc-600"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Backdrop image header */}
            <div className="relative h-52 w-full sm:h-64 md:h-80">
              {backdropUrl((detailData ?? detailMovie).backdropPath) ||
              posterUrl((detailData ?? detailMovie).posterPath) ? (
                <Image
                  src={
                    backdropUrl((detailData ?? detailMovie).backdropPath) ||
                    posterUrl((detailData ?? detailMovie).posterPath)!
                  }
                  alt={(detailData ?? detailMovie).title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-zinc-800 flex items-center justify-center">
                  <p className="text-gray-500 text-xl font-bold">
                    {detailMovie.title}
                  </p>
                </div>
              )}
              {/* Gradient over image */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

              {/* Close button */}
              <button
                onClick={() => setDetailMovie(null)}
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/80 text-white backdrop-blur-sm hover:bg-zinc-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Title over image */}
              <div className="absolute bottom-4 left-5 right-5">
                <h2 className="text-2xl font-black text-white md:text-3xl leading-tight">
                  {(detailData ?? detailMovie).title}
                </h2>
              </div>
            </div>

            {/* Info section */}
            <div className="relative space-y-6 p-4 sm:p-6">
              {isLoadingDetail && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/60 backdrop-blur-[2px]">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-8">
                <div className="space-y-4">
                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {(detailData ?? detailMovie).rating > 0 && (
                      <span className="font-bold text-green-400">
                        {(detailData ?? detailMovie).rating * 10}% Match
                      </span>
                    )}
                    {(detailData ?? detailMovie).releaseDate && (
                      <span className="text-gray-400">
                        {(detailData ?? detailMovie).releaseDate.slice(0, 4)}
                      </span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${detailMovie.mediaType === "tv" ? "border-blue-500 text-blue-400" : "border-gray-500 text-gray-400"}`}
                    >
                      {detailMovie.mediaType === "tv" ? "Series" : "Movie"}
                    </span>
                    {(detailData as any)?.genres?.slice(0, 3).map((g: any) => (
                      <span key={g} className="text-gray-300 font-medium">
                        {g}
                      </span>
                    ))}
                  </div>

                  {/* Overview */}
                  {(detailData ?? (detailMovie as any)).overview && (
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {(detailData ?? (detailMovie as any)).overview}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => playMovie(detailMovie)}
                      className="flex items-center gap-2 rounded bg-white px-5 py-2 text-sm font-bold text-black transition-all hover:scale-105 hover:bg-white/90 sm:px-8"
                    >
                      <Play className="h-4 w-4 fill-black" /> Play
                    </button>
                    <button
                      onClick={() => toggleMyList(detailMovie)}
                      className={`flex items-center justify-center h-10 w-10 rounded-full border-2 transition-all hover:scale-105 ${
                        isInMyList(detailMovie)
                          ? "border-white bg-white text-black"
                          : "border-gray-500 bg-transparent text-white hover:border-white"
                      }`}
                      title={
                        isInMyList(detailMovie)
                          ? "In My List"
                          : "Add to My List"
                      }
                    >
                      <span className="text-xl leading-none">
                        {isInMyList(detailMovie) ? "✓" : "+"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-gray-500">Cast: </span>
                    <span className="text-gray-300">
                      Action, Adventure, Fantasy...
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Genres: </span>
                    <span className="text-gray-300">
                      {(detailData as SearchResult)?.genres?.join(", ") ||
                        "N/A"}
                    </span>
                  </div>
                  {(detailData as SearchResult)?.tagline && (
                    <div>
                      <span className="text-gray-500">This show is: </span>
                      <span className="text-gray-300 italic">
                        {(detailData as SearchResult).tagline}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Episodes Section for TV */}
              {detailMovie.mediaType === "tv" && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-bold text-white">Episodes</h3>
                    <select
                      value={detailSeason}
                      onChange={(e) => setDetailSeason(Number(e.target.value))}
                      className="bg-zinc-800 text-white text-sm px-3 py-1.5 rounded border border-white/10 outline-none focus:border-red-600 cursor-pointer"
                    >
                      {Array.from(
                        {
                          length:
                            detailData?.numberOfSeasons ||
                            (detailMovie as SearchResult).numberOfSeasons ||
                            1,
                        },
                        (_, i) => i + 1,
                      ).map((s) => (
                        <option key={s} value={s}>
                          Season {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    {detailData?.seasonDetails ? (
                      detailData.seasonDetails.map((ep: any) => (
                        <div
                          key={ep.id}
                          className="group/ep flex flex-col items-start gap-3 rounded-lg border border-transparent p-3 transition-colors hover:border-white/10 hover:bg-zinc-800 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
                          onClick={() => {
                            setSelectedMovieId(detailMovie.id);
                            setSelectedMediaType("tv");
                            setSeason(detailSeason);
                            setEpisode(ep.episode_number);
                            setIsPlayerOpen(true);
                            setDetailMovie(null);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <span className="w-6 text-xl font-bold text-gray-500">
                            {ep.episode_number}
                          </span>
                          <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded bg-zinc-800">
                            {ep.still_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                                alt={ep.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Play className="h-6 w-6 text-gray-600" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 group-hover/ep:bg-black/0 transition-colors" />
                          </div>
                          <div className="flex-grow">
                            <h4 className="text-sm font-bold text-white">
                              {ep.name}
                            </h4>
                            <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                              {ep.overview || "No description available."}
                            </p>
                          </div>
                          <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                            {ep.runtime} min
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col gap-3">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-20 w-full animate-pulse bg-zinc-800 rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Similar Media Section */}
              {detailData?.similar && detailData.similar.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h3 className="text-xl font-bold text-white">
                    More Like This
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {detailData.similar.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        className="group/item relative aspect-video cursor-pointer overflow-hidden rounded-md bg-zinc-800 transition hover:z-10"
                        onClick={() => openDetail(item)}
                      >
                        <Image
                          src={
                            backdropUrl(item.backdropPath) ||
                            posterUrl(item.posterPath)!
                          }
                          alt={item.title}
                          fill
                          className="object-cover transition-transform group-hover/item:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <Play className="h-8 w-8 text-white fill-white" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                          <p className="text-[10px] font-bold text-white truncate">
                            {item.title}
                          </p>
                          <p className="text-[9px] text-green-400 font-medium">
                            {item.rating * 10}% Match
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
