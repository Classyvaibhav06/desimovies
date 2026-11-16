/**
 * Build-time anime catalogue snapshot.
 *
 * AniList blocks Cloudflare Workers egress IPs (HTTP 403 for both its
 * GraphQL API and s4.anilist.co CDN), so nothing from AniList can be
 * fetched at request time on a Worker. Instead, this script runs before
 * `next build` on any machine that can reach AniList:
 *
 *   1. Downloads the popular and trending lists (top 40 each).
 *   2. Downloads every poster and banner image into public/anime/.
 *   3. Rewrites the snapshot paths to /anime/<id>-poster.jpg etc.
 *
 * The Worker then serves the whole anime section from static assets with
 * zero calls to AniList at runtime.
 *
 * If the network is unreachable, the previous snapshot and images are
 * kept — the build never fails on an AniList hiccup.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(root, "..", "lib", "anime-snapshot.json");
const IMAGES_DIR = join(root, "..", "public", "anime");

const ANILIST_API = "https://graphql.anilist.co";
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

function extensionFromUrl(url) {
  const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  if (m) {
    const ext = m[1].toLowerCase();
    return ext === "jpeg" ? "jpg" : ext;
  }
  return null;
}

async function downloadImage(url, destBase) {
  if (!url) return null;
  const ext = extensionFromUrl(url) ?? "jpg";
  const dest = `${destBase}.${ext}`;
  if (existsSync(dest)) {
    try {
      const stat = statSync(dest);
      if (stat.size > 0) return `/anime/${destBase.split(/[\\/]/).pop()}.${ext}`.replace(/\\/g, "/");
    } catch {
      /* redownload */
    }
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    return `/anime/${destBase.split(/[\\/]/).pop()}.${ext}`.replace(/\\/g, "/");
  } catch (error) {
    console.warn(`[anime-snapshot] image download failed ${url}: ${error?.message ?? error}`);
    return null;
  }
}

async function main() {
  const existing = existsSync(SNAPSHOT_PATH)
    ? JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"))
    : { popular: [], trending: [], byId: [], byIdMap: {}, fetchedAt: 0 };

  try {
    const [popular, trending] = await Promise.all([
      fetchPage("POPULARITY_DESC", 40),
      fetchPage("TRENDING_DESC", 40),
    ]);
    if (popular.length === 0 && trending.length === 0) {
      throw new Error("AniList returned no media");
    }

    mkdirSync(IMAGES_DIR, { recursive: true });

    // Download images first so a failed download keeps the old snapshot if
    // it still references valid local files.
    const all = [...popular, ...trending];
    const unique = [...new Map(all.map((m) => [m.id, m])).values()];
    console.log(`[anime-snapshot] downloading ${unique.length} titles' posters/banners...`);

    const posterResults = new Map();
    const bannerResults = new Map();
    // 8-way concurrency to stay under AniList's rate limits
    let index = 0;
    async function worker() {
      while (index < unique.length) {
        const media = unique[index++];
        const base = join(IMAGES_DIR, String(media.id));
        const poster = await downloadImage(media.coverImage?.large ?? media.coverImage?.extraLarge, `${base}-poster`);
        const banner = await downloadImage(media.bannerImage, `${base}-banner`);
        posterResults.set(media.id, poster);
        bannerResults.set(media.id, banner);
      }
    }
    await Promise.all(Array.from({ length: 8 }, () => worker()));

    // Rewrite snapshot image paths to local files.
    const rewrite = (media) => {
      const poster = posterResults.get(media.id);
      const banner = bannerResults.get(media.id);
      return {
        ...media,
        coverImage: poster
          ? { ...media.coverImage, large: poster, extraLarge: poster }
          : media.coverImage,
        bannerImage: banner ?? media.bannerImage,
      };
    };
    const popularOut = popular.map(rewrite);
    const trendingOut = trending.map(rewrite);
    const byId = [...new Map(popular.concat(trending).map((m) => [m.id, rewrite(m)])).values()];
    const byIdMap = Object.fromEntries(byId.map((media) => [String(media.id), media]));

    // Remove stale images that are no longer referenced.
    const keep = new Set(byId.map((m) => m.id));
    for (const file of readdirSync(IMAGES_DIR)) {
      const m = file.match(/^(\d+)-/);
      if (m && !keep.has(Number(m[1]))) rmSync(join(IMAGES_DIR, file), { force: true });
    }

    writeFileSync(
      SNAPSHOT_PATH,
      JSON.stringify({ popular: popularOut, trending: trendingOut, byId, byIdMap, fetchedAt: Date.now() }),
    );

    const localCount = Object.values(byIdMap).filter((m) =>
      (m.coverImage?.large ?? "").startsWith("/anime/"),
    ).length;
    const files = readdirSync(IMAGES_DIR).filter((f) => f.endsWith(".jpg") || f.endsWith(".png") || f.endsWith(".webp"));
    console.log(`[anime-snapshot] ok — popular=${popularOut.length} trending=${trendingOut.length} ids=${byId.length} images=${files.length} (local posters ${localCount})`);
  } catch (error) {
    if (existing.popular.length === 0 && existing.trending.length === 0) {
      console.error("[anime-snapshot] fetch failed with no existing snapshot:", error);
      writeFileSync(SNAPSHOT_PATH, JSON.stringify({ popular: [], trending: [], byId: [], byIdMap: {}, fetchedAt: 0 }));
      return;
    }
    console.warn("[anime-snapshot] fetch failed — keeping existing snapshot:", error?.message ?? error);
  }
}

main();
