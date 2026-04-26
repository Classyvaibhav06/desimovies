export type MovieSummary = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  rating: number;
};

export type CategoryWithMovies = {
  key: string;
  label: string;
  movies: MovieSummary[];
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

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const CATEGORY_CONFIGS: Array<{ key: string; label: string; endpoint: string }> = [
  { key: "trending", label: "Trending", endpoint: "/trending/movie/week" },
  { key: "popular", label: "Popular", endpoint: "/movie/popular" },
  { key: "top-rated", label: "Top Rated", endpoint: "/movie/top_rated" },
  { key: "in-cinemas", label: "In Cinemas", endpoint: "/movie/now_playing" },
  {
    key: "desi-picks",
    label: "Desi Picks",
    endpoint: "/discover/movie?with_origin_country=IN&sort_by=popularity.desc"
  }
];

const FALLBACK_MOVIES_BY_CATEGORY: Record<
  string,
  Array<{ id: number; title: string; posterPath: string | null; releaseDate: string; rating: number }>
> = {
  trending: [
    { id: 1078605, title: "Weapons", posterPath: null, releaseDate: "2025-01-01", rating: 7.2 },
    { id: 603, title: "The Matrix", posterPath: null, releaseDate: "1999-03-30", rating: 8.7 },
    { id: 155, title: "The Dark Knight", posterPath: null, releaseDate: "2008-07-16", rating: 9.0 }
  ],
  popular: [
    { id: 27205, title: "Inception", posterPath: null, releaseDate: "2010-07-15", rating: 8.8 },
    { id: 299536, title: "Infinity War", posterPath: null, releaseDate: "2018-04-25", rating: 8.4 },
    { id: 157336, title: "Interstellar", posterPath: null, releaseDate: "2014-11-05", rating: 8.7 }
  ],
  "top-rated": [
    { id: 238, title: "The Godfather", posterPath: null, releaseDate: "1972-03-14", rating: 9.2 },
    { id: 278, title: "The Shawshank Redemption", posterPath: null, releaseDate: "1994-09-23", rating: 9.3 },
    { id: 240, title: "The Godfather Part II", posterPath: null, releaseDate: "1974-12-20", rating: 9.0 }
  ],
  "in-cinemas": [
    { id: 346698, title: "Barbie", posterPath: null, releaseDate: "2023-07-19", rating: 7.1 },
    { id: 872585, title: "Oppenheimer", posterPath: null, releaseDate: "2023-07-19", rating: 8.1 },
    { id: 438631, title: "Dune", posterPath: null, releaseDate: "2021-09-15", rating: 7.8 }
  ],
  "desi-picks": [
    { id: 127538, title: "Kabir Singh", posterPath: null, releaseDate: "2019-06-21", rating: 7.1 },
    { id: 20453, title: "3 Idiots", posterPath: null, releaseDate: "2009-12-23", rating: 8.0 },
    { id: 19404, title: "Dilwale Dulhania Le Jayenge", posterPath: null, releaseDate: "1995-10-20", rating: 8.5 }
  ]
};

type TmdbAuthConfig = {
  headers: HeadersInit;
  appendApiKeyToUrl: boolean;
};

function getTmdbAuthConfig(): TmdbAuthConfig {
  const readAccessToken = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  const apiKey = process.env.TMDB_API_KEY?.trim();

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

function toMovieSummary(movie: TmdbResponse["results"][number]): MovieSummary {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    releaseDate: movie.release_date,
    rating: Number(movie.vote_average.toFixed(1))
  };
}

function getFallbackMovies(categoryKey: string): MovieSummary[] {
  const fallback = FALLBACK_MOVIES_BY_CATEGORY[categoryKey] ?? [];

  return fallback.map((movie) => ({
    id: movie.id,
    title: movie.title,
    overview: "TMDB is currently unavailable. Using fallback picks.",
    posterPath: null,
    backdropPath: null,
    releaseDate: movie.releaseDate,
    rating: movie.rating
  }));
}

async function fetchTmdb(endpoint: string): Promise<MovieSummary[]> {
  const authConfig = getTmdbAuthConfig();
  let url = `${TMDB_BASE_URL}${endpoint}`;

  if (authConfig.appendApiKeyToUrl) {
    const apiKey = process.env.TMDB_API_KEY?.trim();
    const separator = endpoint.includes("?") ? "&" : "?";
    url = `${url}${separator}api_key=${apiKey}`;
  }

  const response = await fetch(url, {
    headers: authConfig.headers,
    next: { revalidate: 1800 }
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed for ${endpoint} with status ${response.status}`);
  }

  const data = (await response.json()) as TmdbResponse;
  return data.results.map(toMovieSummary).slice(0, 16);
}

export async function getCategoryMovies(): Promise<CategoryWithMovies[]> {
  const results = await Promise.all(
    CATEGORY_CONFIGS.map(async (category) => {
      try {
        const movies = await fetchTmdb(category.endpoint);
        return {
          key: category.key,
          label: category.label,
          movies: movies.length > 0 ? movies : getFallbackMovies(category.key)
        };
      } catch {
        return {
          key: category.key,
          label: category.label,
          movies: getFallbackMovies(category.key)
        };
      }
    })
  );

  return results;
}
