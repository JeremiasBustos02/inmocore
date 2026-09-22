"use client";

import type { PublicPropertyLocation } from "@/lib/location";
import { MapCanvas } from "./map-canvas";

type PublicMapProps = {
  className: string;
  location: PublicPropertyLocation;
  markerColor?: string | null;
};

export function PublicMap({ className, location, markerColor }: PublicMapProps) {
  return (
    <MapCanvas
      center={location}
      className={className}
      coordinates={location}
      label={location.kind === "approximate" ? "Mapa de ubicación aproximada" : "Mapa de ubicación"}
      markerColor={markerColor}
      mode={location.kind}
      radiusMeters={location.kind === "approximate" ? location.radiusMeters : undefined}
      zoom={location.kind === "approximate" ? 13 : 16}
    />
  );
}
