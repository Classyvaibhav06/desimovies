export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toSearchTokens(value: string): string[] {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    previous = current;
  }

  return previous[b.length] ?? 0;
}

export function filterCloseMatchResults<T extends { title: string }>(
  results: T[],
  query: string
): T[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return results;

  return results.filter((result) => {
    const normalizedTitle = normalizeSearchText(result.title);
    if (!normalizedTitle) return false;

    if (
      normalizedTitle.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedTitle)
    ) {
      return true;
    }

    const queryTokens = normalizedQuery.split(" ").filter(Boolean);
    const titleTokens = normalizedTitle.split(" ").filter(Boolean);
    const hasTokenPrefix = queryTokens.some((queryToken) =>
      titleTokens.some(
        (titleToken) =>
          titleToken.startsWith(queryToken) || queryToken.startsWith(titleToken)
      )
    );

    if (hasTokenPrefix) return true;

    const distance = levenshteinDistance(normalizedQuery, normalizedTitle);
    const maxLen = Math.max(normalizedQuery.length, normalizedTitle.length);
    const ratio = maxLen > 0 ? distance / maxLen : 1;
    return ratio <= 0.42;
  });
}

export function scoreSearchResult(
  result: { title: string },
  rawQuery: string
): number {
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

export function buildSearchVariants(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  const tokens = normalized.split(" ").filter(Boolean);
  const variants = new Set<string>();
  variants.add(normalized);
  if (tokens.length >= 2) {
    variants.add(tokens.slice(0, -1).join(" "));
    variants.add(tokens.slice(1).join(" "));
  }
  return Array.from(variants).filter(Boolean);
}

// In-Memory Simple Cache with TTL (Default 5 mins) & Max Size Limit
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleTTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxItems: number;
  private defaultTtlMs: number;

  constructor(maxItems = 200, defaultTtlMs = 300000) {
    this.maxItems = maxItems;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    if (this.cache.size >= this.maxItems) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global server-side search cache singleton
export const searchServerCache = new SimpleTTLCache<any>(300, 5 * 60 * 1000);
