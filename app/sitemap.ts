import type { MetadataRoute } from "next";
import snapshot from "@/lib/anime-snapshot.json";

// Public-facing host. Override with SITE_URL if the site moves to a custom domain.
const SITE_URL = (process.env.SITE_URL || "https://desimovies.vercel.app").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/help`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/legal/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/legal/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/legal/dmca`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Anime detail pages are real, server-rendered pages (one per AniList id
  // in the build-time catalogue) — safe to hand to search engines.
  const animePages: MetadataRoute.Sitemap = Array.isArray(snapshot.byId)
    ? (snapshot.byId as Array<{ id: number }>)
        .filter((media) => Number.isFinite(media?.id) && media.id > 0)
        .map((media) => ({
          url: `${SITE_URL}/title/anime/${media.id}`,
          lastModified,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        }))
    : [];

  return [...staticPages, ...animePages];
}
