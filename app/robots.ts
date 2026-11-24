import type { MetadataRoute } from "next";

const SITE_URL = (process.env.SITE_URL || "https://desimovies.ghoshivaibhav12.workers.dev").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
