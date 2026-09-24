import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import {
  getPublicOrganization,
  getPublicOrganizations,
  getPublicPropertyPaths,
} from "./[organizationSlug]/public-data";
import {
  CUSTOM_DOMAIN_HEADER,
  CUSTOM_DOMAIN_ROUTE_PREFIX,
  getOrganizationPublicUrl,
  getPublicSiteUrl,
  normalizeCustomDomain,
} from "@/lib/public-site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const customDomain = normalizeCustomDomain(
    (await headers()).get(CUSTOM_DOMAIN_HEADER),
  );

  if (customDomain) {
    const organization = await getPublicOrganization(
      `${CUSTOM_DOMAIN_ROUTE_PREFIX}${customDomain}`,
    );
    if (!organization || organization.isDemo) return [];

    const propertyPaths = await getPublicPropertyPaths(organization.id);
    return [
      {
        url: getOrganizationPublicUrl(organization) as string,
        lastModified: organization.updatedAt,
      },
      {
        url: getOrganizationPublicUrl(organization, "/propiedades") as string,
        lastModified: organization.updatedAt,
      },
      ...propertyPaths.map((property) => ({
        url: getOrganizationPublicUrl(
          organization,
          `/propiedades/${property.propertyId}`,
        ) as string,
        lastModified: property.updatedAt,
      })),
    ];
  }

  if (!getPublicSiteUrl()) return [];

  const [organizations, propertyPaths] = await Promise.all([
    getPublicOrganizations(),
    getPublicPropertyPaths(),
  ]);

  const urls: MetadataRoute.Sitemap = [];
  for (const organization of organizations.filter(
    ({ customDomain, isDemo }) => !customDomain && !isDemo,
  )) {
    const homeUrl = getOrganizationPublicUrl(organization);
    const catalogUrl = getOrganizationPublicUrl(organization, "/propiedades");
    if (!homeUrl || !catalogUrl) continue;
    urls.push(
      { url: homeUrl, lastModified: organization.updatedAt },
      { url: catalogUrl, lastModified: organization.updatedAt },
    );
  }

  for (const property of propertyPaths.filter(
    ({ organizationCustomDomain, organizationIsDemo }) =>
      !organizationCustomDomain && !organizationIsDemo,
  )) {
    const organization = {
      slug: property.organizationSlug,
      customDomain: property.organizationCustomDomain,
    };
    const url = getOrganizationPublicUrl(
      organization,
      `/propiedades/${property.propertyId}`,
    );
    if (!url) continue;
    urls.push({
      url,
      lastModified: property.updatedAt,
    });
  }

  return urls;
}
