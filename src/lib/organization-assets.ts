export const ORGANIZATION_ASSETS_BUCKET = "organization-assets";
export const MAX_ORGANIZATION_ASSET_SIZE = 5 * 1024 * 1024;

export const ORGANIZATION_ASSET_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type OrganizationAssetType = "logo" | "hero";

export function getSafeBrandColor(value: string | null) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#1b1b1b";
}

export function getOrganizationAssetUrl(storagePath: string) {
  if (storagePath.startsWith("public/")) {
    return `/${storagePath.slice("public/".length)}`;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required to load organization assets.");
  }

  const encodedPath = storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return new URL(
    `/storage/v1/object/public/${ORGANIZATION_ASSETS_BUCKET}/${encodedPath}`,
    supabaseUrl,
  ).toString();
}

export function getBrandForeground(hexColor: string | null) {
  const safeColor = getSafeBrandColor(hexColor);

  const red = Number.parseInt(safeColor.slice(1, 3), 16);
  const green = Number.parseInt(safeColor.slice(3, 5), 16);
  const blue = Number.parseInt(safeColor.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 150 ? "#171717" : "#ffffff";
}
