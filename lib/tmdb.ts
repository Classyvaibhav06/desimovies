/* eslint-disable @typescript-eslint/no-explicit-any */
export type MovieSummary = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  rating: number;
  mediaType: "movie" | "tv";
  genreIds?: number[];
};

export type CategoryWithMovies = {
  key: string;
  label: string;
  mediaType: "movie" | "tv";
  movies: MovieSummary[];
};

export type SearchResult = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  rating: number;
  mediaType: "movie" | "tv";
  genres?: string[];
  runtime?: number;
  tagline?: string;
  numberOfSeasons?: number;
  seasons?: Array<{
    seasonNumber: number;
    episodeCount: number;
  }>;
};

type TmdbResponse = {
  results: Array<{
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string;
    vote_average: number;
  }>;
};

type FanartMovieResponse = {
  movieposter?: Array<{
    url: string;
    lang?: string;
    likes?: string;
  }>;
};

type FanartTvResponse = {
  tvposter?: Array<{
    url: string;
    lang?: string;
    likes?: string;
  }>;
};

const TMDB_BASE_URL = "https://api.tmdb.org/3";
const FANART_BASE_URL = "https://webservice.fanart.tv/v3";

const fanartPosterCache = new Map<number, string | null>();
const fanartTvPosterCache = new Map<number, string | null>();
const tmdbTvdbIdCache = new Map<number, number | null>();

const CATEGORY_CONFIGS: Array<{ key: string; label: string; endpoint: string; mediaType: "movie" | "tv" }> = [
  { key: "trending", label: "Trending Now", endpoint: "/trending/all/day", mediaType: "movie" },
  { key: "popular-movies", label: "Popular Movies", endpoint: "/movie/popular", mediaType: "movie" },
  { key: "top-10-movies", label: "Top 10 Movies Today", endpoint: "/movie/popular", mediaType: "movie" },
  { key: "top-rated", label: "Top Rated Movies", endpoint: "/movie/top_rated", mediaType: "movie" },
  { key: "popular-tv", label: "Popular TV Shows", endpoint: "/tv/popular", mediaType: "tv" },
  { key: "top-10-tv", label: "Top 10 TV Shows Today", endpoint: "/tv/popular", mediaType: "tv" },
  { key: "new-movies", label: "New on desimaovies", endpoint: "/movie/now_playing", mediaType: "movie" },
  { key: "new-tv", label: "New TV Series", endpoint: "/tv/on_the_air", mediaType: "tv" },
  { key: "upcoming", label: "Coming Soon", endpoint: "/movie/upcoming", mediaType: "movie" },
  {
    key: "desi-picks",
    label: "Desi Picks",
    endpoint: "/discover/movie?with_origin_country=IN&sort_by=popularity.desc",
    mediaType: "movie"
  }
];

const FALLBACK_MOVIES_BY_CATEGORY: Record<
  string,
  Array<{ id: number; title: string; posterPath: string | null; releaseDate: string; rating: number }>
