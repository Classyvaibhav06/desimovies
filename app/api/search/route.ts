import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getFallbackSearchResults,
  getMediaByTmdbIds,
  searchMediaByTitle,
} from "@/lib/tmdb";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL?.trim() || "openai/gpt-oss-120b";

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

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

function filterCloseMatchResults<T extends { title: string }>(results: T[], query: string): T[] {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return results;
  }

  return results.filter((result) => {
    const normalizedTitle = normalizeText(result.title);

    if (!normalizedTitle) {
      return false;
    }

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

    if (hasTokenPrefix) {
      return true;
    }

    const distance = levenshteinDistance(normalizedQuery, normalizedTitle);
    const maxLen = Math.max(normalizedQuery.length, normalizedTitle.length);
    const ratio = maxLen > 0 ? distance / maxLen : 1;
    return ratio <= 0.42;
  });
}

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
          "You map user title queries to TMDB IDs. Return strict JSON only with this shape: {\"tmdb_ids\":[number,...]}. Return up to 5 best IDs. No markdown.",
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const rawType = searchParams.get("type");
  const lang = searchParams.get("lang") ?? "en-US";
  const mediaType = rawType === "tv" ? "tv" : "movie";
  const useCloseMatchFilter =
    searchParams.get("closeMatch") === "1" || searchParams.get("startsWith") === "1";

  const isTmdbId = /^\d+$/.test(query);

  if (!isTmdbId && query.length < 2) {
    return NextResponse.json({ results: [], message: "Type at least 2 characters." });
  }

  try {
    if (isTmdbId) {
      const idResults = await getMediaByTmdbIds([Number(query)], mediaType);
      if (idResults.length > 0) {
        return NextResponse.json({ results: idResults });
      }
    }

    const shouldUseAiIdLookup = !useCloseMatchFilter;
    let results = await searchMediaByTitle(query, mediaType, lang);

    if (shouldUseAiIdLookup) {
      try {
        const aiIds = await resolveTmdbIdsWithAi(query, mediaType);

        if (aiIds.length > 0) {
          const aiResolvedResults = await getMediaByTmdbIds(aiIds, mediaType);

          if (aiResolvedResults.length > 0) {
            results = aiResolvedResults;
          }
        }
      } catch {
        // Fall back silently to standard TMDB text search when AI resolution fails.
      }
    }

    const filteredResults = useCloseMatchFilter
      ? filterCloseMatchResults(results, query)
      : results;
    return NextResponse.json({ results: filteredResults });
  } catch {
    const fallbackResults = getFallbackSearchResults(query, mediaType);
    const filteredFallbackResults = useCloseMatchFilter
      ? filterCloseMatchResults(fallbackResults, query)
      : fallbackResults;

    return NextResponse.json(
      {
        results: filteredFallbackResults,
        message:
          filteredFallbackResults.length > 0
            ? "Live TMDB search is unavailable. Showing fallback results."
            : useCloseMatchFilter
              ? "No close matches found right now."
              : mediaType === "tv"
                ? "No web series found for that name right now."
                : "No movies found for that name right now."
      },
      { status: 200 }
    );
  }
}
