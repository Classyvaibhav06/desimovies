/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type {
  CategoryWithMovies,
  SearchResult,
  MovieSummary,
} from "@/lib/tmdb";
import { MovieCard, MovieRow } from "@/components/movie-card";
import { backdropUrl, posterUrl } from "@/lib/media-urls";
import {
  buildVidyUrl,
  isVidyOrigin,
  parseVidyPayload,
  readWatchPositions,
  watchPositionKey,
  writeWatchPosition,
} from "@/lib/vidy";
import {
  Play,
  Pause,
  Info,
  Search as SearchIcon,
  User,
  X,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  Loader2,
  Home as HomeIcon,
  Clapperboard,
  Tv as TvIcon,
  Sparkles,
  Menu,
  MoreHorizontal,
  Star,
} from "lucide-react";

type StreamDashboardProps = {
  categories: CategoryWithMovies[];
  fallbackMovieId: number;
  initialPlayback?: InitialPlayback;
  initialDetail?: InitialDetail;
};

type MediaType = "movie" | "tv";

type SectionKey =
  | "home"
  | "tv"
  | "movies"
  | "anime"
  | "new-popular"
  | "my-list"
  | "categories"
  | "sports";

const GENRE_NAMES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10765: "Sci-Fi & Fantasy",
  10768: "War & Politics",
};

const PRIMARY_NAV = [
  { key: "home", label: "Home", icon: HomeIcon },
  { key: "movies", label: "Movies", icon: Clapperboard },
  { key: "tv", label: "Shows", icon: TvIcon },
  { key: "anime", label: "Anime", icon: Sparkles },
] as const;

const MORE_NAV = [
  { key: "new-popular", label: "New & Popular" },
  { key: "categories", label: "Categories" },
  { key: "my-list", label: "My List" },
  { key: "sports", label: "Live Sports" },
] as const;

type InitialPlayback = {
  id: number;
  mediaType: MediaType;
  season?: number;
  episode?: number;
  sourceId?: string;
};

type InitialDetail = {
  id: number;
  mediaType: MediaType;
};

const EMBED_SOURCES = [
  {
    id: "vidy",
    name: "Vidy (HD Player)",
    url: "https://www.vidy.st",
  },
  {
    id: "vidsrc_wiki",
    name: "Source 1 (VidSrc Wiki)",
    url: "https://vidsrc.wiki",
  },
  {
    id: "cinesrc",
    name: "Source 2 (CineSrc)",
    url: "https://cinesrc.st",
  },
  {
    id: "vidsrc_su",
    name: "Source 3 (VidSrc SU)",
    url: "https://vidsrc.su",
  },
  {
    id: "autoembed",
    name: "Source 4 (AutoEmbed)",
    url: "https://autoembed.co",
  },
];

function buildEmbedUrl(
  mediaType: MediaType,
  tmdbId: number,
  season: number,
  episode: number,
  sourceId: string = "vidy",
  progressSeconds: number = 0,
): string {
  if (sourceId === "vidy") {
    return buildVidyUrl({
      mediaType,
      tmdbId,
      season,
      episode,
      progressSeconds,
    });
  }

  if (sourceId === "cinesrc") {
    return mediaType === "tv"
      ? `https://cinesrc.st/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://cinesrc.st/embed/movie/${tmdbId}`;
  }

  if (sourceId === "vidsrc_su") {
    return mediaType === "tv"
      ? `https://vidsrc.su/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.su/embed/movie/${tmdbId}`;
  }

  if (sourceId === "autoembed") {
    return mediaType === "tv"
      ? `https://autoembed.co/tv/tmdb/${tmdbId}-${season}-${episode}`
      : `https://autoembed.co/movie/tmdb/${tmdbId}`;
  }

  // Default to vidsrc_wiki
  return mediaType === "tv"
    ? `https://vidsrc.wiki/embed/tv/${tmdbId}/${season}/${episode}/`
    : `https://vidsrc.wiki/embed/movie/${tmdbId}/`;
}

function buildWatchPath(
  mediaType: MediaType,
  tmdbId: number,
  season: number,
  episode: number,
  sourceId: string,
): string {
  const params = new URLSearchParams();
  if (mediaType === "tv") {
    params.set("season", String(season));
    params.set("episode", String(episode));
  }
  if (sourceId && sourceId !== "vidy") {
    params.set("source", sourceId);
  }
  const query = params.toString();
  return `/watch/${mediaType}/${tmdbId}${query ? `?${query}` : ""}`;
}

function buildTitlePath(mediaType: MediaType, tmdbId: number): string {
  return `/title/${mediaType}/${tmdbId}`;
}

const LIVE_SPORTS_CHANNELS = [
  {
    id: "sony-ten-1",
    title: "FIFA 2026 - Live Stream",
    category: "Sony Sports Network",
    status: "LIVE",
    score: "Live Sports Broadcast",
    odds: "FIFA 2026  Live HD",
    backdropPath: "https://imgs.search.brave.com/hooCbBTnMa_WTRo1DBU9tdIQu05HX8yXN4j-Ee_hhjI/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMjI4/MDU3NzU0OC9waG90/by9rYW5zYXMtY2l0/eS1taXNzb3VyaS1h/LWdlbmVyYWwtdmll/dy1vZi1maWZhLXdv/cmxkLWN1cC0yMDI2/LXNpZ25hZ2UtYXQt/a2Fuc2FzLWNpdHkt/c3RhZGl1bS1vbi5q/cGc_cz02MTJ4NjEy/Jnc9MCZrPTIwJmM9/dVJ4NUFOeHdxSzhx/QW1lR1RXaUJqMUhS/M1IzSF9Ld1RrMllP/RHl3RW1oUT0",
    embedUrl: "https://embedindia.st/embed/wc/2026-07-15/eng-arg/fox-en",
  },
  {
    id: "sony-ten-3",
    title: "Sony Ten 3 HD - Live Stream",
    category: "Sony Sports Network",
    status: "LIVE",
    score: "Live Sports Broadcast",
    odds: "Sony Sports Ten 3 Live SD/HD Channel",
    backdropPath: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800",
    embedUrl: "https://dlhd.st/stream/stream-49.php",
  },
  {
    id: "sports-1",
    title: "India vs Pakistan - ICC T20 World Cup",
    category: "Cricket",
    status: "LIVE",
    score: "IND 156/4 (17.2) • PAK 152/8 (20.0)",
    odds: "India needs 15 runs in 16 balls to win",
    backdropPath: "https://images.unsplash.com/photo-1540747737956-37872404f80f?q=80&w=800",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "sports-2",
    title: "Real Madrid vs Barcelona - El Clásico",
    category: "Football",
    status: "LIVE",
    score: "RMA 2 - 1 BAR (78')",
    odds: "Live from Santiago Bernabéu Stadium",
    backdropPath: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "sports-3",
    title: "Formula 1 Monaco Grand Prix - Main Race",
    category: "Motorsport",
    status: "LIVE",
    score: "Lap 52/78 • Leclerc (P1), Piastri (P2)",
    odds: "Weather: Dry, 24°C",
    backdropPath: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=800",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "sports-4",
    title: "Wimbledon Men's Final - Carlos Alcaraz vs Jannik Sinner",
    category: "Tennis",
    status: "LIVE",
    score: "Set 4: Alcaraz (2) 6-4, 3-6, 7-6, 4-2 Sinner (1)",
    odds: "Live from Centre Court",
    backdropPath: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=800",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    id: "sports-5",
    title: "NBA Finals - Game 7: Celtics vs Lakers",
    category: "Basketball",
    status: "LIVE",
    score: "BOS 104 - 102 LAL (Q4 0:42)",
    odds: "Live from TD Garden",
    backdropPath: "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=800",
    embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  }
];

