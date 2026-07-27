import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getFallbackSearchResults,
  getMediaByTmdbIds,
  searchMediaByTitle,
  SearchResult,
} from "@/lib/tmdb";
import {
  filterCloseMatchResults,
  searchServerCache,
  toSearchTokens,
} from "@/lib/search-utils";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL?.trim() || "openai/gpt-oss-120b";

function extractAiResolvedIds(content: string): number[] {
  const match = content.match(/\{[\s\S]*\}/);

  if (!match) {
    return [];
  }

  try {
    const parsed = JSON.parse(match[0]) as { tmdb_ids?: number[]; ids?: number[] };
    const ids = parsed.tmdb_ids ?? parsed.ids ?? [];
    return ids.filter((id) => Number.isFinite(id) && id > 0).map((id) => Number(id));
  } catch {
    return [];
  }
}

async function resolveTmdbIdsWithAi(
  query: string,
  mediaType: "movie" | "tv"
): Promise<number[]> {
  const apiKey = process.env.NVIDIA_API_KEY?.trim();

  if (!apiKey) {
    return [];
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: NVIDIA_BASE_URL,
  });

  const completion = await openai.chat.completions.create({
    model: NVIDIA_MODEL,
    temperature: 0,
    top_p: 1,
    max_tokens: 200,
    stream: false,
    messages: [
      {
        role: "system",
        content:
          'You map user title queries to TMDB IDs. Return strict JSON only with this shape: {"tmdb_ids":[number,...]}. Return up to 5 best IDs. No markdown.',
      },
      {
        role: "user",
        content: `Find TMDB ${mediaType} IDs for: ${query}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  return extractAiResolvedIds(content).slice(0, 5);
}

async function searchSingleType(
  query: string,
  mediaType: "movie" | "tv",
  lang: string,
  useCloseMatchFilter: boolean
): Promise<SearchResult[]> {
  const isTmdbId = /^\d+$/.test(query);

  if (isTmdbId) {
    const idResults = await getMediaByTmdbIds([Number(query)], mediaType);
    if (idResults.length > 0) return idResults;
  }

  let results = await searchMediaByTitle(query, mediaType, lang);

  // Smart AI Lookup Optimization:
  // Only trigger LLM lookup if primary search returned 0 results OR query is long (>3 words)
  const isLongNaturalLanguageQuery = toSearchTokens(query).length >= 4;
  const shouldTryAiLookup =
    !useCloseMatchFilter && (results.length === 0 || isLongNaturalLanguageQuery);

  if (shouldTryAiLookup) {
    try {
      const aiIds = await resolveTmdbIdsWithAi(query, mediaType);
      if (aiIds.length > 0) {
        const aiResolvedResults = await getMediaByTmdbIds(aiIds, mediaType);
        if (aiResolvedResults.length > 0) {
          results = aiResolvedResults;
        }
      }
    } catch {
      // Fall back silently to standard TMDB text search
    }
  }

  if (results.length === 0) {
    const fallbackResults = getFallbackSearchResults(query, mediaType);
    results = fallbackResults;
  }

  return useCloseMatchFilter ? filterCloseMatchResults(results, query) : results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const rawType = searchParams.get("type");
  const lang = searchParams.get("lang") ?? "en-US";
  const useCloseMatchFilter =
    searchParams.get("closeMatch") === "1" || searchParams.get("startsWith") === "1";

  const isTmdbId = /^\d+$/.test(query);

  if (!isTmdbId && query.length < 2) {
    return NextResponse.json({ results: [], message: "Type at least 2 characters." });
  }

  // Check server cache first
  const cacheKey = `${query.toLowerCase()}:${rawType}:${lang}:${useCloseMatchFilter}`;
  const cachedResults = searchServerCache.get(cacheKey);
  if (cachedResults) {
    return NextResponse.json({ results: cachedResults, cached: true });
  }

  try {
    let combinedResults: SearchResult[] = [];

    if (rawType === "movie" || rawType === "tv") {
      combinedResults = await searchSingleType(query, rawType, lang, useCloseMatchFilter);
    } else {
      // "all" or unspecified: Search both movie and tv concurrently on server
      const [movies, tvs] = await Promise.all([
        searchSingleType(query, "movie", lang, useCloseMatchFilter),
        searchSingleType(query, "tv", lang, useCloseMatchFilter),
      ]);

      const merged = [...movies, ...tvs];
      // Deduplicate by ID & media type
      combinedResults = merged.filter(
        (v, i, a) =>
          a.findIndex((t) => t.id === v.id && t.mediaType === v.mediaType) === i
      );
    }

    // Cache results for 5 minutes
    if (combinedResults.length > 0) {
      searchServerCache.set(cacheKey, combinedResults);
    }

    return NextResponse.json({ results: combinedResults });
  } catch {
    const fallbackType = rawType === "tv" ? "tv" : "movie";
    const fallbackResults = getFallbackSearchResults(query, fallbackType);
    const filteredFallbackResults = useCloseMatchFilter
      ? filterCloseMatchResults(fallbackResults, query)
      : fallbackResults;

    return NextResponse.json(
      {
        results: filteredFallbackResults,
        message:
          filteredFallbackResults.length > 0
            ? "Live search is currently limited. Showing fallback results."
            : "No items found right now.",
      },
      { status: 200 }
    );
  }
}
