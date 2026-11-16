/**
 * Build-time anime catalogue snapshot.
 *
 * AniList blocks Cloudflare Workers egress IPs (403 "manually blocked"),
 * so the production edge cannot call the AniList GraphQL API at request
 * time. Instead, `npm run build` runs this script on any machine that can
 * reach AniList and bundles the result into the app. At runtime every
 * catalogue/detail/search lookup is served from the snapshot — no network
 * calls at all.
 *
 * If the fetch fails (network down, AniList rate-limiting), the existing
 * snapshot is kept — the build never fails on an AniList hiccup.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(root, "..", "lib", "anime-snapshot.json");
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

const ANILIST_API = "https://graphql.anilist.co";

async function fetchPage(sort, perPage) {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query: `query ($perPage: Int) {
        Page(perPage: $perPage) {
          media(sort: ${sort}, type: ANIME, isAdult: false) { ${MEDIA_FIELDS} }
        }
      }`,
      variables: { perPage },
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = await res.json();
  if (json?.errors) throw new Error(`AniList errors: ${JSON.stringify(json.errors)}`);
  return json?.data?.Page?.media ?? [];
}

async function main() {
  let snapshot = { popular: [], trending: [], fetchedAt: 0 };
  if (existsSync(SNAPSHOT_PATH)) {
    try {
      snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
    } catch {
      /* regenerate if unreadable */
    }
  }

  try {
    const [popular, trending] = await Promise.all([
      fetchPage("POPULARITY_DESC", 40),
      fetchPage("TRENDING_DESC", 40),
    ]);
    if (popular.length === 0 && trending.length === 0) {
      throw new Error("AniList returned no media");
    }

    const byId = {};
    for (const media of [...popular, ...trending]) byId[media.id] = media;

    const snapshot = {
      popular,
      trending,
      byId: Object.values(byId),
      byIdMap: byId,
      fetchedAt: Date.now(),
    };

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot));
    console.log(`[anime-snapshot] ok — popular=${popular.length} trending=${trending.length} ids=${Object.keys(byId).length}`);
  } catch (error) {
    if (snapshot.popular.length === 0 && snapshot.trending.length === 0) {
      console.error("[anime-snapshot] fetch failed with no existing snapshot:", error);
      // Keep an empty-but-valid snapshot so TS imports compile.
      writeFileSync(SNAPSHOT_PATH, JSON.stringify({ popular: [], trending: [], byId: [], byIdMap: {}, fetchedAt: 0 }));
      return;
    }
    console.warn("[anime-snapshot] fetch failed — keeping existing snapshot:", error?.message ?? error);
  }
}

main();
