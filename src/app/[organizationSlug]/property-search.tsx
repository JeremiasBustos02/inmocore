"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { publicPropertyTypeOptions } from "./public-property-options";

type PropertySearchProps = {
  cities: string[];
  hasHeroImage: boolean;
  publicBasePath: string;
  suggestions: Array<{ label: string; params: Record<string, string> }>;
};

const fieldClassName =
  "!h-12 w-full min-w-0 rounded-lg border-border bg-card px-3.5 text-sm font-normal text-foreground outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20";

// Currency-aware price ranges belong to the complete catalog filters in M4B.
const priceRanges = [
  { label: "Hasta 50.000", value: "50000" },
  { label: "Hasta 100.000", value: "100000" },
  { label: "Hasta 150.000", value: "150000" },
  { label: "Hasta 250.000", value: "250000" },
  { label: "Más de 250.000", value: "over-250000" },
];

export function PropertySearch({ cities, hasHeroImage, publicBasePath, suggestions }: PropertySearchProps) {
  return (
    <form
      action={`${publicBasePath}/properties`}
      autoComplete="off"
      className="public-hero-enter public-hero-enter-3 mx-auto w-full max-w-[780px] min-w-0"
      method="get"
    >
      <fieldset>
        <legend className="sr-only">Operación</legend>
        <div className="flex w-fit items-end">
          <label className="cursor-pointer">
            <input
              className="peer sr-only"
              defaultChecked
              name="operation"
              type="radio"
              value="sale"
            />
              <span className="flex h-10 items-center rounded-t-lg bg-black/55 px-5 text-sm font-semibold text-white transition-colors hover:bg-black/65 peer-checked:bg-card peer-checked:text-brand-accent peer-checked:hover:bg-card peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[-3px]">
              Comprar
            </span>
          </label>
          <label className="cursor-pointer">
            <input
              className="peer sr-only"
              name="operation"
              type="radio"
              value="rent"
            />
              <span className="flex h-10 items-center rounded-t-lg bg-black/55 px-5 text-sm font-semibold text-white transition-colors hover:bg-black/65 peer-checked:bg-card peer-checked:text-brand-accent peer-checked:hover:bg-card peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[-3px]">
              Alquilar
            </span>
          </label>
        </div>
      </fieldset>

      <div className="grid min-w-0 gap-2 rounded-b-lg rounded-tr-lg bg-card p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:grid-cols-2 sm:p-4 lg:grid-cols-[1.15fr_1.2fr_1.1fr_170px] lg:items-center">
        <label className="min-w-0">
          <span className="sr-only">Tipo de propiedad</span>
          <Select
            defaultValue=""
            items={[{ value: "", label: "Todos los tipos" }, ...publicPropertyTypeOptions]}
            name="type"
          >
            <SelectTrigger className={fieldClassName}>
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              side="bottom"
              sideOffset={6}
            >
              <SelectGroup>
                <SelectItem value="">Todos los tipos</SelectItem>
                {publicPropertyTypeOptions.map((propertyType) => (
                  <SelectItem key={propertyType.value} value={propertyType.value}>
                    {propertyType.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </label>

        <label className="min-w-0">
          <span className="sr-only">Localidad</span>
          <Select
            defaultValue=""
            items={[
              { value: "", label: "Todas las localidades" },
              ...cities.map((city) => ({ value: city, label: city })),
            ]}
            name="city"
          >
            <SelectTrigger className={fieldClassName}>
              <SelectValue placeholder="Todas las localidades" />
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              side="bottom"
              sideOffset={6}
            >
              <SelectGroup>
                <SelectItem value="">Todas las localidades</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </label>

        <label className="min-w-0">
          <span className="sr-only">Precio</span>
          <Select
            defaultValue=""
            items={[{ value: "", label: "Sin límite de precio" }, ...priceRanges]}
            name="price"
          >
            <SelectTrigger className={fieldClassName}>
              <SelectValue placeholder="Sin límite de precio" />
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              side="bottom"
              sideOffset={6}
            >
              <SelectGroup>
                <SelectItem value="">Sin límite de precio</SelectItem>
                {priceRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </label>

        <button
          className="public-button flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-primary/90 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 sm:col-span-2 lg:col-span-1"
          type="submit"
        >
          <Search aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
          Buscar
        </button>
      </div>
      {suggestions.length > 0 ? (
        <nav aria-label="Búsquedas sugeridas" className="public-hero-enter public-hero-enter-4 mt-5 flex flex-wrap justify-center gap-2">
          {suggestions.map((suggestion) => {
            const searchParams = new URLSearchParams(suggestion.params);
            return (
              <Link
                className={hasHeroImage
                  ? "cursor-pointer rounded-full border border-white/45 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-white/70 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  : "cursor-pointer rounded-full border border-border bg-background/80 px-3.5 py-1.5 text-xs font-medium text-foreground transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"}
                href={`${publicBasePath}/properties?${searchParams.toString()}`}
                key={`${suggestion.label}-${searchParams.toString()}`}
              >
                {suggestion.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </form>
  );
}
