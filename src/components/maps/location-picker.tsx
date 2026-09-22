"use client";

import { Search, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { Coordinates } from "@/lib/location";
import { DEFAULT_MAP_CENTER } from "@/lib/location";
import { MapCanvas } from "./map-canvas";

type GeocodeAction = (query: string) => Promise<
  | { ok: true; coordinates: Coordinates }
  | { ok: false; reason: "not-found" | "unavailable" }
>;

type LocationPickerProps = {
  addressFieldNames: string[];
  fallbackCoordinates?: Coordinates | null;
  geocodeAction: GeocodeAction;
  initialCoordinates?: Coordinates | null;
  markerColor?: string | null;
};

export function LocationPicker({
  addressFieldNames,
  fallbackCoordinates,
  geocodeAction,
  initialCoordinates = null,
  markerColor,
}: LocationPickerProps) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(initialCoordinates);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSearching, startSearching] = useTransition();
  const center = coordinates ?? fallbackCoordinates ?? DEFAULT_MAP_CENTER;

  function searchAddress(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.closest("form");
    if (!form) return;

    const formData = new FormData(form);
    const query = addressFieldNames
      .map((name) => formData.get(name))
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim())
      .join(", ");

    if (!query) {
      setFeedback("Ingresá una dirección antes de buscar.");
      return;
    }

    setFeedback(null);
    startSearching(async () => {
      const result = await geocodeAction(query);
      if (result.ok) {
        setCoordinates(result.coordinates);
        setFeedback("Ubicación encontrada. Podés ajustar el marcador antes de guardar.");
      } else if (result.reason === "not-found") {
        setFeedback("No encontramos esa dirección. Podés ubicarla manualmente en el mapa.");
      } else {
        setFeedback("No pudimos buscar la dirección en este momento. Podés ubicarla manualmente.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input name="latitude" type="hidden" value={coordinates?.latitude ?? ""} />
      <input name="longitude" type="hidden" value={coordinates?.longitude ?? ""} />
      <div className="flex flex-wrap gap-2">
        <Button disabled={isSearching} onClick={searchAddress} type="button" variant="outline">
          <Search aria-hidden="true" data-icon="inline-start" />
          {isSearching ? "Buscando…" : "Buscar en el mapa"}
        </Button>
        {coordinates ? (
          <Button
            onClick={() => {
              setCoordinates(null);
              setFeedback("Ubicación quitada. La dirección escrita se mantendrá.");
            }}
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" data-icon="inline-start" />
            Quitar ubicación
          </Button>
        ) : null}
      </div>
      {feedback ? <p className="text-sm text-muted-foreground" role="status">{feedback}</p> : null}
      <MapCanvas
        center={center}
        className="h-[280px] w-full overflow-hidden rounded-lg border border-border bg-muted sm:h-[340px]"
        coordinates={coordinates}
        label="Selector de ubicación. Hacé clic en el mapa para elegir un punto."
        markerColor={markerColor}
        mode="picker"
        onChange={(nextCoordinates) => {
          setCoordinates(nextCoordinates);
          setFeedback(null);
        }}
        zoom={coordinates || fallbackCoordinates ? 15 : 4}
      />
      <p className="text-sm text-muted-foreground">
        Arrastrá el marcador o hacé clic en el mapa para ajustar la ubicación.
      </p>
    </div>
  );
}
