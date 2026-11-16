/**
 * Anime catalogue — served from the static build-time snapshot.
 *
 * AniList blocks Cloudflare Workers egress IPs (HTTP 403), so the Worker
 * cannot call the AniList GraphQL API at request time. `npm run build`
 * runs `scripts/build-anime.mjs` first, which fetches the popular and
 * trending lists from the machine running the build and writes
 * `lib/anime-snapshot.json`. At runtime everything is read from that
 * snapshot — no network calls at all.
 *
 * If the snapshot is empty or a requested id is missing, we fall back to
 * the live API so local dev / Vercel (which can reach AniList) still get
 * fresh data. On Cloudflare those calls return 403 and are filtered out.
 */

import snapshot from "./anime-snapshot.json";

const ANILIST_API = "https://graphql.anilist.co";
const SNAPSHOT_FRESH_MS = 24 * 60 * 60 * 1000;

type AnimeSnapshot = {
  popular: MediaNode[];
  trending: MediaNode[];
  byId: MediaNode[];
  byIdMap: Record<string, MediaNode>;
  fetchedAt: number;
};

const data = snapshot as unknown as AnimeSnapshot;

export type AnimeSummary = {
  id: number;
  anilistId: number;
  title: string;
  titleRomaji: string;
  /** Native (often Japanese) title — a third key for the TMDB title lookup. */
  titleNative?: string;
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

export type MediaNode = {
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

/** Is the committed snapshot present and not absurdly old? */
function hasFreshSnapshot(): boolean {
  return (
    Array.isArray(data.popular) &&
    data.popular.length > 0 &&
    Date.now() - (data.fetchedAt ?? 0) < SNAPSHOT_FRESH_MS * 30
  );
}

function snapshotMedia(kind: "popular" | "trending"): MediaNode[] {
  const media = data[kind];
  return Array.isArray(media) ? media : [];
}

const byIdMap = new Map<number, MediaNode>();
for (const media of data.byId ?? []) {
  if (media?.id) byIdMap.set(Number(media.id), media);
}
for (const [id, media] of Object.entries(data.byIdMap ?? {})) {
  const numId = Number(id);
  if (Number.isFinite(numId) && numId > 0 && media) byIdMap.set(numId, media);
}

function snapshotById(): Map<number, MediaNode> {
  return byIdMap;
}

function toAnimeSummaryFromMedia(media: MediaNode): AnimeSummary {
  const title =
    media.title?.english?.trim() || media.title?.romaji?.trim() || "Untitled";
  const score = media.averageScore ? media.averageScore / 10 : 0;

  return {
    id: media.id,
    anilistId: media.id,
    title,
    titleRomaji: media.title?.romaji?.trim() || title,
    titleNative: media.title?.native?.trim() || undefined,
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

function toAnimeDetailFromMedia(media: MediaNode): AnimeDetail {
  const summary = toAnimeSummaryFromMedia(media);
  const studios = (media.studios?.nodes ?? [])
    .map((node) => node?.name)
    .filter((name): name is string => Boolean(name));

  return {
    ...summary,
    status: media.status ?? "UNKNOWN",
    studios,
    descriptionHtml: media.description ?? null,
    nextEpisodeId: media.nextEpisodeId ?? null,
    previousEpisodeId: media.previousEpisodeId ?? null,
  };
}

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
    /* AniList blocks some origins entirely (e.g. Workers) — snapshot is the source. */
    return null;
  }
}

function cachedList(
  key: string,
  loader: () => Promise<AnimeSummary[]>,
): Promise<AnimeSummary[]> {
  const hit = animeCache.get(key);
  if (hit && Date.now() - hit.at < ANIME_CACHE_TTL_MS) return Promise.resolve(hit.data);
  return loader().then((data) => {
    if (data.length > 0) animeCache.set(key, { at: Date.now(), data });
    return data;
  });
}

async function getPopularAnimeFromSnapshot(perPage: number): Promise<AnimeSummary[]> {
  return snapshotMedia("popular").slice(0, perPage).map(toAnimeSummaryFromMedia);
}

async function getTrendingAnimeFromSnapshot(perPage: number): Promise<AnimeSummary[]> {
  return snapshotMedia("trending").slice(0, perPage).map(toAnimeSummaryFromMedia);
}

export async function getPopularAnime(perPage = 16): Promise<AnimeSummary[]> {
  return cachedList(`popular:${perPage}`, async () => {
    const snapshotList = await getPopularAnimeFromSnapshot(perPage);
    if (snapshotList.length) return snapshotList;
    if (!hasFreshSnapshot()) {
      const data = await anilistFetch<{ Page: { media: MediaNode[] } }>(
        `query ($perPage: Int) {
          Page(perPage: $perPage) {
            media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ${MEDIA_FIELDS} }
          }
        }`,
        { perPage },
      );
      return (data?.Page?.media ?? []).map(toAnimeSummaryFromMedia);
    }
    return [];
  });
}

export async function getTrendingAnime(perPage = 16): Promise<AnimeSummary[]> {
  return cachedList(`trending:${perPage}`, async () => {
    const snapshotList = await getTrendingAnimeFromSnapshot(perPage);
    if (snapshotList.length) return snapshotList;
    if (!hasFreshSnapshot()) {
      const data = await anilistFetch<{ Page: { media: MediaNode[] } }>(
        `query ($perPage: Int) {
          Page(perPage: $perPage) {
            media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { ${MEDIA_FIELDS} }
          }
        }`,
        { perPage },
      );
      return (data?.Page?.media ?? []).map(toAnimeSummaryFromMedia);
    }
    return [];
  });
}

export async function getAnimeById(anilistId: number): Promise<AnimeDetail | null> {
  const fromSnapshot = snapshotById().get(anilistId);
  if (fromSnapshot) return toAnimeDetailFromMedia(fromSnapshot);

  const data = await anilistFetch<{ Media: MediaNode }>(
    `query ($id: Int) {
      Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} }
    }`,
    { id: anilistId },
  );
  if (!data?.Media) return null;
  return toAnimeDetailFromMedia(data.Media);
}

/**
 * Last-resort lookup: find the anime in the cached popular/trending lists.
 * Keeps the detail page working when AniList rate-limits a direct lookup.
 */
export async function findAnimeInCatalogue(
  anilistId: number,
): Promise<AnimeSummary | null> {
  const fromSnapshot = snapshotById().get(anilistId);
  if (fromSnapshot) return toAnimeSummaryFromMedia(fromSnapshot);

  const lists = await Promise.all([getPopularAnime(40), getTrendingAnime(40)]);
  for (const list of lists) {
    const match = list.find((anime) => anime.anilistId === anilistId);
    if (match) return match;
  }
  return null;
}

export async function searchAnime(
  query: string,
  perPage = 16,
): Promise<AnimeSummary[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  if (hasFreshSnapshot()) {
    const needle = trimmed.toLowerCase();
    const seen = new Set<number>();
    const matches: AnimeSummary[] = [];
    for (const kind of ["popular", "trending"] as const) {
      for (const media of snapshotMedia(kind)) {
        if (seen.has(media.id)) continue;
        const title = (
          media.title?.english?.trim() ||
          media.title?.romaji?.trim() ||
          media.title?.native?.trim() ||
          ""
        ).toLowerCase();
        if (title.includes(needle)) {
          seen.add(media.id);
          matches.push(toAnimeSummaryFromMedia(media));
          if (matches.length >= perPage) return matches;
        }
      }
    }
    return matches;
  }

  const data = await anilistFetch<{ Page: { media: MediaNode[] } }>(
    `query ($search: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} }
      }
    }`,
    { search: trimmed, perPage },
  );
  return (data?.Page?.media ?? []).map(toAnimeSummaryFromMedia);
}

export function getAnimeCatalogueSize(): number {
  return snapshotById().size;
}
