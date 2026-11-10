/**
 * Vidy embed player integration (https://www.vidy.st)
 *
 * Routes:
 *   /movie/{tmdbId}
 *   /tv/{tmdbId}/{season}/{episode}
 *   /anime/{anilistId}/{episode}
 *
 * Opt-in query flags: color, progress, autoplay, nextEpisode,
 * episodeSelector, autoplayNextEpisode.
 */

export const VIDY_ORIGIN = "https://www.vidy.st";

/** Player accent — our brand red (hex without #). */
export const VIDY_ACCENT = "E50914";

export type VidyMediaType = "movie" | "tv";

export type VidyUrlOptions = {
  mediaType: VidyMediaType;
  tmdbId: number;
  season?: number;
  episode?: number;
  /** Resume playback at this many seconds. */
  progressSeconds?: number;
  autoplay?: boolean;
  episodeSelector?: boolean;
  nextEpisode?: boolean;
  accent?: string;
};

export function buildVidyUrl({
  mediaType,
  tmdbId,
  season = 1,
  episode = 1,
  progressSeconds = 0,
  autoplay = true,
  episodeSelector = true,
  nextEpisode = true,
  accent = VIDY_ACCENT,
}: VidyUrlOptions): string {
  const path =
    mediaType === "tv"
      ? `/tv/${tmdbId}/${season}/${episode}`
      : `/movie/${tmdbId}`;

  const params = new URLSearchParams();
  params.set("color", accent);
  if (autoplay) params.set("autoplay", "true");
  if (progressSeconds > 0) params.set("progress", String(Math.floor(progressSeconds)));
  if (mediaType === "tv") {
    if (nextEpisode) params.set("nextEpisode", "true");
    if (episodeSelector) params.set("episodeSelector", "true");
  }

  return `${VIDY_ORIGIN}${path}?${params.toString()}`;
}

/**
 * Anime uses AniList ids: /anime/{anilistId}/{episode}
 */
export function buildVidyAnimeUrl({
  anilistId,
  episode = 1,
  progressSeconds = 0,
  autoplay = true,
  episodeSelector = true,
  nextEpisode = true,
  accent = VIDY_ACCENT,
}: {
  anilistId: number;
  episode?: number;
  progressSeconds?: number;
  autoplay?: boolean;
  episodeSelector?: boolean;
  nextEpisode?: boolean;
  accent?: string;
}): string {
  const params = new URLSearchParams();
  params.set("color", accent);
  if (autoplay) params.set("autoplay", "true");
  if (progressSeconds > 0) params.set("progress", String(Math.floor(progressSeconds)));
  if (nextEpisode) params.set("nextEpisode", "true");
  if (episodeSelector) params.set("episodeSelector", "true");

  return `${VIDY_ORIGIN}/anime/${anilistId}/${episode}?${params.toString()}`;
}

/** Vidy posts JSON strings to window.parent. */
export type VidyPayload = {
  event?: "timeupdate" | "play" | "pause" | "ended";
  currentTime?: number;
  duration?: number;
  type?: string;
};

export function parseVidyPayload(data: unknown): VidyPayload | null {
  if (typeof data !== "string") return null;
  try {
    const payload = JSON.parse(data) as VidyPayload;
    if (!payload || typeof payload !== "object") return null;
    if (!payload.event && payload.type !== "MEDIA_DATA") return null;
    return payload;
  } catch {
    return null;
  }
}

export function isVidyOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === "vidy.st" || url.hostname.endsWith(".vidy.st");
  } catch {
    return false;
  }
}

export type WatchPosition = {
  currentTime: number;
  duration: number;
  updatedAt: number;
};

export const WATCH_POSITION_KEY = "vidy:watch-positions";

export function watchPositionKey(
  mediaType: VidyMediaType,
  tmdbId: number,
  season = 1,
  episode = 1,
): string {
  return `${mediaType}-${tmdbId}-${season}-${episode}`;
}

export function readWatchPositions(): Record<string, WatchPosition> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WATCH_POSITION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, WatchPosition>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeWatchPosition(
  key: string,
  position: WatchPosition,
): Record<string, WatchPosition> {
  const all = readWatchPositions();
  all[key] = position;
  try {
    window.localStorage.setItem(WATCH_POSITION_KEY, JSON.stringify(all));
  } catch {
    /* storage disabled — ignore */
  }
  return all;
}
