"use client";

import { Search } from "lucide-react";
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
  organizationSlug: string;
};

const fieldClassName =
  "!h-[52px] w-full min-w-0 rounded-[10px] border border-[#e5e5e5] bg-card px-4 text-[15px] font-normal text-foreground outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20";

// Currency-aware price ranges belong to the complete catalog filters in M4B.
const priceRanges = [
  { label: "Hasta 50.000", value: "50000" },
  { label: "Hasta 100.000", value: "100000" },
  { label: "Hasta 150.000", value: "150000" },
  { label: "Hasta 250.000", value: "250000" },
  { label: "Más de 250.000", value: "over-250000" },
];

export function PropertySearch({ cities, organizationSlug }: PropertySearchProps) {
  return (
    <form
      action={`/${encodeURIComponent(organizationSlug)}/properties`}
      autoComplete="off"
      className="mx-auto w-full min-w-0 lg:w-[90%]"
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
            <span className="flex h-11 items-center rounded-t-[10px] bg-black/55 px-6 text-sm font-semibold text-white transition-colors hover:bg-black/65 peer-checked:bg-card peer-checked:text-brand-accent peer-checked:hover:bg-card peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[-3px]">
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
            <span className="flex h-11 items-center rounded-t-[10px] bg-black/55 px-6 text-sm font-semibold text-white transition-colors hover:bg-black/65 peer-checked:bg-card peer-checked:text-brand-accent peer-checked:hover:bg-card peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[-3px]">
              Alquilar
            </span>
          </label>
        </div>
      </fieldset>

      <div className="grid min-w-0 gap-3 rounded-b-xl rounded-tr-xl bg-card p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:grid-cols-2 sm:p-5 lg:grid-cols-[1.15fr_1.2fr_1.1fr_190px] lg:items-center">
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
          className="public-button flex h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 sm:col-span-2 lg:col-span-1"
          type="submit"
        >
          <Search aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
          Buscar
        </button>
      </div>
    </form>
  );
}
