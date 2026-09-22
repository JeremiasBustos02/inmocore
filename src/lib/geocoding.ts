import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { Coordinates } from "@/lib/location";

type AddressQuery = { address?: string; city?: string; province?: string; country?: string };
type SearchContext = Coordinates | null | undefined;

type GeocodingCandidate = {
  coordinates: Coordinates;
  displayName: string;
  address: { road?: string; houseNumber?: string; city?: string; province?: string; country?: string };
  hasHouseNumber: boolean;
};

type GeocodingResult =
  | { ok: true; candidates: GeocodingCandidate[]; houseNumberNotFound: boolean }
  | { ok: false; reason: "not-found" | "unavailable" };

type NominatimResult = {
  lat?: unknown;
  lon?: unknown;
  display_name?: unknown;
  address?: unknown;
};

const DEFAULT_NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const MAX_RESULTS = 5;
const COUNTRY_CODES: Record<string, string> = {
  argentina: "ar", uruguay: "uy", chile: "cl", bolivia: "bo", brasil: "br", brazil: "br",
  paraguay: "py", peru: "pe", colombia: "co", ecuador: "ec", mexico: "mx", méxico: "mx",
  "united states": "us", "estados unidos": "us", canada: "ca", canadá: "ca", españa: "es", spain: "es",
  portugal: "pt", france: "fr", francia: "fr", italy: "it", italia: "it", germany: "de", alemania: "de",
  "united kingdom": "gb", "reino unido": "gb", australia: "au", japan: "jp", japón: "jp",
};

