/**
 * AniList GraphQL API (https://graphql.anilist.co)
 *
 * No API key required. Vidy resolves anime by AniList id
 * (https://www.vidy.st/anime/{anilistId}/{episode}), so our anime
 * catalogue is keyed by AniList id rather than TMDB id.
 */

const ANILIST_API = "https://graphql.anilist.co";

export type AnimeSummary = {
  id: number;
  anilistId: number;
  title: string;
  titleRomaji: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  rating: number;
  mediaType: "tv";
  episodes: number;
  format: string;
  genres: string[];
};

export type AnimeDetail = AnimeSummary & {
  status: string;
  studios: string[];
  descriptionHtml: string | null;
  nextEpisodeId: number | null;
  previousEpisodeId: number | null;
};

type MediaNode = {
  id: number;
  title?: { romaji?: string | null; english?: string | null; native?: string | null } | null;
  description?: string | null;
  coverImage?: { large?: string | null; extraLarge?: string | null } | null;
  bannerImage?: string | null;
  episodes?: number | null;
  format?: string | null;
  status?: string | null;
  seasonYear?: number | null;
  averageScore?: number | null;
  genres?: string[] | null;
  studios?: { nodes?: { name?: string | null }[] | null } | null;
  nextEpisodeId?: number | null;
  previousEpisodeId?: number | null;
};

async function anilistFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T | null> {
  try {
    const response = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: T; errors?: unknown[] };
    if (!payload?.data) return null;
    return payload.data;
  } catch {
    return null;
  }
}

function toAnimeSummary(media: MediaNode): AnimeSummary {
  const title =
    media.title?.english?.trim() || media.title?.romaji?.trim() || "Untitled";
  const score = media.averageScore ? media.averageScore / 10 : 0;

  return {
    id: media.id,
    anilistId: media.id,
    title,
    titleRomaji: media.title?.romaji?.trim() || title,
    overview: media.description?.replace(/<[^>]*>/g, "").trim() || "",
    posterPath: media.coverImage?.large ?? media.coverImage?.extraLarge ?? null,
    backdropPath: media.bannerImage ?? null,
    releaseDate: media.seasonYear ? String(media.seasonYear) : "",
    rating: Number(score.toFixed(1)),
    mediaType: "tv",
    episodes: media.episodes ?? 0,
    format: media.format ?? "TV",
    genres: media.genres ?? [],
  };
}

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  description(asHtml: false)
  coverImage { large extraLarge }
  bannerImage
  episodes
  format
  status
  seasonYear
  averageScore
  genres
  studios { nodes { name } }
`;

const animeCache = new Map<string, { at: number; data: AnimeSummary[] }>();
const ANIME_CACHE_TTL_MS = 10 * 60 * 1000;

async function cachedAnime(key: string, loader: () => Promise<AnimeSummary[]>): Promise<AnimeSummary[]> {
  const hit = animeCache.get(key);
  if (hit && Date.now() - hit.at < ANIME_CACHE_TTL_MS) return hit.data;
  const data = await loader();
  if (data.length > 0) animeCache.set(key, { at: Date.now(), data });
  return data;
}

export async function getPopularAnime(perPage = 16): Promise<AnimeSummary[]> {
  return cachedAnime(`popular:${perPage}`, async () => {
    const data = await anilistFetch<{ Page: { media: MediaNode[] } }>(
      `query ($perPage: Int) {
        Page(perPage: $perPage) {
          media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ${MEDIA_FIELDS} }
        }
      }`,
      { perPage },
    );
    return (data?.Page?.media ?? []).map(toAnimeSummary);
  });
}

export async function getTrendingAnime(perPage = 16): Promise<AnimeSummary[]> {
  return cachedAnime(`trending:${perPage}`, async () => {
    const data = await anilistFetch<{ Page: { media: MediaNode[] } }>(
      `query ($perPage: Int) {
        Page(perPage: $perPage) {
          media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { ${MEDIA_FIELDS} }
        }
      }`,
      { perPage },
    );
    return (data?.Page?.media ?? []).map(toAnimeSummary);
  });
}

export async function getAnimeById(anilistId: number): Promise<AnimeDetail | null> {
  const data = await anilistFetch<{ Media: MediaNode }>(
    `query ($id: Int) {
      Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} }
    }`,
    { id: anilistId },
  );
  if (!data?.Media) return null;

  const summary = toAnimeSummary(data.Media);
  return {
    ...summary,
    status: data.Media.status ?? "UNKNOWN",
    studios: (data.Media.studios?.nodes ?? [])
      .map((node) => node?.name)
      .filter((name): name is string => Boolean(name)),
    descriptionHtml: data.Media.description ?? null,
    nextEpisodeId: null,
    previousEpisodeId: null,
  };
}

export async function searchAnime(
  query: string,
  perPage = 16,
): Promise<AnimeSummary[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const data = await anilistFetch<{ Page: { media: MediaNode[] } }>(
    `query ($search: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} }
      }
    }`,
    { search: trimmed, perPage },
  );
  return (data?.Page?.media ?? []).map(toAnimeSummary);
}
