"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublicPropertyFilters } from "../public-data";
import { publicPropertyTypeOptions } from "../public-property-options";

const selectClassName =
  "!h-[52px] w-full min-w-0 rounded-lg border-border bg-card px-4 text-[15px] font-normal";
const inputClassName =
  "h-[52px] rounded-lg border-border bg-card px-4 text-[15px] font-normal";

const operationOptions = [
  { value: "sale", label: "Comprar" },
  { value: "rent", label: "Alquilar" },
] as const;

const quantityOptions = [1, 2, 3, 4, 5];

type FilterSelectProps = {
  defaultValue?: string;
  label: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder: string;
};

function FilterSelect({
  defaultValue,
  label,
  name,
  options,
  placeholder,
}: FilterSelectProps) {
  const items = [{ value: "", label: placeholder }, ...options];

  return (
    <Field className="min-w-0">
      <FieldLabel htmlFor={`catalog-${name}`}>{label}</FieldLabel>
      <Select defaultValue={defaultValue ?? ""} items={items} name={name}>
        <SelectTrigger
          aria-label={label}
          className={selectClassName}
          id={`catalog-${name}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false} side="bottom" sideOffset={6}>
          <SelectGroup>
            <SelectItem value="">{placeholder}</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

type CatalogFiltersProps = {
  cities: string[];
  filters: PublicPropertyFilters;
  organizationSlug: string;
};

export function CatalogFilters({
  cities,
  filters,
  organizationSlug,
}: CatalogFiltersProps) {
  const legacyMinimum = filters.price === "over-250000" ? 250001 : undefined;
  const legacyMaximum = filters.price && filters.price !== "over-250000"
    ? Number(filters.price)
    : undefined;

  return (
    <form
      action={`/${encodeURIComponent(organizationSlug)}/properties`}
      autoComplete="off"
      className="rounded-lg border border-border bg-muted/45 p-4 sm:p-5"
      method="get"
    >
      <FieldGroup className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <FilterSelect
          defaultValue={filters.operation}
          label="Operación"
          name="operation"
          options={operationOptions}
          placeholder="Todas"
        />
        <FilterSelect
          defaultValue={filters.type}
          label="Tipo"
          name="type"
          options={publicPropertyTypeOptions}
          placeholder="Todos"
        />
        <FilterSelect
          defaultValue={filters.city}
          label="Localidad"
          name="city"
          options={cities.map((city) => ({ value: city, label: city }))}
          placeholder="Todas"
        />
        <Field className="min-w-0">
          <FieldLabel htmlFor="priceMin">Precio mín.</FieldLabel>
          <Input
            className={inputClassName}
            defaultValue={filters.priceMin ?? legacyMinimum}
            id="priceMin"
            inputMode="numeric"
            min="0"
            name="priceMin"
            pattern="[0-9]*"
            placeholder="Sin mínimo"
            type="text"
          />
        </Field>
        <Field className="min-w-0">
          <FieldLabel htmlFor="priceMax">Precio máx.</FieldLabel>
          <Input
            className={inputClassName}
            defaultValue={filters.priceMax ?? legacyMaximum}
            id="priceMax"
            inputMode="numeric"
            min="0"
            name="priceMax"
            pattern="[0-9]*"
            placeholder="Sin máximo"
            type="text"
          />
        </Field>
        <FilterSelect
          defaultValue={filters.bedrooms?.toString()}
          label="Dormitorios mín."
          name="bedrooms"
          options={quantityOptions.map((value) => ({
            value: String(value),
            label: `${value} o más`,
          }))}
          placeholder="Cualquiera"
        />
        <FilterSelect
          defaultValue={filters.bathrooms?.toString()}
          label="Baños mín."
          name="bathrooms"
          options={quantityOptions.map((value) => ({
            value: String(value),
            label: `${value} o más`,
          }))}
          placeholder="Cualquiera"
        />
      </FieldGroup>

      {filters.sort !== "newest" ? (
        <input name="sort" type="hidden" value={filters.sort} />
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button className="h-11 rounded-lg px-5" type="submit">
          <Search data-icon="inline-start" />
          Aplicar filtros
        </Button>
        <Link
          className={buttonVariants({
            className: "h-11 rounded-lg px-5",
            variant: "outline",
          })}
          href={`/${encodeURIComponent(organizationSlug)}/properties`}
        >
          Limpiar
        </Link>
      </div>
    </form>
  );
}

type CatalogSortProps = {
  filters: PublicPropertyFilters;
};

export function CatalogSort({ filters }: CatalogSortProps) {
  const preservedParams = [
    ["operation", filters.operation],
    ["type", filters.type],
    ["city", filters.city],
    ["price", filters.price],
    ["priceMin", filters.priceMin],
    ["priceMax", filters.priceMax],
    ["bedrooms", filters.bedrooms],
    ["bathrooms", filters.bathrooms],
  ] as const;

  return (
    <form className="flex w-full items-end gap-2 sm:w-auto" method="get">
      {preservedParams.map(([name, value]) =>
        value !== undefined ? (
          <input key={name} name={name} type="hidden" value={String(value)} />
        ) : null,
      )}
      <Field className="min-w-0 sm:w-48">
        <FieldLabel htmlFor="catalog-sort">Ordenar por</FieldLabel>
        <Select
          defaultValue={filters.sort}
          items={[
            { value: "newest", label: "Más recientes" },
            { value: "price_asc", label: "Menor precio" },
            { value: "price_desc", label: "Mayor precio" },
          ]}
          name="sort"
        >
          <SelectTrigger
            aria-label="Ordenar por"
            className="!h-11 w-full rounded-lg px-3"
            id="catalog-sort"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false} side="bottom" sideOffset={6}>
            <SelectGroup>
              <SelectItem value="newest">Más recientes</SelectItem>
              <SelectItem value="price_asc">Menor precio</SelectItem>
              <SelectItem value="price_desc">Mayor precio</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Button className="h-11 rounded-lg px-4" type="submit" variant="outline">
        Ordenar
      </Button>
    </form>
  );
}
