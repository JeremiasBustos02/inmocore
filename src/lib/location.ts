export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type PublicPropertyLocation =
  | (Coordinates & { kind: "exact" })
  | (Coordinates & { kind: "approximate"; radiusMeters: 750 });

export function getGoogleMapsSearchUrl({ latitude, longitude }: Coordinates) {
  const query = new URLSearchParams({ query: `${latitude},${longitude}` });
  return `https://www.google.com/maps/search/?api=1&${query.toString()}`;
}

export const DEFAULT_MAP_CENTER: Coordinates = {
  latitude: -38.4,
  longitude: -63.6,
};

export function parseCoordinates(
  latitudeValue: FormDataEntryValue | null,
  longitudeValue: FormDataEntryValue | null,
): Coordinates | null | undefined {
  const latitudeText = typeof latitudeValue === "string" ? latitudeValue.trim() : "";
  const longitudeText = typeof longitudeValue === "string" ? longitudeValue.trim() : "";

  if (!latitudeText && !longitudeText) return null;
  if (!latitudeText || !longitudeText) return undefined;

  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return undefined;
  }

  return { latitude, longitude };
}

export function getPublicPropertyLocation(
  latitude: number | null,
  longitude: number | null,
  visibility: "exact" | "approximate" | "hidden",
): PublicPropertyLocation | null {
  if (visibility === "hidden" || latitude === null || longitude === null) {
    return null;
  }

  if (visibility === "approximate") {
    return {
      kind: "approximate",
      latitude: Number(latitude.toFixed(2)),
      longitude: Number(longitude.toFixed(2)),
      radiusMeters: 750,
    };
  }

  return { kind: "exact", latitude, longitude };
}

export function getPublicPropertyAddress(
  address: string | null,
  visibility: "exact" | "approximate" | "hidden",
) {
  return visibility === "exact" ? address : null;
}

export function getPublicPropertyLocationLabel({
  address,
  city,
  province,
  visibility,
}: {
  address: string | null;
  city: string;
  province: string;
  visibility: "exact" | "approximate" | "hidden";
}) {
  const publicAddress = getPublicPropertyAddress(address, visibility);
  const generalLocation = [city, province].filter(Boolean).join(", ");

  return publicAddress
    ? [publicAddress, city].filter(Boolean).join(", ")
    : visibility === "hidden"
      ? city
      : generalLocation;
}
