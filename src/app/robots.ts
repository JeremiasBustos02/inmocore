import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import {
  CUSTOM_DOMAIN_HEADER,
  CUSTOM_DOMAIN_ROUTE_PREFIX,
  getOrganizationPublicUrl,
  getPublicSitePath,
  getPublicSiteUrl,
  normalizeCustomDomain,
} from "@/lib/public-site";
import { getPublicOrganization } from "./[organizationSlug]/public-data";

const disallowedPlatformPaths = [
  "/admin",
  "/control",
  "/auth",
  "/dev",
  "/login",
  "/api",
];

const disallowedTenantPaths = ["/admin", "/control", "/auth", "/dev", "/login"];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const customDomain = normalizeCustomDomain(
    (await headers()).get(CUSTOM_DOMAIN_HEADER),
  );
  if (customDomain) {
    const organization = await getPublicOrganization(
      `${CUSTOM_DOMAIN_ROUTE_PREFIX}${customDomain}`,
    );
    if (!organization) {
      return { rules: { userAgent: "*", disallow: "/" } };
    }

    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: disallowedTenantPaths,
      },
      sitemap: getOrganizationPublicUrl(organization, "/sitemap.xml") as string,
    };
  }

  const siteUrl = getPublicSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: disallowedPlatformPaths,
    },
    ...(siteUrl ? { sitemap: getPublicSitePath("/sitemap.xml") } : {}),
  };
}
