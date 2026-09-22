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
    if (!organization) return [];

    const propertyPaths = await getPublicPropertyPaths(organization.id);
    return [
      { url: getOrganizationPublicUrl(organization) as string },
      { url: getOrganizationPublicUrl(organization, "/properties") as string },
      ...propertyPaths.map((property) => ({
        url: getOrganizationPublicUrl(
          organization,
          `/properties/${property.propertyId}`,
        ) as string,
      })),
    ];
  }

  const [organizations, propertyPaths] = await Promise.all([
    getPublicOrganizations(),
    getPublicPropertyPaths(),
  ]);

  const urls: MetadataRoute.Sitemap = [];
  for (const organization of organizations.filter(({ customDomain }) => !customDomain)) {
    const homeUrl = getOrganizationPublicUrl(organization);
    const catalogUrl = getOrganizationPublicUrl(organization, "/properties");
    if (!homeUrl || !catalogUrl) continue;
    urls.push(
      { url: homeUrl },
      { url: catalogUrl },
    );
  }

  for (const property of propertyPaths.filter(
    ({ organizationCustomDomain }) => !organizationCustomDomain,
  )) {
    const organization = {
      slug: property.organizationSlug,
      customDomain: property.organizationCustomDomain,
    };
    const url = getOrganizationPublicUrl(
      organization,
      `/properties/${property.propertyId}`,
    );
    if (!url) continue;
    urls.push({
      url,
    });
  }

  return urls;
}
