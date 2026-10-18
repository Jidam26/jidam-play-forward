import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/config";

/**
 * Auto-generates /robots.txt. Everything behind a login is disallowed --
 * there's nothing there a search engine should index, and some of it
 * (admin, account, bookings) shouldn't even be hinted at publicly.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/bookings", "/games", "/plans", "/forgot-password", "/reset-password"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
