"use client";

import { Search, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { Coordinates } from "@/lib/location";
import { DEFAULT_MAP_CENTER } from "@/lib/location";
import { MapCanvas } from "./map-canvas";

type AddressQuery = { address?: string; city?: string; province?: string; country?: string };
type Candidate = { coordinates: Coordinates; displayName: string; address: AddressQuery & { road?: string; houseNumber?: string }; hasHouseNumber: boolean };
type GeocodeAction = (query: string | AddressQuery) => Promise<{ ok: true; candidates: Candidate[]; houseNumberNotFound: boolean } | { ok: false; reason: "not-found" | "unavailable" }>;

type LocationPickerProps = {
  addressFieldNames: string[];
  fallbackCoordinates?: Coordinates | null;
  geocodeAction: GeocodeAction;
  initialCoordinates?: Coordinates | null;
  markerColor?: string | null;
};

export function LocationPicker({ addressFieldNames, fallbackCoordinates, geocodeAction, initialCoordinates = null, markerColor }: LocationPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(initialCoordinates);
  const [manualQuery, setManualQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [houseNumberNotFound, setHouseNumberNotFound] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [structuredSearchError, setStructuredSearchError] = useState<string | null>(null);
  const [manualSearchError, setManualSearchError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<"structured" | "manual" | null>(null);
  const [isSearching, startSearching] = useTransition();
  const center = coordinates ?? fallbackCoordinates ?? DEFAULT_MAP_CENTER;

  function search(query: string | AddressQuery, mode: "structured" | "manual") {
    setSearchMode(mode);
    setStructuredSearchError(null);
    setManualSearchError(null);
    setFeedback(null);
    setCandidates([]);
    setHouseNumberNotFound(false);
    startSearching(async () => {
      const result = await geocodeAction(query);
      if (!result.ok) {
        setFeedback(result.reason === "not-found" ? "No encontramos esa dirección. Probá con una búsqueda manual o ubicá el punto directamente en el mapa." : "No pudimos buscar ahora. Podés ubicar el punto directamente en el mapa.");
        return;
      }
      setCandidates(result.candidates);
      setHouseNumberNotFound(result.houseNumberNotFound);
      if (result.candidates.length === 1) selectCandidate(result.candidates[0]);
      if (result.houseNumberNotFound) setFeedback("No encontramos la altura exacta. Estos resultados corresponden a la calle o zona.");
    });
  }

  function selectCandidate(candidate: Candidate) {
    setCoordinates(candidate.coordinates);
    setFeedback(houseNumberNotFound ? "No encontramos la altura exacta. Estos resultados corresponden a la calle o zona. Podés ajustar el marcador." : candidate.hasHouseNumber ? "Ubicación seleccionada. Podés ajustar el marcador." : "Resultado aproximado sobre la calle. Podés ajustar el marcador.");
  }

  function applyAddress(candidate: Candidate) {
    const form = pickerRef.current?.closest("form");
    if (!form) return;
    const road = candidate.address.road;
    const address = road ? [road, candidate.address.houseNumber].filter(Boolean).join(" ") : candidate.address.houseNumber;
    const fields: Record<string, string | undefined> = { [addressFieldNames[0]]: address, [addressFieldNames[1] ?? "city"]: candidate.address.city, [addressFieldNames[2] ?? "province"]: candidate.address.province, [addressFieldNames[3] ?? "country"]: candidate.address.country };
    for (const [name, value] of Object.entries(fields)) {
      if (!value) continue;
      const input = form.elements.namedItem(name);
      if (input instanceof HTMLInputElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    setFeedback("Datos de dirección actualizados.");
  }

  function handleStructuredSearch() {
    const form = pickerRef.current?.closest("form");
    if (!form) return;
    const formData = new FormData(form);
    const values = Object.fromEntries(addressFieldNames.map((name) => [name, String(formData.get(name) ?? "").trim()])) as Record<string, string>;
    const address = values.address ?? values[addressFieldNames[0]] ?? "";
    if (!address) {
      setStructuredSearchError("Completá una dirección antes de buscar.");
      return;
    }
    search({ address, city: values.city ?? values[addressFieldNames[1]], province: values.province ?? values[addressFieldNames[2]], country: values.country ?? values[addressFieldNames[3]] }, "structured");
  }

  function handleManualSearch() {
    const query = manualQuery.trim();
    if (!query) {
      setManualSearchError("Ingresá una dirección o lugar para buscar.");
      return;
    }
    search(query, "manual");
  }

  return <div ref={pickerRef} className="flex flex-col gap-3">
    <input name="latitude" type="hidden" value={coordinates?.latitude ?? ""} />
    <input name="longitude" type="hidden" value={coordinates?.longitude ?? ""} />
    <Button className="w-full sm:w-fit" disabled={isSearching} onClick={handleStructuredSearch} type="button" variant="outline"><Search aria-hidden="true" data-icon="inline-start" />{isSearching && searchMode === "structured" ? "Buscando…" : "Buscar esta dirección"}</Button>
    {structuredSearchError ? <p className="text-sm text-destructive" role="alert">{structuredSearchError}</p> : null}
    <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" /></div>
    <label className="text-sm font-medium" htmlFor="manual-location-search">Buscar manualmente</label>
    <div className="flex flex-col gap-2 sm:flex-row"><input className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm" id="manual-location-search" placeholder="Calle, dirección o lugar…" value={manualQuery} onChange={(event) => { setManualQuery(event.target.value); setManualSearchError(null); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleManualSearch(); } }} /><Button className="w-full sm:w-auto" disabled={isSearching} onClick={handleManualSearch} type="button" variant="outline">{isSearching && searchMode === "manual" ? "Buscando…" : "Buscar"}</Button></div>
    {manualSearchError ? <p className="text-sm text-destructive" role="alert">{manualSearchError}</p> : null}
    {feedback ? <p className="text-sm text-muted-foreground" role="status">{feedback}</p> : null}
    {candidates.length > 0 ? <div className="flex flex-col gap-1" aria-label="Resultados de búsqueda"><p className="text-sm font-medium">{candidates.length > 1 ? "Encontramos estos resultados" : "Resultado encontrado"}</p>{candidates.map((candidate, index) => <div className={`flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between ${coordinates === candidate.coordinates ? "border-primary bg-accent" : "hover:bg-accent/50"}`} key={`${candidate.coordinates.latitude}-${candidate.coordinates.longitude}`}><button className="cursor-pointer text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => selectCandidate(candidate)} type="button">{candidate.displayName}{!candidate.hasHouseNumber ? <span className="ml-2 text-xs text-muted-foreground">Resultado aproximado sobre la calle</span> : null}</button><Button className="w-full sm:w-auto" onClick={() => applyAddress(candidate)} size="sm" type="button" variant="ghost">Usar esta dirección</Button><span className="sr-only">Resultado {index + 1}</span></div>)}</div> : null}
    {coordinates ? <Button className="w-fit" onClick={() => { setCoordinates(null); setFeedback("Ubicación quitada. La dirección escrita se mantendrá."); }} type="button" variant="ghost"><Trash2 aria-hidden="true" data-icon="inline-start" />Quitar ubicación</Button> : null}
    <MapCanvas center={center} className="h-[280px] w-full overflow-hidden rounded-lg border border-border bg-muted sm:h-[340px]" coordinates={coordinates} label="Selector de ubicación. Hacé clic en el mapa para elegir un punto." markerColor={markerColor} mode="picker" onChange={(next) => { setCoordinates(next); setFeedback(null); }} zoom={coordinates || fallbackCoordinates ? 15 : 4} />
    <p className="text-sm text-muted-foreground">Arrastrá el marcador o hacé clic en el mapa para ajustar la ubicación.</p>
  </div>;
}
