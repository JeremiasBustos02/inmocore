import { permanentRedirect } from "next/navigation";
import { getPublicBasePath, getPublicPath } from "@/lib/public-site";

type LegacyPropertyPageProps = {
  params: Promise<{ organizationSlug: string; propertyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyPropertyPage({
  params,
  searchParams,
}: LegacyPropertyPageProps) {
  const [{ organizationSlug, propertyId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(rawSearchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, item);
    }
  }

  const basePath = getPublicBasePath(organizationSlug, organizationSlug);
  const destination = getPublicPath(basePath, `/propiedades/${encodeURIComponent(propertyId)}`);
  permanentRedirect(query.size > 0 ? `${destination}?${query}` : destination);
}
