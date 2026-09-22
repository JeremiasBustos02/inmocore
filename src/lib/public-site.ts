export const CUSTOM_DOMAIN_ROUTE_PREFIX = "__domain--";
export const CUSTOM_DOMAIN_HEADER = "x-inmocore-custom-domain";

export function getPublicSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return new URL(url.toString().replace(/\/$/, ""));
  } catch {
    return null;
  }
}

export function getPublicSitePath(path: string) {
  const baseUrl = getPublicSiteUrl();
  return baseUrl ? new URL(path, baseUrl).toString() : path;
}

export function normalizeCustomDomain(value: string | null | undefined) {
  const domain = value?.trim().toLowerCase().replace(/\.$/, "") ?? "";
  if (!domain) return null;
  if (
    domain.length > 253 ||
    domain.includes(":") ||
    domain.includes("/") ||
    domain.includes("@") ||
    domain.includes("?") ||
    domain.includes("#")
  ) {
    return null;
  }

  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    return null;
  }

  return domain;
}

export function isCustomDomainRoute(value: string) {
  return value.startsWith(CUSTOM_DOMAIN_ROUTE_PREFIX);
}

export function getCustomDomainFromRoute(value: string) {
  if (!isCustomDomainRoute(value)) return null;
  return normalizeCustomDomain(value.slice(CUSTOM_DOMAIN_ROUTE_PREFIX.length));
}

export function getPublicBasePath(routeTenant: string, organizationSlug: string) {
  return isCustomDomainRoute(routeTenant)
    ? ""
    : `/${encodeURIComponent(organizationSlug)}`;
}

export function getPublicPath(basePath: string, path = "") {
  if (!path) return basePath || "/";
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getOrganizationPublicUrl(
  organization: { customDomain: string | null; slug: string },
  path = "",
) {
  const pathname = path ? (path.startsWith("/") ? path : `/${path}`) : "/";
  if (organization.customDomain) {
    return new URL(pathname, `https://${organization.customDomain}`).toString();
  }

  const siteUrl = getPublicSiteUrl();
  if (!siteUrl) return null;
  return new URL(
    getPublicPath(`/${encodeURIComponent(organization.slug)}`, pathname === "/" ? "" : pathname),
    siteUrl,
  ).toString();
}
