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

function getTmdbApiKey(): string {
  const key = process.env.TMDB_API_KEY;

  if (!key) {
    throw new Error("TMDB_API_KEY is not set in your environment.");
  }

  return key;
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

async function fetchTmdb(endpoint: string): Promise<MovieSummary[]> {
  const apiKey = getTmdbApiKey();
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${TMDB_BASE_URL}${endpoint}${separator}api_key=${apiKey}`;

  const response = await fetch(url, {
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
          movies
        };
      } catch {
        return {
          key: category.key,
          label: category.label,
          movies: []
        };
      }
    })
  );

  return results;
}
