import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/config";

/**
 * Auto-generates /sitemap.xml. Only the real public-facing pages belong here
 * -- everything behind a login (games, bookings, admin, account, etc.) is
 * useless to a search crawler and shouldn't be listed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
