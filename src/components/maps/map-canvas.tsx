"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { Coordinates } from "@/lib/location";

type MapCanvasProps = {
  center: Coordinates;
  className: string;
  coordinates: Coordinates | null;
  label: string;
  markerColor?: string | null;
  mode: "picker" | "exact" | "approximate";
  onChange?: (coordinates: Coordinates) => void;
  radiusMeters?: number;
  zoom: number;
};

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function safeMarkerColor(color: string | null | undefined) {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : "#171717";
}

export function MapCanvas({
  center,
  className,
  coordinates,
  label,
  markerColor,
  mode,
  onChange,
  radiusMeters = 750,
  zoom,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.Marker | Leaflet.Circle | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const onChangeRef = useRef(onChange);
  const initialOptionsRef = useRef({ center, mode, zoom });
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      leafletRef.current = L;
      const initialOptions = initialOptionsRef.current;
      const map = L.map(containerRef.current, {
        center: [initialOptions.center.latitude, initialOptions.center.longitude],
        scrollWheelZoom: initialOptions.mode === "picker",
        zoom: initialOptions.zoom,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: OSM_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      if (initialOptions.mode === "picker") {
        map.on("click", (event) => {
          onChangeRef.current?.({
            latitude: event.latlng.lat,
            longitude: event.latlng.lng,
          });
        });
      }

      mapRef.current = map;
      setMapReady(true);
      window.setTimeout(() => map.invalidateSize(), 0);
    }

    void initializeMap();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    if (!coordinates) {
      map.setView([center.latitude, center.longitude], zoom, { animate: false });
      return;
    }

    const latLng: Leaflet.LatLngExpression = [
      coordinates.latitude,
      coordinates.longitude,
    ];

    if (mode === "approximate") {
      layerRef.current = L.circle(latLng, {
        color: safeMarkerColor(markerColor),
        fillColor: safeMarkerColor(markerColor),
        fillOpacity: 0.18,
        opacity: 0.7,
        radius: radiusMeters,
        weight: 2,
      }).addTo(map);
    } else {
      const icon = L.divIcon({
        className: "location-marker-wrapper",
        html: `<span class="location-marker" style="--location-marker-color:${safeMarkerColor(markerColor)}"></span>`,
        iconAnchor: [14, 34],
        iconSize: [28, 36],
      });
      const marker = L.marker(latLng, {
        autoPan: true,
        draggable: mode === "picker",
        icon,
        title: mode === "picker" ? "Ubicación seleccionada" : "Ubicación",
      }).addTo(map);
      if (mode === "picker") {
        marker.on("dragend", () => {
          const position = marker.getLatLng();
          onChangeRef.current?.({
            latitude: position.lat,
            longitude: position.lng,
          });
        });
      }
      layerRef.current = marker;
    }

    map.setView(latLng, zoom, { animate: false });
    window.setTimeout(() => map.invalidateSize(), 0);
  }, [center.latitude, center.longitude, coordinates, mapReady, markerColor, mode, radiusMeters, zoom]);

  return (
    <div
      aria-label={label}
      className={className}
      ref={containerRef}
      role="region"
    />
  );
}
