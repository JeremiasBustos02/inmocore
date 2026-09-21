import type { MetadataRoute } from "next";
import { getPublicSitePath, getPublicSiteUrl } from "@/lib/public-site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPublicSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/login"],
    },
    ...(siteUrl ? { sitemap: getPublicSitePath("/sitemap.xml") } : {}),
  };
}
