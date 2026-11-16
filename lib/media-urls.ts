export function posterUrl(path: string | null, size = "w342"): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  // Local static assets baked at build time (see scripts/build-anime.mjs)
  if (path.startsWith("/anime/")) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function backdropUrl(path: string | null, size = "w1280"): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/anime/")) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