export default function StreamDashboard({
  categories,
  fallbackMovieId,
  initialPlayback,
  initialDetail,
}: StreamDashboardProps) {
  const INTRO_POPUP_MS = 1500;
  const INTRO_POPUP_EXPIRY_KEY = "desi_intro_popup_expiry";
  const router = useRouter();
  const pathname = usePathname();
  const isWatchRoute = pathname?.startsWith("/watch/") ?? false;
  const isTitleRoute = pathname?.startsWith("/title/") ?? false;
  const [showIntroPopup, setShowIntroPopup] = useState(true);
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>(
    initialPlayback?.mediaType ?? "movie",
  );
  const [selectedMovieId, setSelectedMovieId] = useState<number>(
    initialPlayback?.id ?? fallbackMovieId,
  );
  const [season, setSeason] = useState<number>(initialPlayback?.season ?? 1);
  const [episode, setEpisode] = useState<number>(initialPlayback?.episode ?? 1);
  const [selectedMovieDetails, setSelectedMovieDetails] =
    useState<SearchResult | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(Boolean(initialPlayback));
  const [isMuted, setIsMuted] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionKey>("home");
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(
    null,
  );
  const [selectedSportsChannel, setSelectedSportsChannel] = useState<any | null>(null);
  
  const [sportsChannels, setSportsChannels] = useState<any[]>([]);
  const [sportsSchedule, setSportsSchedule] = useState<any>({});
  const [isSportsLoading, setIsSportsLoading] = useState(false);
  const [sportsTab, setSportsTab] = useState<"channels" | "schedule">("channels");
  const [selectedSportsSource, setSelectedSportsSource] = useState<string>("watch");

  const getLogoUrl = useCallback((url: string | undefined) => {
    if (!url) return "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800";
    if (url.startsWith("http")) return url;
    return `https://dlhd.st/${url}`;
  }, []);

  const sportsHero = useMemo(() => {
    if (sportsChannels.length > 0) {
      const fifaChan = sportsChannels.find(c => c.channel_name?.toLowerCase().includes("fifa"));
      const primaryChan = fifaChan || sportsChannels[0];
      const isFifa = primaryChan.channel_name?.toLowerCase().includes("fifa");
      return {
        id: primaryChan.channel_id,
        title: primaryChan.channel_name,
        category: "Live TV Channel",
        status: "LIVE",
        score: "Broadcasting Now",
        odds: "Select a channel below to watch live streaming coverage",
        backdropPath: getLogoUrl(primaryChan.logo_url),
        embedUrl: isFifa ? "https://embedindia.st/embed/wc/2026-07-15/eng-arg/fox-en" : `https://dlhd.st/stream/stream-${primaryChan.channel_id}.php`
      };
    }
    return LIVE_SPORTS_CHANNELS[0];
  }, [sportsChannels, getLogoUrl]);

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
  const [selectedSource, setSelectedSource] = useState<string>(
    initialPlayback?.sourceId ?? "vidy",
  );
  const [resumeAt, setResumeAt] = useState<number>(0);
  const [watchPositions, setWatchPositions] = useState<
    Record<string, { currentTime: number; duration: number; updatedAt: number }>
  >({});

  const searchClientCacheRef = useRef<Map<string, SearchResult[]>>(new Map());
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moreNavRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleTouch = () => {};
    document.addEventListener("touchstart", handleTouch, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouch);
    };
  }, []);

  const categoryNavItems = useMemo(() => {
    return categories.map((category) => ({
      key: category.key,
      label: category.label,
      mediaType: category.mediaType,
      count: category.movies.length,
    }));
  }, [categories]);

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
    const now = Date.now();
    let timeoutId: number | undefined;

    try {
      const savedExpiry = Number(
        window.sessionStorage.getItem(INTRO_POPUP_EXPIRY_KEY) ?? "0",
      );
      const expiry = savedExpiry > now ? savedExpiry : now + INTRO_POPUP_MS;

      if (savedExpiry <= now) {
        window.sessionStorage.setItem(INTRO_POPUP_EXPIRY_KEY, String(expiry));
      }

      const remainingMs = Math.max(0, expiry - now);
      if (remainingMs === 0) {
        setShowIntroPopup(false);
        return;
      }

      timeoutId = window.setTimeout(() => {
        setShowIntroPopup(false);
      }, remainingMs);
    } catch {
      timeoutId = window.setTimeout(() => {
        setShowIntroPopup(false);
      }, INTRO_POPUP_MS);
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    const savedList = localStorage.getItem("myList");
    if (savedList) setMyList(JSON.parse(savedList));

    const savedHistory = localStorage.getItem("watchHistory");
    if (savedHistory) setWatchHistory(JSON.parse(savedHistory));

    setWatchPositions(readWatchPositions());
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem("myList", JSON.stringify(myList));
  }, [myList]);

  useEffect(() => {
    localStorage.setItem("watchHistory", JSON.stringify(watchHistory));
  }, [watchHistory]);

  /**
   * Vidy player integration — the embed posts PLAYER_EVENT payloads to the
   * parent page, which we use to remember the watch position per title so we
   * can resume and render real progress bars.
   */
  const activePositionKey = watchPositionKey(
    selectedMediaType,
    selectedMovieId,
    season,
    episode,
  );

  useEffect(() => {
    if (!isPlayerOpen) return;

    function handleVidyMessage(event: MessageEvent) {
      if (!isVidyOrigin(event.origin)) return;
      const payload = parseVidyPayload(event.data);
      if (!payload || !payload.event) return;

      const currentTime = Number(payload.currentTime) || 0;
      const duration = Number(payload.duration) || 0;

      // Finished the title — clear the saved position so it starts fresh next time
      if (payload.event === "ended") {
        setWatchPositions((prev) => {
          const next = { ...prev };
          delete next[activePositionKey];
          try {
            window.localStorage.setItem(
              "vidy:watch-positions",
              JSON.stringify(next),
            );
          } catch {
            /* storage disabled — ignore */
          }
          return next;
        });
        return;
      }

      if (!currentTime) return;

      setWatchPositions((prev) => {
        const next = {
          ...prev,
          [activePositionKey]: {
            currentTime,
            duration: duration || prev[activePositionKey]?.duration || 0,
            updatedAt: Date.now(),
          },
        };
        writeWatchPosition(activePositionKey, next[activePositionKey]);
        return next;
      });
    }

    window.addEventListener("message", handleVidyMessage);
    return () => window.removeEventListener("message", handleVidyMessage);
  }, [isPlayerOpen, activePositionKey]);

  useEffect(() => {
    if (!initialPlayback) return;
    setSelectedMediaType(initialPlayback.mediaType);
    setSelectedMovieId(initialPlayback.id);
    setSeason(initialPlayback.season ?? 1);
    setEpisode(initialPlayback.episode ?? 1);
    setSelectedSource(initialPlayback.sourceId ?? "vidy");
    setIsPlayerOpen(true);

    // Resume where the viewer left off (Vidy stores the position for us)
    const stored = readWatchPositions()[
      watchPositionKey(
        initialPlayback.mediaType,
        initialPlayback.id,
        initialPlayback.season ?? 1,
        initialPlayback.episode ?? 1,
      )
    ];
    setResumeAt(
      stored?.currentTime && stored.currentTime > 30 ? stored.currentTime : 0,
    );
  }, [initialPlayback]);

  useEffect(() => {
    if (!initialDetail) return;
    const detail = initialDetail;
    let isActive = true;

    const placeholder: SearchResult = {
      id: detail.id,
      title: "Loading...",
      overview: "",
      posterPath: null,
      backdropPath: null,
      releaseDate: "",
      rating: 0,
      mediaType: detail.mediaType,
    };

    setDetailMovie(placeholder);
    setDetailData(null);
    setDetailSeason(1);
    setIsLoadingDetail(true);

    async function fetchInitialDetail() {
      try {
        const res = await fetch(
          `/api/movies/details?id=${detail.id}&type=${detail.mediaType}&season=1`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!isActive) return;
        setDetailMovie(data);
        setDetailData(data);
      } catch {
        /* fall back to placeholder */
      } finally {
        if (isActive) setIsLoadingDetail(false);
      }
    }

    fetchInitialDetail();

    return () => {
      isActive = false;
    };
  }, [initialDetail]);

  useEffect(() => {
    if (!isWatchRoute || !isPlayerOpen) return;
    const nextPath = buildWatchPath(
      selectedMediaType,
      selectedMovieId,
      season,
      episode,
      selectedSource,
    );
    router.replace(nextPath);
  }, [
    isWatchRoute,
    isPlayerOpen,
    selectedMediaType,
    selectedMovieId,
    season,
    episode,
    selectedSource,
    router,
  ]);

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

  useEffect(() => {
    if (activeSection === "sports") {
      setIsSportsLoading(true);
      fetch("/api/sports")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSportsChannels(data.channels || []);
            setSportsSchedule(data.schedule || {});
          }
        })
        .catch((err) => console.error("Failed to load sports data:", err))
        .finally(() => setIsSportsLoading(false));
    }
  }, [activeSection]);

  const embedUrl = useMemo(
    () => {
      if (selectedSportsChannel) {
        // If it's a FIFA stream or has FIFA in the name, use the custom embed India source
        const name = (selectedSportsChannel.title || selectedSportsChannel.channel_name || "").toLowerCase();
        if (name.includes("fifa") || selectedSportsChannel.id === "sony-ten-1" || selectedSportsChannel.channel_id === "54" || selectedSportsChannel.channel_id === "768" || selectedSportsChannel.channel_id === "350") {
          return "https://embedindia.st/embed/wc/2026-07-15/eng-arg/fox-en";
        }
        // If the channel has a custom non-dlhd embedUrl (like youtube), use it directly
        if (selectedSportsChannel.embedUrl && !selectedSportsChannel.embedUrl.includes("dlhd.st")) {
          return selectedSportsChannel.embedUrl;
        }
        // Build the sports embed URL dynamically based on the selected server source and channel id
        const channelId = selectedSportsChannel.id || selectedSportsChannel.channel_id;
        return `https://dlhd.st/${selectedSportsSource}/stream-${channelId}.php`;
      }
      return buildEmbedUrl(
        selectedMediaType,
        selectedMovieId,
        season,
        episode,
        selectedSource,
        resumeAt,
      );
    },
    [selectedMediaType, selectedMovieId, season, episode, selectedSource, selectedSportsChannel, selectedSportsSource, resumeAt],
  );

  const heroList = useMemo(() => {
    const pool =
      activeSection === "my-list"
        ? myList
        : activeSection === "categories"
          ? ((selectedCategoryKey
            ? categories.find((c) => c.key === selectedCategoryKey)?.movies
            : categories[0]?.movies) ?? [])
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
                : activeSection === "anime"
                  ? (() => {
                      const anime = categories
                        .flatMap((c) => c.movies)
                        .filter((m) => m.genreIds?.includes(16));
                      return anime.length > 0
                        ? anime
                        : categories.flatMap((c) => c.movies);
                    })()
                  : categories
                    .filter((c) =>
                      ["new-movies", "new-tv", "upcoming", "trending"].includes(
                        c.key,
                      ),
                    )
                    .flatMap((c) => c.movies);

    const withBackdrop = pool.filter((m) => m.backdropPath || m.posterPath);
    const seen = new Set<string>();
    return withBackdrop
      .filter((m) => {
        const key = `${m.mediaType}-${m.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [categories, activeSection, myList, selectedCategoryKey]);

  const heroMovie = heroList[heroIndex % Math.max(heroList.length, 1)];

  const heroGenres = useMemo<string[]>(() => {
    if (!heroMovie) return [];
    if ("genres" in heroMovie && heroMovie.genres?.length)
      return heroMovie.genres.slice(0, 2);
    const genreIds = "genreIds" in heroMovie ? heroMovie.genreIds ?? [] : [];
    return genreIds
      .map((id) => GENRE_NAMES[id])
      .filter((name): name is string => Boolean(name))
      .slice(0, 2);
  }, [heroMovie]);

  useEffect(() => {
    setHeroIndex(0);
  }, [activeSection, selectedCategoryKey]);

  useEffect(() => {
    if (isHeroPaused || isPlayerOpen || heroList.length < 2 || activeSection === "sports") {
      return;
    }
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroList.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [isHeroPaused, isPlayerOpen, heroList.length, activeSection]);

  function goToSection(section: SectionKey) {
    setActiveSection(section);
    closePlayer();
    setSelectedGenre(null);
    setIsMobileMenuOpen(false);
    setIsMoreOpen(false);
    if (section === "categories") {
      setSelectedCategoryKey((prev) => prev ?? categories[0]?.key ?? null);
    } else {
      setSelectedCategoryKey(null);
    }
  }

  useEffect(() => {
    if (!isMoreOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (target && moreNavRef.current?.contains(target)) return;
      setIsMoreOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMoreOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreOpen]);

  function handleSearch(q: string) {
    setSearchQuery(q);
    const trimmed = q.trim();
    const isNumeric = /^\d+$/.test(trimmed);

    if (!isNumeric && trimmed.length < 2) {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
      setSearchResults([]);
      setIsSearchLoading(false);
      return;
    }

    const cacheKey = `${trimmed.toLowerCase()}:${language}`;
    const cached = searchClientCacheRef.current.get(cacheKey);
    if (cached) {
      setSearchResults(cached.slice(0, 20));
      setIsSearchLoading(false);
      return;
    }

    setIsSearchLoading(true);

    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    searchDebounceTimerRef.current = setTimeout(async () => {
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
      const controller = new AbortController();
      searchAbortControllerRef.current = controller;

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&type=all&lang=${language}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          if (!controller.signal.aborted) setIsSearchLoading(false);
          return;
        }
        const data = await response.json();

        if (!controller.signal.aborted && data.results) {
          searchClientCacheRef.current.set(cacheKey, data.results);
          setSearchResults(data.results.slice(0, 20));
          setIsSearchLoading(false);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Search fetch failed:", err);
          setIsSearchLoading(false);
        }
      }
    }, 300);
  }

  function closePlayer() {
    setIsPlayerOpen(false);
    setSelectedSportsChannel(null);
    if (isWatchRoute) router.push("/");
  }

  function playSports(channel: any) {
    setSelectedSportsChannel(channel);
    setIsPlayerOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function enterFullscreen() {
    const iframe = document.getElementById("player-iframe");
    if (iframe) {
      try {
        if (iframe.requestFullscreen) {
          iframe.requestFullscreen();
        } else if ((iframe as any).webkitRequestFullscreen) {
          (iframe as any).webkitRequestFullscreen();
        } else if ((iframe as any).mozRequestFullScreen) {
          (iframe as any).mozRequestFullScreen();
        } else if ((iframe as any).msRequestFullscreen) {
          (iframe as any).msRequestFullscreen();
        }
      } catch (e) {
        console.error("Fullscreen request failed:", e);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function closeDetail() {
    setDetailMovie(null);
    setDetailData(null);
    if (isTitleRoute) router.push("/");
  }

  function playMovie(
    movie: MovieSummary | SearchResult,
    options?: { season?: number; episode?: number; sourceId?: string },
  ) {
    const nextSeason = movie.mediaType === "tv" ? (options?.season ?? 1) : 1;
    const nextEpisode = movie.mediaType === "tv" ? (options?.episode ?? 1) : 1;
    const nextSource = options?.sourceId ?? selectedSource;

    setDetailMovie(null);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Resume where the viewer left off (Vidy posts the position to us)
    const stored = readWatchPositions()[
      watchPositionKey(movie.mediaType, movie.id, nextSeason, nextEpisode)
    ];
    setResumeAt(stored?.currentTime && stored.currentTime > 30 ? stored.currentTime : 0);

    // Update watch history
    setWatchHistory((prev) => {
      const filtered = prev.filter(
        (m) => !(m.id === movie.id && m.mediaType === movie.mediaType),
      );
      return [movie, ...filtered].slice(0, 10);
    });

    router.push(
      buildWatchPath(
        movie.mediaType,
        movie.id,
        nextSeason,
        nextEpisode,
        nextSource,
      ),
    );
  }

  function openDetail(movie: MovieSummary | SearchResult) {
    router.push(buildTitlePath(movie.mediaType, movie.id));
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
    if (activeSection === "sports") return [];
    if (activeSection === "my-list")
      return [
        {
          key: "my-list",
          label: "My List",
          movies: myList,
          mediaType: "movie",
        },
      ];
    if (activeSection === "categories") {
      if (!selectedCategoryKey) return categories;
      return categories.filter((c) => c.key === selectedCategoryKey);
    }
    if (activeSection === "tv")
      base = categories.filter((c) => c.mediaType === "tv");
    else if (activeSection === "movies")
      base = categories.filter((c) => c.mediaType === "movie");
    else if (activeSection === "anime")
      base = categories
        .map((category) => ({
          ...category,
          movies: category.movies.filter((m) => m.genreIds?.includes(16)),
        }))
        .filter((c) => c.movies.length > 0);
    if (activeSection === "anime" && base.length === 0) {
      base = [
        {
          key: "anime",
          label: "Anime",
          mediaType: "movie" as const,
          movies: [],
        },
      ];
    }
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
  }, [categories, activeSection, myList, selectedGenre, selectedCategoryKey]);

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function isInMyList(movie: MovieSummary | SearchResult) {
    return myList.some(
      (m) => m.id === movie.id && m.mediaType === movie.mediaType,
    );
  }

  /** Playback progress (0-100) reported by the Vidy player. */
  function progressFor(movie: MovieSummary | SearchResult): number {
    const prefix = `${movie.mediaType}-${movie.id}-`;
    const entries = Object.entries(watchPositions).filter(([key]) =>
      key.startsWith(prefix),
    );
    if (entries.length === 0) return 0;
    const latest = entries.sort(
      (a, b) => b[1].updatedAt - a[1].updatedAt,
    )[0][1];
    if (!latest.duration) return 0;
    return Math.min(
      100,
      Math.max(0, Math.round((latest.currentTime / latest.duration) * 100)),
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#0f0f0f]">
      {showIntroPopup && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-[200] sm:bottom-6 sm:left-6">
          <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-left shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E50914] sm:text-sm">
              desi media
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.26em] text-white/60 sm:text-[10px]">
              made by vaibhav ghoshi
            </p>
          </div>
        </div>
      )}

      {/* Navbar — fully transparent, stays transparent while scrolling */}
      <nav className="fixed inset-x-0 top-0 z-[100]">
        <div className="flex w-full items-center justify-between gap-3 px-4 pt-4 sm:px-6 md:px-10 lg:px-14">
          {/* Logo */}
          <button
            onClick={() => goToSection("home")}
            aria-label="DesiMovies home"
            className="relative shrink-0 select-none drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]"
          >
            <Image
              src="/desimovies-logo.png"
              alt="DesiMovies"
              width={200}
              height={68}
              priority
              className="h-8 w-auto sm:h-9 lg:h-10"
            />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop pill nav */}
            <div className="hidden items-center gap-0.5 rounded-full border border-white/[0.08] bg-[#0f0f0f]/85 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.75)] backdrop-blur-2xl md:flex">
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => goToSection(item.key)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-300 ${
                      isActive
                        ? "bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]"
                        : "text-[#b3b3b3] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
                    {item.label}
                  </button>
                );
              })}

              {/* More sections */}
              <div className="relative" ref={moreNavRef}>
                <button
                  onClick={() => setIsMoreOpen((prev) => !prev)}
                  aria-label="More sections"
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    isMoreOpen || MORE_NAV.some((item) => item.key === activeSection)
                      ? "bg-white/[0.09] text-white"
                      : "text-[#b3b3b3] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {isMoreOpen && (
                  <>
                    <div className="absolute right-0 top-[calc(100%+14px)] w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f]/97 p-1.5 shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
                      {MORE_NAV.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => goToSection(item.key)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                            activeSection === item.key
                              ? "bg-white/[0.08] text-white"
                              : "text-[#b3b3b3] hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {item.label}
                            {item.key === "sports" && (
                              <span className="rounded bg-red-600 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
                                Live
                              </span>
                            )}
                          </span>
                          {item.key === "my-list" && myList.length > 0 && (
                            <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              {myList.length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <span className="mx-1.5 h-6 w-px bg-white/10" />

              {/* Search */}
              <div
                className={`flex items-center rounded-full transition-all duration-300 ${
                  isSearchOpen ? "bg-white/[0.07] pl-3" : ""
                }`}
              >
                {isSearchOpen && (
                  <>
                    <SearchIcon className="h-4 w-4 shrink-0 text-[#b3b3b3]" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search titles, genres..."
                      className="w-40 bg-transparent px-2 py-2 text-[13px] text-white placeholder:text-[#6f6f6f] focus:outline-none lg:w-52"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </>
                )}
                <button
                  onClick={() => {
                    setIsSearchOpen((prev) => !prev);
                    if (isSearchOpen) setSearchQuery("");
                  }}
                  aria-label="Search"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#f2f2f2] transition-colors hover:bg-white/5 hover:text-white"
                >
                  {isSearchOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <SearchIcon className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>

              {/* Account */}
              <button
                aria-label="Account"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#f2f2f2] transition-colors hover:bg-white/5 hover:text-white"
              >
                <User className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* Mobile actions */}
            <div className="flex items-center gap-1 md:hidden">
              <button
                onClick={() => {
                  setIsSearchOpen((prev) => !prev);
                  if (isSearchOpen) setSearchQuery("");
                }}
                aria-label="Search"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-zinc-200 backdrop-blur-xl"
              >
                {isSearchOpen ? (
                  <X className="h-[18px] w-[18px]" />
                ) : (
                  <SearchIcon className="h-[18px] w-[18px]" />
                )}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open menu"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-zinc-200 backdrop-blur-xl"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile search bar */}
        {isSearchOpen && (
          <div className="px-4 pt-3 md:hidden">
            <input
              autoFocus
              type="text"
              placeholder="Search titles, genres..."
              className="w-full rounded-full border border-white/10 bg-black/60 px-4 py-2.5 text-sm text-white placeholder:text-[#6f6f6f] backdrop-blur-xl focus:outline-none focus:ring-1 focus:ring-white/20"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        )}
      </nav>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[110] md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute right-3 top-3 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f0f]/97 p-2 shadow-[0_30px_80px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6f6f6f]">
                Browse
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#b3b3b3] hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-0.5">
              {[...PRIMARY_NAV, ...MORE_NAV].map((item) => {
                const Icon = "icon" in item ? item.icon : null;
                const isActive = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => goToSection(item.key)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white/[0.09] text-white"
                        : "text-[#b3b3b3] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {Icon ? (
                      <Icon className="h-4 w-4 shrink-0" />
                    ) : (
                      <span className="h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1">{item.label}</span>
                    {"key" in item && item.key === "sports" && (
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
                        Live
                      </span>
                    )}
                    {item.key === "my-list" && myList.length > 0 && (
                      <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {myList.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 border-t border-white/10 px-3 py-3">
              <p className="font-[var(--font-heading)] text-lg leading-none text-[#E50914]">
                DESI MOVIES
              </p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.3em] text-white/40">
                made by vaibhav ghoshi
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category chips */}
      {activeSection === "categories" && categoryNavItems.length > 0 && (
        <div className="fixed left-0 right-0 top-[76px] z-[90] px-4 md:px-10 lg:px-14">
          <div className="no-scrollbar overflow-x-auto pb-1">
            <div className="flex min-w-max items-center gap-2 rounded-full border border-white/[0.06] bg-[#0f0f0f]/80 p-1.5 backdrop-blur-xl">
              {categoryNavItems.map((item) => {
                const isActive = selectedCategoryKey === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setSelectedCategoryKey(item.key)}
                    className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors duration-300 ${
                      isActive
                        ? "bg-[#e50914] text-white"
                        : "text-[#b3b3b3] hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}


      {/* Hero Banner / Player Overlay */}
      <section className="relative h-[70vh] min-h-[420px] w-full overflow-hidden pt-12 md:h-[85vh] md:pt-0">
        {/* Genre filter for Movies/TV */}
        {!isPlayerOpen &&
          (activeSection === "movies" || activeSection === "tv") && (
            <div className="absolute left-4 top-[78px] z-[45] md:left-12 lg:left-14">
              <div className="relative">
                <select
                  value={selectedGenre || ""}
                  onChange={(e) => setSelectedGenre(e.target.value || null)}
                  aria-label="Filter by genre"
                  className="appearance-none rounded-full border border-white/10 bg-black/55 py-1.5 pl-3.5 pr-8 text-[11px] font-semibold uppercase tracking-wider text-white/85 backdrop-blur-xl transition-colors hover:border-white/30 focus:border-white/40 focus:outline-none"
                >
                  <option value="">All genres</option>
                  {GENRES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/70">
                  <div className="h-0 w-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-white/70" />
                </div>
              </div>
            </div>
          )}
        {isPlayerOpen ? (
          <div className="fixed inset-0 z-40 flex h-screen w-screen flex-col bg-[#0f0f0f] pt-16 md:pt-20">
            <div className="relative flex-grow overflow-auto" style={{ WebkitOverflowScrolling: "touch" }}>
              <iframe
                id="player-iframe"
                src={embedUrl}
                className="absolute inset-0 h-full w-full border-0"
                scrolling="no"
                allowFullScreen
                allow="encrypted-media; autoplay *; fullscreen *; picture-in-picture *"
                referrerPolicy="no-referrer"
                style={{ pointerEvents: "auto" }}
              />
              <button
                onClick={closePlayer}
                className="absolute right-3 top-3 z-50 rounded-full bg-black/60 p-2 text-white transition-all hover:scale-110 hover:bg-black/80 md:right-8 md:top-8"
                title="Close Player"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-white/10 bg-[#141414] px-4 py-4 md:px-12">
              {selectedSportsChannel && (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f6f6f]">
                      Stream Server
                    </label>
                    <select
                      value={selectedSportsSource}
                      onChange={(e) => setSelectedSportsSource(e.target.value)}
                      className="cursor-pointer rounded-lg border border-white/10 bg-[#212121] px-3 py-1.5 text-sm text-[#f2f2f2] outline-none transition-colors focus:border-white/40"
                    >
                      <option value="watch">Server 1 (watch - Mobile OK)</option>
                      <option value="cast">Server 2 (cast - Mobile OK)</option>
                      <option value="stream">Server 3 (stream)</option>
                      <option value="player">Server 4 (player)</option>
                      <option value="plus">Server 5 (plus)</option>
                      <option value="casting">Server 6 (casting)</option>
                    </select>
                  </div>
                  <button
                    onClick={enterFullscreen}
                    className="inline-flex h-[38px] items-center gap-1.5 rounded-lg border border-white/10 bg-[#212121] px-4 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Fullscreen ⛶
                  </button>
                  <a
                    href={embedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-[38px] items-center gap-1.5 rounded-lg bg-[#e50914] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#ff4651]"
                  >
                    Open in New Tab ↗
                  </a>
                </div>
              )}

              {!selectedSportsChannel && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f6f6f]">
                    Source
                  </label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="cursor-pointer rounded-lg border border-white/10 bg-[#212121] px-3 py-1.5 text-sm text-[#f2f2f2] outline-none transition-colors focus:border-white/40"
                  >
                    {EMBED_SOURCES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedMediaType === "tv" && !selectedSportsChannel && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f6f6f]">
                      Season
                    </label>
                    <select
                      value={season}
                      onChange={(e) => {
                        setSeason(Number(e.target.value));
                        setEpisode(1);
                      }}
                      className="cursor-pointer rounded-lg border border-white/10 bg-[#212121] px-3 py-1.5 text-sm text-[#f2f2f2] outline-none transition-colors focus:border-white/40"
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
                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f6f6f]">
                      Episode
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={episode}
                        onChange={(e) => setEpisode(Number(e.target.value))}
                        className="w-20 rounded-lg border border-white/10 bg-[#212121] px-2 py-1.5 text-sm text-[#f2f2f2] outline-none transition-colors focus:border-white/40 sm:w-24 sm:px-3"
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
                </>
              )}

              <div className="w-full sm:ml-auto sm:w-auto">
                <p className="text-sm font-medium text-white truncate max-w-xs">
                  Playing: {selectedSportsChannel ? selectedSportsChannel.title : selectedMovieDetails?.title}
                </p>
                {selectedMediaType === "tv" && !selectedSportsChannel && (
                  <p className="text-xs text-gray-400">
                    S{season} E{episode}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          (activeSection === "sports" ? sportsHero : heroMovie) && (
            <>
              <div key={activeSection === "sports" ? "sports" : heroMovie.id} className="absolute inset-0 z-0">
                <Image
                  src={
                    activeSection === "sports"
                      ? sportsHero.backdropPath
                      : (backdropUrl(heroMovie.backdropPath) ||
                        posterUrl(heroMovie.posterPath)!)
                  }
                  alt={activeSection === "sports" ? sportsHero.title : heroMovie.title}
                  fill
                  className="object-cover object-[center_28%] animate-fade-in"
                  priority
                />
                {/* cinematic overlays */}
                <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(15,15,15,0.95)_0%,rgba(15,15,15,0.72)_34%,rgba(15,15,15,0.18)_64%,rgba(15,15,15,0)_100%)]" />
                <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(15,15,15,0.72)_0%,rgba(15,15,15,0)_24%,rgba(15,15,15,0)_66%,rgba(15,15,15,0.55)_88%,rgba(15,15,15,0.9)_100%)]" />
              </div>

              <div className="hero-seam" />

              <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-16 md:px-10 md:pb-[14vh] lg:px-14">
                <div
                  key={`hero-copy-${activeSection === "sports" ? "sports" : heroMovie.id}`}
                  className="max-w-[560px] animate-banner-text"
                >
                  {activeSection === "sports" ? (
                    <>
                      <div className="mb-4 flex w-max items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg">
                        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                        Live now
                      </div>
                      <h1 className="font-[var(--font-body)] text-[2.25rem] font-bold uppercase leading-none tracking-[-0.035em] text-[#9db2dd] drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)] md:text-[3.5rem]">
                        {sportsHero.title}
                      </h1>
                    </>
                  ) : (
                    <>
                      <div className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-white">
                        <span className="flex h-6 w-6 flex-col items-center justify-center rounded-[3px] bg-[#e50914] text-[7px] font-extrabold leading-[0.92] tracking-[0.06em] text-white">
                          <span>TOP</span>
                          <span className="text-[12px] tracking-[-0.02em]">10</span>
                        </span>
                        <span className="text-white/95">
                          #{heroIndex + 1} in{" "}
                          {heroMovie.mediaType === "tv" ? "shows" : "movies"}
                        </span>
                      </div>

                      <h1 className="font-[var(--font-body)] text-[2.25rem] font-bold uppercase leading-none tracking-[-0.035em] text-[#9db2dd] drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)] md:text-[3.5rem]">
                        {heroMovie.title}
                      </h1>

                      <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-medium text-white/85 sm:text-sm">
                        <span className="flex items-center gap-1.5 text-white">
                          <Star className="h-3.5 w-3.5 fill-[#E50914] text-[#E50914]" />
                          {heroMovie.rating ? heroMovie.rating.toFixed(1) : "N/A"}
                        </span>
                        <span className="text-white/30">•</span>
                        <span>{heroMovie.releaseDate?.slice(0, 4) || "TBA"}</span>
                        <span className="text-white/30">•</span>
                        <span>{heroMovie.mediaType === "tv" ? "Show" : "Movie"}</span>
                        {heroGenres.map((genre) => (
                          <span key={genre} className="flex items-center gap-2.5">
                            <span className="text-white/30">•</span>
                            <span>{genre}</span>
                          </span>
                        ))}
                      </div>

                      <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-[15px]">
                        {heroMovie.overview ||
                          "No synopsis available for this title yet."}
                      </p>
                    </>
                  )}

                  {activeSection === "sports" && (
                    <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-medium text-white/85">
                      <span className="font-extrabold text-[#E50914]">
                        {sportsHero.category}
                      </span>
                      <span className="text-white/30">•</span>
                      <span>{sportsHero.score}</span>
                    </div>
                  )}

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        if (activeSection === "sports") {
                          playSports(sportsHero);
                        } else {
                          playMovie(heroMovie);
                        }
                      }}
                      className="flex items-center gap-2.5 rounded-[10px] bg-white px-6 py-3 text-sm font-bold text-black shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all hover:scale-[1.03] hover:bg-white/90 sm:px-8"
                    >
                      <Play className="h-[18px] w-[18px] fill-black" />
                      Play
                    </button>
                    <button
                      onClick={() => {
                        if (activeSection !== "sports") openDetail(heroMovie);
                      }}
                      className="flex items-center gap-2.5 rounded-[10px] border border-white/10 bg-white/[0.14] px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/[0.22] sm:px-8"
                    >
                      <Info className="h-[18px] w-[18px]" />
                      More info
                    </button>
                  </div>
                </div>
              </div>

              {/* Carousel controls */}
              {activeSection !== "sports" && heroList.length > 0 && (
                <div className="absolute bottom-6 right-4 z-20 flex items-center gap-4 sm:bottom-8 sm:right-6 md:right-12 lg:right-14">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/80 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white sm:flex"
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>

                  <div className="flex items-center gap-0.5">
                    {heroList.map((movie, index) => (
                      <button
                        key={`${movie.mediaType}-${movie.id}-dot`}
                        onClick={() => setHeroIndex(index)}
                        aria-label={`Show featured title ${index + 1}`}
                        className={`hero-marker ${
                          index === heroIndex % heroList.length
                            ? "hero-marker--active"
                            : ""
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setIsHeroPaused((prev) => !prev)}
                    aria-label={isHeroPaused ? "Resume slideshow" : "Pause slideshow"}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition-colors hover:border-white/50"
                  >
                    {isHeroPaused ? (
                      <Play className="h-4 w-4 fill-white" />
                    ) : (
                      <Pause className="h-4 w-4 fill-white" />
                    )}
                  </button>
                </div>
              )}
            </>
          )
        )}
      </section>

      {/* Rows & Footer (Hidden when player is open for distraction-free viewing) */}
      {!isPlayerOpen && (
        <>
          <div className="relative z-30 -mt-10 space-y-2 pb-20 md:-mt-16">
            {/* Continue Watching Section (Only in Home) */}
            {activeSection === "home" && watchHistory.length > 0 && (
              <div className="scroll-row">
                <h2 className="row-heading">Continue Watching</h2>
                <div className="no-scrollbar flex gap-3 overflow-x-auto overflow-y-hidden px-6 py-4 md:px-10 lg:px-14">
                  {watchHistory.map((movie, idx) => (
                    <div
                      key={`continue-${movie.id}-${idx}`}
                      className="group relative aspect-video w-[170px] flex-shrink-0 cursor-pointer overflow-hidden rounded-[10px] border border-white/[0.06] bg-[#181818] transition-all duration-300 hover:scale-[1.03] hover:border-white/25 hover:z-40 sm:w-[200px] md:w-[280px]"
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
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white border border-white/20 backdrop-blur-sm">
                        {movie.mediaType === "tv"
                          ? "Resuming"
                          : "Recently Played"}
                      </div>
                      {/* Progress Bar */}
                      <div className="absolute bottom-0 left-2 right-2 h-[3px] overflow-hidden rounded-full bg-white/25">
                        <div
                          className="h-full rounded-full bg-[#e50914]"
                          style={{ width: `${progressFor(movie)}%` }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,15,15,0.92)] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white">
                          <Play className="h-4 w-4 fill-white" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "sports" && (
              <div className="space-y-6 px-6 md:px-10 lg:px-14">
                <div className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
                  <div className="space-y-2">
                    <h2 className="flex items-center gap-2 text-[22px] font-semibold tracking-[-0.33px] text-[#f2f2f2]">
                      Live Sports & TV
                      <span className="brand-chip px-2 py-1 text-[10px] uppercase tracking-[0.08em]">
                        Live
                      </span>
                    </h2>
                    <p className="text-sm text-[#6f6f6f]">
                      Watch live events, schedules, and TV channels dynamically
                      sourced from DaddyLive.
                    </p>
                  </div>

                  {/* Tabs: Channels vs Schedule */}
                  <div className="flex self-start rounded-full border border-white/[0.06] bg-[#181818] p-1">
                    <button
                      onClick={() => setSportsTab("channels")}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                        sportsTab === "channels"
                          ? "bg-white text-black"
                          : "text-[#b3b3b3] hover:text-white"
                      }`}
                    >
                      TV Channels
                    </button>
                    <button
                      onClick={() => setSportsTab("schedule")}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                        sportsTab === "schedule"
                          ? "bg-white text-black"
                          : "text-[#b3b3b3] hover:text-white"
                      }`}
                    >
                      Live Schedule
                    </button>
                  </div>
                </div>

                {isSportsLoading ? (
                  <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
                  </div>
                ) : sportsTab === "channels" ? (
                  /* Channels Grid */
                  sportsChannels.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">No channels available at the moment.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {sportsChannels.map((channel) => (
                        <div
                          key={channel.channel_id}
                          onClick={() =>
                            playSports({
                              id: channel.channel_id,
                              title: channel.channel_name,
                              embedUrl: `https://dlhd.st/stream/stream-${channel.channel_id}.php`,
                            })
                          }
                          className="group cursor-pointer rounded-xl border border-white/[0.06] bg-[#181818] p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25"
                        >
                          <div className="relative mx-auto mb-3 flex aspect-square w-14 items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.06] bg-black/40 p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getLogoUrl(channel.logo_url)}
                              alt={channel.channel_name}
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800";
                              }}
                            />
                          </div>
                          <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-[#b3b3b3] transition-colors group-hover:text-[#f2f2f2]">
                            {channel.channel_name}
                          </h3>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  /* Schedule Lists */
                  Object.keys(sportsSchedule).length === 0 ? (
                    <div className="text-center py-12 text-gray-400">No live schedule events available today.</div>
                  ) : (
                    <div className="space-y-8">
                      {Object.keys(sportsSchedule).map((dayKey) => (
                        <div key={dayKey} className="space-y-4">
                          <h3 className="border-b border-white/[0.06] pb-2 text-[18px] font-semibold tracking-[-0.3px] text-[#f2f2f2]">{dayKey}</h3>
                          
                          {Object.keys(sportsSchedule[dayKey]).map((categoryKey) => (
                            <div key={categoryKey} className="space-y-3 pl-2">
                              <h4 className="w-fit rounded-full bg-[#212121] px-3 py-1 text-xs font-semibold text-[#b3b3b3]">
                                {categoryKey}
                              </h4>
                              
                              <div className="space-y-2">
                                {sportsSchedule[dayKey][categoryKey].map((event: any, idx: number) => (
                                  <div
                                    key={`${event.event}-${idx}`}
                                    className="flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-[#181818] p-4 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="space-y-1">
                                      <span className="inline-block rounded bg-[#e50914]/15 px-2 py-0.5 text-[10px] font-bold text-[#ff4651]">
                                        {event.time} GMT
                                      </span>
                                      <h5 className="text-sm font-semibold text-[#f2f2f2] sm:text-base">{event.event}</h5>
                                    </div>
                                    
                                    {/* Event Channels Badges */}
                                    <div className="flex flex-wrap gap-2">
                                      {event.channels?.map((chan: any) => (
                                        <button
                                          key={chan.channel_id}
                                          onClick={() =>
                                            playSports({
                                              id: chan.channel_id,
                                              title: `${event.event} (${chan.channel_name})`,
                                              embedUrl: `https://dlhd.st/stream/stream-${chan.channel_id}.php`,
                                            })
                                          }
                                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#b3b3b3] transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
                                        >
                                          <img
                                            src={getLogoUrl(chan.logo_url)}
                                            alt={chan.channel_name}
                                            className="h-4 w-4 object-contain rounded-sm"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src =
                                                "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800";
                                            }}
                                          />
                                          {chan.channel_name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {filteredCategories.map((category) => {
              const isTop10 = category.key.includes("top-10");
              return (
                <MovieRow
                  key={category.key}
                  title={isTop10 ? "TOP 10 on DesiMovies" : category.label}
                  movies={category.movies}
                  isTop10={isTop10}
                  onOpen={openDetail}
                  onToggleList={toggleMyList}
                  isInList={isInMyList}
                />
              );
            })}
          </div>

          {/* Footer */}
          <footer className="mt-8 border-t border-white/[0.08] px-6 py-12 md:px-10 lg:px-14">
            <div className="mb-8 flex items-center gap-3">
              <span className="font-[var(--font-heading)] text-3xl leading-none tracking-tighter text-[#e50914]">
                D
              </span>
              <span className="text-[11px] uppercase tracking-[0.26em] text-[#6f6f6f]">
                Desi Movies
              </span>
              <a
                href="https://www.vidy.st/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto rounded-[4px] text-[13px] text-[#b3b3b3] transition-colors hover:text-white"
              >
                Streaming API
              </a>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] text-[#b3b3b3] sm:grid-cols-3 lg:grid-cols-4">
              {[
                "Audio and Subtitles",
                "Audio Description",
                "Help Center",
                "Gift Cards",
                "Media Center",
                "Investor Relations",
                "Jobs",
                "Terms of Use",
                "Privacy",
                "Legal Notices",
                "Cookie Preferences",
                "Corporate Information",
                "Contact Us",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="text-left transition-colors duration-200 hover:text-[#f2f2f2]"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button className="rounded border border-white/20 px-3 py-1.5 text-xs text-[#b3b3b3] transition-colors hover:border-white/50 hover:text-[#f2f2f2]">
                Service Code
              </button>
              <p className="text-[11px] text-[#6f6f6f]">
                © 2026 DesiMovies. All rights reserved.
              </p>
            </div>
          </footer>
        </>
      )}

      {/* Search Results Overlay */}
      {searchQuery && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#0f0f0f]">
          {/* Search Header */}
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0f0f0f]/95 px-6 py-4 backdrop-blur-xl md:px-10 lg:px-14">
            <div className="flex w-full items-center gap-3 sm:w-auto sm:gap-8">
              <button
                className="cursor-pointer font-[var(--font-heading)] text-3xl leading-none tracking-tighter text-[#e50914]"
                onClick={() => setSearchQuery("")}
              >
                D
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-[#181818] px-4 py-2 transition-colors focus-within:border-white/30 sm:w-72 md:w-96">
                <SearchIcon className="h-4 w-4 text-[#6f6f6f]" />
                <input
                  type="text"
                  placeholder="Titles, genres, or TMDB ID"
                  className="w-full bg-transparent text-sm text-[#f2f2f2] outline-none placeholder:text-[#6f6f6f]"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
                <button
                  aria-label="Close search"
                  onClick={() => setSearchQuery("")}
                  className="text-[#6f6f6f] transition-colors hover:text-[#f2f2f2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <button
              onClick={() => setSearchQuery("")}
              className="ml-auto flex items-center gap-2 text-[#f2f2f2] transition-colors hover:text-white"
            >
              <span className="hidden text-sm font-medium md:inline">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 pb-20 pt-8 md:px-10 lg:px-14">
            <h2 className="mb-6 text-[22px] font-semibold tracking-[-0.33px] text-[#f2f2f2]">
              Showing results for{" "}
              <span className="text-[#b3b3b3]">&quot;{searchQuery}&quot;</span>
            </h2>

            {isSearchLoading ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#E50914] mb-4" />
                <p className="text-lg font-medium text-gray-400">
                  Searching movies &amp; TV shows...
                </p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-4 md:grid-cols-6 lg:grid-cols-8">
                {searchResults.map((movie) => (
                  <MovieCard
                    key={`${movie.mediaType}-${movie.id}`}
                    movie={movie}
                    onOpen={(item) => {
                      playMovie(item);
                      setSearchQuery("");
                    }}
                  />
                ))}
              </div>
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
      )}

      {/* Detail Modal */}
      {detailMovie && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 md:p-8"
          onClick={closeDetail}
        >
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          {/* Modal Card */}
          <div
            className="relative z-10 max-h-[92vh] w-full max-w-[860px] overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#181818] shadow-[0_40px_120px_rgba(0,0,0,0.85)]"
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
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent" />

              {/* Close button */}
              <button
                onClick={closeDetail}
                aria-label="Close"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur-md transition-colors hover:border-white/40"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Title over image */}
              <div className="absolute bottom-4 left-5 right-5">
                <h2 className="text-[28px] font-bold leading-tight tracking-[-0.035em] text-white md:text-[34px]">
                  {(detailData ?? detailMovie).title}
                </h2>
              </div>
            </div>

            {/* Info section */}
            <div className="relative space-y-6 p-4 sm:p-6">
              {isLoadingDetail && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#181818]/70 backdrop-blur-[2px]">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e50914] border-t-transparent" />
                </div>
              )}

              <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_210px]">
                <div className="space-y-4">
                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#b3b3b3]">
                    {(detailData ?? detailMovie).rating > 0 && (
                      <span className="flex items-center gap-1.5 font-semibold text-[#f2f2f2]">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5 fill-[#e50914] text-[#e50914]"
                          aria-hidden="true"
                        >
                          <path d="M12 2l2.9 6.26L21.5 9.3l-4.8 4.4 1.3 6.5L12 16.9 6 20.2l1.3-6.5L2.5 9.3l6.6-1.04L12 2z" />
                        </svg>
                        {(detailData ?? detailMovie).rating.toFixed(1)}
                      </span>
                    )}
                    {(detailData ?? detailMovie).releaseDate && (
                      <span>
                        {(detailData ?? detailMovie).releaseDate.slice(0, 4)}
                      </span>
                    )}
                    <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b3b3b3]">
                      {detailMovie.mediaType === "tv" ? "Series" : "Movie"}
                    </span>
                    {(detailData as any)?.genres?.slice(0, 3).map((g: any) => (
                      <span key={g} className="font-medium text-[#b3b3b3]">
                        {g}
                      </span>
                    ))}
                  </div>

                  {/* Overview */}
                  {(detailData ?? (detailMovie as any)).overview && (
                    <p className="text-sm leading-relaxed text-[#b3b3b3]">
                      {(detailData ?? (detailMovie as any)).overview}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => playMovie(detailMovie)}
                      className="flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-black transition-all duration-200 hover:bg-white/90"
                    >
                      <Play className="h-4 w-4 fill-black" /> Play
                    </button>
                    <button
                      onClick={() => toggleMyList(detailMovie)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 ${
                        isInMyList(detailMovie)
                          ? "border-white bg-white text-black"
                          : "border-white/25 bg-transparent text-white hover:border-white"
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
                    <span className="text-[#6f6f6f]">Genres: </span>
                    <span className="text-[#b3b3b3]">
                      {(detailData as SearchResult)?.genres?.join(", ") ||
                        "N/A"}
                    </span>
                  </div>
                  {(detailData as SearchResult)?.tagline && (
                    <div>
                      <span className="text-[#6f6f6f]">This show is: </span>
                      <span className="italic text-[#b3b3b3]">
                        {(detailData as SearchResult).tagline}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Episodes Section for TV */}
              {detailMovie.mediaType === "tv" && (
                <div className="space-y-4 border-t border-white/[0.06] pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-[22px] font-semibold tracking-[-0.33px] text-[#f2f2f2]">
                      Episodes
                    </h3>
                    <select
                      value={detailSeason}
                      onChange={(e) => setDetailSeason(Number(e.target.value))}
                      className="cursor-pointer rounded-lg border border-white/10 bg-[#212121] px-3 py-1.5 text-sm text-[#f2f2f2] outline-none transition-colors focus:border-white/40"
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
                          className="group/ep flex cursor-pointer flex-col items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-white/[0.06] hover:bg-[#212121] sm:flex-row sm:items-center sm:gap-4 sm:p-4"
                          onClick={() =>
                            playMovie(detailMovie, {
                              season: detailSeason,
                              episode: ep.episode_number,
                            })
                          }
                        >
                          <span className="w-6 text-xl font-semibold text-[#6f6f6f]">
                            {ep.episode_number}
                          </span>
                          <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-[#212121]">
                            {ep.still_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                                alt={ep.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Play className="h-6 w-6 text-[#6f6f6f]" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 transition-colors group-hover/ep:bg-black/0" />
                          </div>
                          <div className="flex-grow">
                            <h4 className="text-sm font-semibold text-[#f2f2f2]">
                              {ep.name}
                            </h4>
                            <p className="mt-1 line-clamp-2 text-xs text-[#6f6f6f]">
                              {ep.overview || "No description available."}
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-xs font-medium text-[#6f6f6f]">
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
                <div className="space-y-4 border-t border-white/[0.06] pt-6">
                  <h3 className="text-[22px] font-semibold tracking-[-0.33px] text-[#f2f2f2]">
                    More Like This
                  </h3>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
                    {detailData.similar.slice(0, 8).map((item) => (
                      <MovieCard
                        key={`${item.mediaType}-${item.id}`}
                        movie={item}
                        onOpen={openDetail}
                      />
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