function normalize(value: string | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function countryCode(country?: string) {
  if (!country) return undefined;
  const normalized = normalize(country);
  if (/^[a-z]{2}$/.test(normalized)) return normalized;
  return COUNTRY_CODES[normalized];
}

function viewboxFor(center?: SearchContext) {
  if (!center) return undefined;
  // Roughly a 50 km radius around the organization's office; unbounded, so it only boosts ranking.
  const longitudeRadius = 0.5;
  const latitudeRadius = 0.35;
  return [center.longitude - longitudeRadius, center.latitude + latitudeRadius, center.longitude + longitudeRadius, center.latitude - latitudeRadius].join(",");
}

function splitStreet(address?: string) {
  const normalized = (address ?? "").trim().replace(/\s+/g, " ");
  const match = normalized.match(/^(.*?)(?:\s+|,\s*)(\d+[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)\s*$/);
  return match ? { street: match[1].trim(), houseNumber: match[2] } : { street: normalized, houseNumber: undefined };
}

function manualParts(query: string): AddressQuery {
  const match = query.match(/^(.*)\s+(\d+[a-zA-Z]?(?:[-/]\d+[a-zA-Z]?)?)\s+([^,]+)$/i);
  return match ? { address: `${match[1]} ${match[2]}`, city: match[3] } : { address: query };
}

function readCandidates(results: unknown): GeocodingCandidate[] {
  if (!Array.isArray(results)) return [];
  return results.flatMap((entry: NominatimResult): GeocodingCandidate[] => {
    if (!entry || typeof entry !== "object" || !entry.address || typeof entry.address !== "object") return [];
    const latitude = Number(entry.lat);
    const longitude = Number(entry.lon);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return [];
    const details = entry.address as Record<string, unknown>;
    const text = (...keys: string[]) => keys.map((key) => details[key]).find((value): value is string => typeof value === "string");
    const houseNumber = text("house_number");
    return [{
      coordinates: { latitude, longitude },
      displayName: typeof entry.display_name === "string" ? entry.display_name : "Ubicación encontrada",
      address: {
        road: text("road", "pedestrian", "residential", "footway"),
        houseNumber,
        city: text("city", "town", "village", "municipality", "hamlet", "suburb"),
        province: text("state", "province", "state_district", "region"),
        country: text("country"),
      },
      hasHouseNumber: Boolean(houseNumber),
    }];
  });
}

function rankCandidates(candidates: GeocodingCandidate[], query: AddressQuery, center: SearchContext, freeQuery: string) {
  const requestedStreet = splitStreet(query.address).street;
  const requestedNumber = splitStreet(query.address).houseNumber;
  const qCity = normalize(query.city);
  const qProvince = normalize(query.province);
  const qCountry = normalize(query.country);
  const qStreet = normalize(requestedStreet || splitStreet(manualParts(freeQuery).address).street || freeQuery);

  const ranked = candidates.flatMap((candidate) => {
    const road = normalize(candidate.address.road);
    const city = normalize(candidate.address.city);
    const province = normalize(candidate.address.province);
    const country = normalize(candidate.address.country);
    const candidateText = normalize(candidate.displayName);
    let score = 0;

    if (qCountry && country) {
      if (country !== qCountry && !candidateText.includes(qCountry)) return [];
      score += 40;
    }
    if (qProvince && province) {
      if (province !== qProvince && !candidateText.includes(qProvince)) return [];
      score += 35;
    }
    if (qCity && city) {
      if (city !== qCity && !candidateText.includes(qCity)) return [];
      score += 40;
    }
    if (qStreet) {
      if (!road) {
        score -= 20;
      } else if (road === qStreet) {
        score += 35;
      } else if (road.includes(qStreet) || qStreet.includes(road)) {
        score += 18;
      } else if (candidateText.includes(qStreet)) {
        score += 8;
      } else {
        return [];
      }
    }
    if (requestedNumber) {
      if (candidate.address.houseNumber === requestedNumber) score += 60;
      else if (!candidate.address.houseNumber) score -= 15;
      else score -= 40;
    }
    if (center) {
      const distance = Math.hypot((candidate.coordinates.latitude - center.latitude) * 111, (candidate.coordinates.longitude - center.longitude) * 80);
      score -= Math.min(distance / 10, 25);
    }
    return [{ candidate, score }];
  });

  ranked.sort((a, b) => b.score - a.score);
  return { candidates: ranked.slice(0, MAX_RESULTS).map(({ candidate }) => candidate), requestedNumber };
}

async function searchNominatim(params: URLSearchParams) {
  const url = new URL("/search", process.env.NOMINATIM_BASE_URL?.trim() || DEFAULT_NOMINATIM_URL);
  for (const [key, value] of params) url.searchParams.set(key, value);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(MAX_RESULTS));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("layer", "address");

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(49362, 1)`);
    await tx.execute(sql`select pg_sleep(1)`);
  });

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "InmoCore/0.1 (admin address search)",
      ...(process.env.NEXT_PUBLIC_SITE_URL ? { Referer: process.env.NEXT_PUBLIC_SITE_URL } : {}),
    },
    next: { revalidate: 2_592_000 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Nominatim request failed");
  return readCandidates(await response.json());
}

export async function geocodeAddress(query: string | AddressQuery, organizationCoordinates?: SearchContext): Promise<GeocodingResult> {
  const structured = typeof query !== "string";
  const freeQuery = structured
    ? [query.address, query.city, query.province, query.country].filter(Boolean).join(", ").trim().replace(/\s+/g, " ").slice(0, 300)
    : query.trim().replace(/\s+/g, " ").slice(0, 300);
  if (freeQuery.length < 3) return { ok: false, reason: "not-found" };

  const context: AddressQuery = structured ? query : manualParts(freeQuery);
  const { street } = splitStreet(context.address);
  const code = countryCode(context.country);
  const viewbox = viewboxFor(organizationCoordinates);
  const commonFilters = new URLSearchParams({ layer: "address" });
  if (code) commonFilters.set("countrycodes", code);
  if (viewbox) commonFilters.set("viewbox", viewbox);

  const strategies: { name: string; params: URLSearchParams }[] = [];
  if (structured && street && context.city && context.province && context.country) {
    const complete = new URLSearchParams(commonFilters);
    complete.set("street", context.address!.trim().replace(/\s+/g, " "));
    complete.set("city", context.city);
    complete.set("state", context.province);
    complete.set("country", context.country);
    strategies.push({ name: "structured-complete", params: complete });
  }
  if (structured && street && context.city && context.province) {
    const partial = new URLSearchParams(commonFilters);
    partial.set("street", context.address!.trim().replace(/\s+/g, " "));
    partial.set("city", context.city);
    partial.set("state", context.province);
    strategies.push({ name: "structured-without-country", params: partial });
  }
  const free = new URLSearchParams(commonFilters);
  free.set("q", freeQuery);
  strategies.push({ name: structured ? "free-fallback" : "manual-free", params: free });

  try {
    for (let index = 0; index < strategies.length; index += 1) {
      const strategy = strategies[index];
      const rawCandidates = await searchNominatim(strategy.params);
      const ranked = rankCandidates(rawCandidates, context, organizationCoordinates, freeQuery);
      console.info("[geocoding]", { strategy: strategy.name, resultCount: rawCandidates.length, retainedCount: ranked.candidates.length, fallbackReason: index > 0 ? "previous strategy had no compatible candidates" : null });
      if (ranked.candidates.length) {
        const houseNumberNotFound = Boolean(ranked.requestedNumber && !ranked.candidates.some((candidate) => candidate.address.houseNumber === ranked.requestedNumber));
        return { ok: true, candidates: ranked.candidates, houseNumberNotFound };
      }
    }
    return { ok: false, reason: "not-found" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
