import type { MetadataRoute } from "next";
import {
  getPublicOrganizations,
  getPublicPropertyPaths,
} from "./[organizationSlug]/public-data";
import { getPublicSiteUrl } from "@/lib/public-site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getPublicSiteUrl();
  if (!siteUrl) return [];

  const [organizations, propertyPaths] = await Promise.all([
    getPublicOrganizations(),
    getPublicPropertyPaths(),
  ]);

  const urls: MetadataRoute.Sitemap = [];
  for (const organization of organizations) {
    const organizationPath = `/${encodeURIComponent(organization.slug)}`;
    urls.push(
      { url: new URL(organizationPath, siteUrl).toString() },
      { url: new URL(`${organizationPath}/properties`, siteUrl).toString() },
    );
  }

  for (const property of propertyPaths) {
    urls.push({
      url: new URL(
        `/${encodeURIComponent(property.organizationSlug)}/properties/${property.propertyId}`,
        siteUrl,
      ).toString(),
    });
  }

  return urls;
}
