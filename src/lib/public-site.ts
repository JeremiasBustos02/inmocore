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