> = {
  trending: [
    { id: 1078605, title: "Weapons", posterPath: null, releaseDate: "2025-01-01", rating: 7.2 },
    { id: 603, title: "The Matrix", posterPath: "https://m.media-amazon.com/images/M/MV5BMjhiMzgxZTctNDc1Ni00OTIxLTgwMTUtMTYzOTlhMzExMzkwXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg", releaseDate: "1999-03-30", rating: 8.7 },
    { id: 155, title: "The Dark Knight", posterPath: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_.jpg", releaseDate: "2008-07-16", rating: 9.0 }
  ],
  "popular-movies": [
    { id: 27205, title: "Inception", posterPath: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg", releaseDate: "2010-07-15", rating: 8.8 },
    { id: 299536, title: "Infinity War", posterPath: "https://m.media-amazon.com/images/M/MV5BMjMxNjY2MDU1OV5BMl5BanBnXkFtZTgwNzY1MTUwNTM@._V1_.jpg", releaseDate: "2018-04-25", rating: 8.4 },
    { id: 157336, title: "Interstellar", posterPath: "https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_.jpg", releaseDate: "2014-11-05", rating: 8.7 }
  ],
  "top-10-movies": [
    { id: 27205, title: "Inception", posterPath: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_.jpg", releaseDate: "2010-07-15", rating: 8.8 },
    { id: 299536, title: "Infinity War", posterPath: "https://m.media-amazon.com/images/M/MV5BMjMxNjY2MDU1OV5BMl5BanBnXkFtZTgwNzY1MTUwNTM@._V1_.jpg", releaseDate: "2018-04-25", rating: 8.4 }
  ],
  "top-rated": [
    { id: 238, title: "The Godfather", posterPath: null, releaseDate: "1972-03-14", rating: 9.2 },
    { id: 278, title: "The Shawshank Redemption", posterPath: null, releaseDate: "1994-09-23", rating: 9.3 },
    { id: 240, title: "The Godfather Part II", posterPath: null, releaseDate: "1974-12-20", rating: 9.0 }
  ],
  "popular-tv": [
    { id: 76479, title: "The Boys", posterPath: "https://m.media-amazon.com/images/M/MV5BN2RjZGFhMDEtMzMwZi00YzczLThmNWQtY2E2MjE1OTMxNDI1XkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_.jpg", releaseDate: "2019-07-25", rating: 8.5 },
    { id: 124364, title: "From", posterPath: "https://m.media-amazon.com/images/M/MV5BMzYyZGY1YWUtN2I4ZC00MjljLWI4YjQtY2Y0YjZhN2ZkYzUzXkEyXkFqcGdeQXVyMTEyMjM2NDc2._V1_.jpg", releaseDate: "2022-02-20", rating: 8.2 },
    { id: 76054, title: "Dark", posterPath: "https://m.media-amazon.com/images/M/MV5BMTEyNDM5NjgzOTdeQTJeQWpwZ15BbWU4MDgyMzA2NjEx._V1_.jpg", releaseDate: "2017-06-27", rating: 8.4 }
  ],
  "top-10-tv": [
    { id: 76479, title: "The Boys", posterPath: "https://m.media-amazon.com/images/M/MV5BN2RjZGFhMDEtMzMwZi00YzczLThmNWQtY2E2MjE1OTMxNDI1XkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_.jpg", releaseDate: "2019-07-25", rating: 8.5 },
    { id: 1396, title: "Breaking Bad", posterPath: "https://m.media-amazon.com/images/M/MV5BMjhiMzgxZTctNDc1Ni00OTIxLTgwMTUtMTYzOTlhMzExMzkwXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg", releaseDate: "2008-01-20", rating: 9.5 }
  ],
  "desi-picks": [
    { id: 127538, title: "Kabir Singh", posterPath: "https://m.media-amazon.com/images/M/MV5BMGRjYjQxM2ItYTM2MS00ZmY0LThmZmUtOTI2NTRhYjEwYWZjXkEyXkFqcGdeQXVyNDAzNDk0MTQ@._V1_.jpg", releaseDate: "2019-06-21", rating: 7.1 },
    { id: 20453, title: "3 Idiots", posterPath: "https://m.media-amazon.com/images/M/MV5BMzE1MTM4NTM2Ml5BMl5BanBnXkFtZTgwNTQyNzQxMTE@._V1_.jpg", releaseDate: "2009-12-23", rating: 8.0 },
    { id: 19404, title: "Dilwale Dulhania Le Jayenge", posterPath: "https://m.media-amazon.com/images/M/MV5BMDQ2OWE3NWQtYjU3ZC00Y2IzLThmODQtOTA5YjhiMTgzNjliXkEyXkFqcGdeQXVyMTA0MTM5NjI2._V1_.jpg", releaseDate: "1995-10-20", rating: 8.5 }
  ]
};

type TmdbAuthConfig = {
  headers: HeadersInit;
  appendApiKeyToUrl: boolean;
};

function getTmdbAuthConfig(): TmdbAuthConfig {
  const apiKey = process.env.TMDB_API_KEY?.trim();
  const readAccessToken = process.env.TMDB_READ_ACCESS_TOKEN?.trim();

  if (readAccessToken) {
    return {
      headers: {
        Authorization: `Bearer ${readAccessToken}`
      },
      appendApiKeyToUrl: false
    };
  }

  if (apiKey) {
    return {
      headers: {},
      appendApiKeyToUrl: true
    };
  }

  throw new Error("Set TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY in your environment.");
}

function toMovieSummary(movie: any, defaultType: "movie" | "tv" = "movie"): MovieSummary {
  const mediaType = movie.media_type || defaultType;
  return {
    id: movie.id,
    title: movie.title ?? movie.name ?? "Untitled",
    overview: movie.overview,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    releaseDate: movie.release_date ?? movie.first_air_date ?? "",
    rating: Number((movie.vote_average ?? 0).toFixed(1)),
    mediaType: mediaType === "tv" ? "tv" : "movie",
    genreIds: movie.genre_ids || []
  };
}

function pickBestFanartPoster(data: FanartMovieResponse): string | null {
  const posters = data.movieposter ?? [];
  if (posters.length === 0) return null;
  const englishPoster = posters.find((poster) => poster.lang === "en")?.url;
  if (englishPoster) return englishPoster;
  const noLangPoster = posters.find((poster) => !poster.lang)?.url;
  if (noLangPoster) return noLangPoster;
  return posters[0]?.url ?? null;
}

function pickBestFanartTvPoster(data: FanartTvResponse): string | null {
  const posters = data.tvposter ?? [];
  if (posters.length === 0) return null;
  const englishPoster = posters.find((poster) => poster.lang === "en")?.url;
  if (englishPoster) return englishPoster;
  const noLangPoster = posters.find((poster) => !poster.lang)?.url;
  if (noLangPoster) return noLangPoster;
  return posters[0]?.url ?? null;
}

async function fetchFanartPosterForMovie(movieId: number): Promise<string | null> {
  const apiKey = process.env.FANART_API_KEY?.trim();
  if (!apiKey) return null;
  if (fanartPosterCache.has(movieId)) return fanartPosterCache.get(movieId) ?? null;
  const url = `${FANART_BASE_URL}/movies/${movieId}?api_key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) { fanartPosterCache.set(movieId, null); return null; }
    const data = (await response.json()) as FanartMovieResponse;
    const posterUrl = pickBestFanartPoster(data);
    fanartPosterCache.set(movieId, posterUrl);
    return posterUrl;
  } catch { fanartPosterCache.set(movieId, null); return null; }
}

async function fetchTvdbIdForTmdbTvShow(tmdbTvId: number): Promise<number | null> {
  if (tmdbTvdbIdCache.has(tmdbTvId)) return tmdbTvdbIdCache.get(tmdbTvId) ?? null;
  const authConfig = getTmdbAuthConfig();
  const endpoint = `/tv/${tmdbTvId}/external_ids`;
  let url = `${TMDB_BASE_URL}${endpoint}`;
  if (authConfig.appendApiKeyToUrl) {
    const apiKey = process.env.TMDB_API_KEY?.trim();
    const separator = endpoint.includes("?") ? "&" : "?";
    url = `${url}${separator}api_key=${apiKey}`;
  }
  try {
    const response = await fetch(url, {
      headers: authConfig.headers,
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
      tmdbTvdbIdCache.set(tmdbTvId, null);
      return null;
    }
    const data = (await response.json()) as { tvdb_id?: number | null };
    const tvdbId = Number(data.tvdb_id);
    const finalId = Number.isFinite(tvdbId) && tvdbId > 0 ? tvdbId : null;
    tmdbTvdbIdCache.set(tmdbTvId, finalId);
    return finalId;
  } catch {
    tmdbTvdbIdCache.set(tmdbTvId, null);
    return null;
  }
}

async function fetchFanartPosterForTv(tmdbTvId: number): Promise<string | null> {
  const apiKey = process.env.FANART_API_KEY?.trim();
  if (!apiKey) return null;
  if (fanartTvPosterCache.has(tmdbTvId)) return fanartTvPosterCache.get(tmdbTvId) ?? null;
  const tvdbId = await fetchTvdbIdForTmdbTvShow(tmdbTvId);
  if (!tvdbId) {
    fanartTvPosterCache.set(tmdbTvId, null);
    return null;
  }
  const url = `${FANART_BASE_URL}/tv/${tvdbId}?api_key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      fanartTvPosterCache.set(tmdbTvId, null);
      return null;
    }
    const data = (await response.json()) as FanartTvResponse;
    const posterUrl = pickBestFanartTvPoster(data);
    fanartTvPosterCache.set(tmdbTvId, posterUrl);
    return posterUrl;
  } catch {
    fanartTvPosterCache.set(tmdbTvId, null);
    return null;
  }
}

async function applyFanartFallbackToMovies(movies: MovieSummary[]): Promise<MovieSummary[]> {
  return Promise.all(movies.map(async (movie) => {
    if (movie.posterPath) return movie;
    const fanartPoster = movie.mediaType === "tv"
      ? await fetchFanartPosterForTv(movie.id)
      : await fetchFanartPosterForMovie(movie.id);
    if (!fanartPoster) return movie;
    return { ...movie, posterPath: fanartPoster };
  }));
}

async function applyFanartFallbackToSearchResults(results: SearchResult[]): Promise<SearchResult[]> {
  return Promise.all(results.map(async (result) => {
    if (result.posterPath) return result;
    const fanartPoster = result.mediaType === "tv"
      ? await fetchFanartPosterForTv(result.id)
      : await fetchFanartPosterForMovie(result.id);
    if (!fanartPoster) return result;
    return { ...result, posterPath: fanartPoster };
  }));
}

function getFallbackMovies(categoryKey: string, mediaType: "movie" | "tv"): MovieSummary[] {
  const fallback = FALLBACK_MOVIES_BY_CATEGORY[categoryKey] ?? [];
  return fallback.map((movie) => ({
    id: movie.id, title: movie.title, overview: "TMDB is currently unavailable. Using fallback picks.",
    posterPath: movie.posterPath, backdropPath: null, releaseDate: movie.releaseDate, rating: movie.rating, mediaType
  }));
}

async function fetchTmdb(endpoint: string, mediaType: "movie" | "tv"): Promise<MovieSummary[]> {
  const authConfig = getTmdbAuthConfig();
  let url = `${TMDB_BASE_URL}${endpoint}`;
  if (authConfig.appendApiKeyToUrl) {
    const apiKey = process.env.TMDB_API_KEY?.trim();
    const separator = endpoint.includes("?") ? "&" : "?";
    url = `${url}${separator}api_key=${apiKey}`;
  }
  const response = await fetch(url, { headers: authConfig.headers, next: { revalidate: 1800 } });
  if (!response.ok) throw new Error(`TMDB request failed for ${endpoint} with status ${response.status}`);
  const data = (await response.json()) as TmdbResponse;
  const movies = data.results.map((m) => toMovieSummary(m, mediaType)).slice(0, 16);
  return applyFanartFallbackToMovies(movies);
}

export async function getCategoryMovies(): Promise<CategoryWithMovies[]> {
  const results = await Promise.all(CATEGORY_CONFIGS.map(async (category) => {
    try {
      const movies = await fetchTmdb(category.endpoint, category.mediaType);
      const finalMovies = category.key.includes("top-10") ? movies.slice(0, 10) : movies;
      return {
        key: category.key, label: category.label, mediaType: category.mediaType,
        movies: finalMovies.length > 0 ? finalMovies : getFallbackMovies(category.key, category.mediaType).slice(0, 10)
      };
    } catch {
      return { key: category.key, label: category.label, mediaType: category.mediaType, movies: getFallbackMovies(category.key, category.mediaType) };
    }
  }));
  return results;
}

type TmdbSearchResponse = {
  results: Array<{
    id: number; title?: string; name?: string; overview: string; poster_path: string | null; backdrop_path: string | null;
    release_date?: string; first_air_date?: string; vote_average: number;
  }>;
};

type TmdbDetailsResponse = {
  id: number; title?: string; name?: string; overview?: string; poster_path: string | null; backdrop_path: string | null;
  release_date?: string; first_air_date?: string; vote_average: number;
  genres?: Array<{ id: number; name: string }>; runtime?: number; tagline?: string;
  number_of_seasons?: number;
  seasons?: Array<{ season_number: number; episode_count: number }>;
};

const SEARCH_RESULT_LIMIT = 10;
const SEARCH_VARIANT_LIMIT = 4;
const MIN_PRIMARY_RESULTS_FOR_NO_VARIANTS = 6;

const FALLBACK_SEARCH_RESULTS: Record<"movie" | "tv", SearchResult[]> = {
  movie: [
    { id: 315635, title: "Spider-Man: Homecoming", overview: "Peter Parker balances high school life with being Spider-Man.", posterPath: "https://m.media-amazon.com/images/M/MV5BNTk4ODQ1MzY5NF5BMl5BanBnXkFtZTgwNjcxMTU4OTE@._V1_.jpg", backdropPath: null, releaseDate: "2017-07-05", rating: 7.3, mediaType: "movie" },
    { id: 157336, title: "Interstellar", overview: "A team travels through a wormhole in search of humanity's future.", posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", backdropPath: null, releaseDate: "2014-11-05", rating: 8.7, mediaType: "movie" }
  ],
  tv: [
    { id: 124364, title: "From", overview: "Unravel the mystery of a city in middle America that traps all those who enter.", posterPath: "https://m.media-amazon.com/images/M/MV5BMzYyZGY1YWUtN2I4ZC00MjljLWI4YjQtY2Y0YjZhN2ZkYzUzXkEyXkFqcGdeQXVyMTEyMjM2NDc2._V1_.jpg", backdropPath: null, releaseDate: "2022-02-20", rating: 8.2, mediaType: "tv" },
    { id: 1396, title: "Breaking Bad", overview: "A chemistry teacher turns to making meth after a diagnosis.", posterPath: "https://m.media-amazon.com/images/M/MV5BMjhiMzgxZTctNDc1Ni00OTIxLTgwMTUtMTYzOTlhMzExMzkwXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_.jpg", backdropPath: null, releaseDate: "2008-01-20", rating: 9.5, mediaType: "tv" }
  ]
};

export function getFallbackSearchResults(query: string, mediaType: "movie" | "tv"): SearchResult[] {
  const q = query.trim();
  if (!q) return [];
  return FALLBACK_SEARCH_RESULTS[mediaType]
    .map((item) => ({ item, score: scoreSearchResult(item, q) }))
    .filter(({ score }) => score >= 0.15)
    .sort((left, right) => right.score - left.score)
    .map(({ item }) => item)
    .slice(0, SEARCH_RESULT_LIMIT);
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function toSearchTokens(value: string): string[] {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function buildSearchVariants(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  const tokens = normalized.split(" ").filter(Boolean);
  const variants = new Set<string>();
  variants.add(normalized);
  if (tokens.length >= 2) { variants.add(tokens.slice(0, -1).join(" ")); variants.add(tokens.slice(1).join(" ")); }
  return Array.from(variants).filter(Boolean);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

function scoreSearchResult(result: SearchResult, rawQuery: string): number {
  const normalizedQuery = normalizeSearchText(rawQuery);
  const normalizedTitle = normalizeSearchText(result.title);
  if (!normalizedQuery || !normalizedTitle) return 0;
  if (normalizedQuery === normalizedTitle) return 2;
  const queryTokens = toSearchTokens(normalizedQuery);
  const titleTokens = new Set(toSearchTokens(normalizedTitle));
  const overlap = queryTokens.filter((token) => titleTokens.has(token)).length;
  const overlapRatio = queryTokens.length > 0 ? overlap / queryTokens.length : 0;
  const maxLen = Math.max(normalizedQuery.length, normalizedTitle.length);
  const distance = levenshteinDistance(normalizedQuery, normalizedTitle);
  const distanceScore = maxLen > 0 ? 1 - distance / maxLen : 0;
  return overlapRatio * 0.55 + distanceScore * 0.35;
}

function rankAndDedupeResults(results: SearchResult[], query: string): SearchResult[] {
  const byId = new Map<number, SearchResult>();
  for (const result of results) {
    const existing = byId.get(result.id);
    if (!existing || scoreSearchResult(result, query) > scoreSearchResult(existing, query)) {
      byId.set(result.id, result);
    }
  }
  return Array.from(byId.values()).sort((left, right) => scoreSearchResult(right, query) - scoreSearchResult(left, query)).slice(0, SEARCH_RESULT_LIMIT);
}

async function fetchTmdbSearchResults(authConfig: TmdbAuthConfig, mediaType: "movie" | "tv", query: string, language: string = "en-US"): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const endpoint = `/search/${mediaType}?query=${encodedQuery}&include_adult=false&language=${language}&page=1`;
  let url = `${TMDB_BASE_URL}${endpoint}`;
  if (authConfig.appendApiKeyToUrl) {
    const apiKey = process.env.TMDB_API_KEY?.trim();
    const separator = endpoint.includes("?") ? "&" : "?";
    url = `${url}${separator}api_key=${apiKey}`;
  }
  const response = await fetch(url, { headers: authConfig.headers, next: { revalidate: 1200 }, signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error(`TMDB request failed for ${endpoint} with status ${response.status}`);
  const data = (await response.json()) as TmdbSearchResponse;
  return data.results.slice(0, SEARCH_RESULT_LIMIT).map((item) => ({
    id: item.id, title: item.title ?? item.name ?? "Untitled", overview: item.overview,
    posterPath: item.poster_path, backdropPath: item.backdrop_path, releaseDate: item.release_date ?? item.first_air_date ?? "",
    rating: Number(item.vote_average.toFixed(1)), mediaType
  }));
}

async function fetchTmdbDetailsById(authConfig: TmdbAuthConfig, mediaType: "movie" | "tv", tmdbId: number): Promise<SearchResult | null> {
  const endpoint = `/${mediaType}/${tmdbId}?language=en-US`;
  let url = `${TMDB_BASE_URL}${endpoint}`;
  if (authConfig.appendApiKeyToUrl) {
    const apiKey = process.env.TMDB_API_KEY?.trim();
    const separator = endpoint.includes("?") ? "&" : "?";
    url = `${url}${separator}api_key=${apiKey}`;
  }
  try {
    const response = await fetch(url, { headers: authConfig.headers, next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    const data = (await response.json()) as TmdbDetailsResponse;
    return {
      id: data.id, title: data.title ?? data.name ?? "Untitled", overview: data.overview ?? "",
      posterPath: data.poster_path, backdropPath: data.backdrop_path, releaseDate: data.release_date ?? data.first_air_date ?? "",
      rating: Number((data.vote_average ?? 0).toFixed(1)), mediaType, genres: data.genres?.map((g) => g.name),
      runtime: data.runtime, tagline: data.tagline, numberOfSeasons: data.number_of_seasons,
      seasons: data.seasons?.map((s) => ({ seasonNumber: s.season_number, episodeCount: s.episode_count }))
    };
  } catch { return null; }
}

export async function getSimilarMedia(mediaType: "movie" | "tv", tmdbId: number): Promise<SearchResult[]> {
  const authConfig = getTmdbAuthConfig();
  const endpoint = `/${mediaType}/${tmdbId}/recommendations?language=en-US&page=1`;
  let url = `${TMDB_BASE_URL}${endpoint}`;
  if (authConfig.appendApiKeyToUrl) {
    const apiKey = process.env.TMDB_API_KEY?.trim();
    const separator = endpoint.includes("?") ? "&" : "?";
    url = `${url}${separator}api_key=${apiKey}`;
  }
  try {
    const response = await fetch(url, { headers: authConfig.headers, next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return [];
    const data = (await response.json()) as TmdbSearchResponse;
    const results = data.results.slice(0, 12).map((item) => ({
      id: item.id, title: item.title ?? item.name ?? "Untitled", overview: item.overview,
      posterPath: item.poster_path, backdropPath: item.backdrop_path, releaseDate: item.release_date ?? item.first_air_date ?? "",
      rating: Number(item.vote_average.toFixed(1)), mediaType
    }));
    return applyFanartFallbackToSearchResults(results);
  } catch { return []; }
}

export async function getMediaByTmdbIds(ids: number[], mediaType: "movie" | "tv"): Promise<SearchResult[]> {
  if (ids.length === 0) return [];
  const authConfig = getTmdbAuthConfig();
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id) && id > 0)));
  const results = await Promise.all(uniqueIds.slice(0, SEARCH_RESULT_LIMIT).map((id) => fetchTmdbDetailsById(authConfig, mediaType, id)));
  const filteredResults = results.filter((item): item is SearchResult => item !== null);
  return applyFanartFallbackToSearchResults(filteredResults);
}

export async function getSeasonDetails(tmdbId: number, seasonNumber: number): Promise<any[]> {
  const authConfig = getTmdbAuthConfig();
  const endpoint = `/tv/${tmdbId}/season/${seasonNumber}?language=en-US`;
  let url = `${TMDB_BASE_URL}${endpoint}`;
  if (authConfig.appendApiKeyToUrl) {
    const apiKey = process.env.TMDB_API_KEY?.trim();
    const separator = endpoint.includes("?") ? "&" : "?";
    url = `${url}${separator}api_key=${apiKey}`;
  }
  try {
    const response = await fetch(url, { headers: authConfig.headers, next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) });
    if (!response.ok) return [];
    const data = await response.json();
    return data.episodes || [];
  } catch { return []; }
}

async function safeFetchTmdbSearchResults(authConfig: TmdbAuthConfig, mediaType: "movie" | "tv", query: string, language: string = "en-US"): Promise<SearchResult[]> {
  try { return await fetchTmdbSearchResults(authConfig, mediaType, query, language); } catch { return []; }
}

export async function searchMediaByTitle(query: string, mediaType: "movie" | "tv", language: string = "en-US"): Promise<SearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];
  const authConfig = getTmdbAuthConfig();
  const primaryResults = await safeFetchTmdbSearchResults(authConfig, mediaType, trimmedQuery, language);
  let mergedResults = [...primaryResults];
  if (primaryResults.length < MIN_PRIMARY_RESULTS_FOR_NO_VARIANTS) {
    const variants = buildSearchVariants(trimmedQuery).slice(0, SEARCH_VARIANT_LIMIT);
    const extraResults = await Promise.all(variants.map((variant) => safeFetchTmdbSearchResults(authConfig, mediaType, variant)));
    mergedResults = [...mergedResults, ...extraResults.flat()];
  }
  if (mergedResults.length === 0) return getFallbackSearchResults(trimmedQuery, mediaType);
  const results = rankAndDedupeResults(mergedResults, trimmedQuery);
  try {
    const hydratedResults = await Promise.race([
      getMediaByTmdbIds(results.map((r) => r.id), mediaType),
      new Promise<SearchResult[]>((_, reject) => setTimeout(() => reject(new Error("Hydration timeout")), 3000))
    ]);
    return (hydratedResults as SearchResult[]).length > 0 ? (hydratedResults as SearchResult[]) : results;
  } catch { return results; }
}
