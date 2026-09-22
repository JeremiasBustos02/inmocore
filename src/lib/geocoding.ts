import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { Coordinates } from "@/lib/location";

type GeocodingResult =
  | { ok: true; coordinates: Coordinates }
  | { ok: false; reason: "not-found" | "unavailable" };

const DEFAULT_NOMINATIM_URL = "https://nominatim.openstreetmap.org";

export async function geocodeAddress(query: string): Promise<GeocodingResult> {
  const normalizedQuery = query.trim().replace(/\s+/g, " ").slice(0, 300);
  if (normalizedQuery.length < 3) return { ok: false, reason: "not-found" };

  const baseUrl = process.env.NOMINATIM_BASE_URL?.trim() || DEFAULT_NOMINATIM_URL;
  const url = new URL("/search", baseUrl);
  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(49362, 1)`);
      await tx.execute(sql`select pg_sleep(1)`);
    });

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "InmoCore/0.1 (admin address search)",
        ...(process.env.NEXT_PUBLIC_SITE_URL
          ? { Referer: process.env.NEXT_PUBLIC_SITE_URL }
          : {}),
      },
      next: { revalidate: 2_592_000 },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return { ok: false, reason: "unavailable" } as const;

    const results: unknown = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      return { ok: false, reason: "not-found" } as const;
    }

    const result = results[0];
    if (typeof result !== "object" || result === null) {
      return { ok: false, reason: "unavailable" } as const;
    }

    const latitude = Number("lat" in result ? result.lat : Number.NaN);
    const longitude = Number("lon" in result ? result.lon : Number.NaN);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return { ok: false, reason: "unavailable" } as const;
    }

    return { ok: true, coordinates: { latitude, longitude } } as const;
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
