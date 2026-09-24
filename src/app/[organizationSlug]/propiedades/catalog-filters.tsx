"use client";

import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  idPrefix: string;
  label: string;
  name: string;
  onValueChange?: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder: string;
  value?: string;
};

function FilterSelect({
  idPrefix,
  label,
  name,
  onValueChange,
  options,
  placeholder,
  value,
}: FilterSelectProps) {
  const items = [{ value: "", label: placeholder }, ...options];

  return (
    <Field className="min-w-0">
      <FieldLabel htmlFor={`${idPrefix}-${name}`}>{label}</FieldLabel>
      <Select
        items={items}
        name={name}
        onValueChange={(value) => {
          if (typeof value === "string") onValueChange?.(value);
        }}
        value={value ?? ""}
      >
        <SelectTrigger
          aria-label={label}
          className={selectClassName}
          id={`${idPrefix}-${name}`}
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
  publicBasePath: string;
};

type FilterFieldsProps = {
  cities: string[];
  filters: PublicPropertyFilters;
  idPrefix: string;
  onSelectChange?: (name: FilterSelectName, value: string) => void;
  selectValues: FilterSelectValues;
  stacked?: boolean;
};

type FilterSelectName = "operation" | "type" | "city" | "bedrooms" | "bathrooms";
type FilterSelectValues = Pick<PublicPropertyFilters, FilterSelectName>;

function getSelectValues(filters: PublicPropertyFilters): FilterSelectValues {
  return {
    operation: filters.operation,
    type: filters.type,
    city: filters.city,
    bedrooms: filters.bedrooms,
    bathrooms: filters.bathrooms,
  };
}

function FilterFields({ cities, filters, idPrefix, onSelectChange, selectValues, stacked = false }: FilterFieldsProps) {
  const legacyMinimum = filters.price === "over-250000" ? 250001 : undefined;
  const legacyMaximum = filters.price && filters.price !== "over-250000"
    ? Number(filters.price)
    : undefined;

  return (
    <FieldGroup className={cn("min-w-0 gap-4", stacked ? "flex flex-col" : "grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7")}>
        <FilterSelect
          idPrefix={idPrefix}
          label="Operación"
          name="operation"
          onValueChange={(value) => onSelectChange?.("operation", value)}
          options={operationOptions}
          placeholder="Todas"
          value={selectValues.operation}
        />
        <FilterSelect
          idPrefix={idPrefix}
          label="Tipo"
          name="type"
          onValueChange={(value) => onSelectChange?.("type", value)}
          options={publicPropertyTypeOptions}
          placeholder="Todos"
          value={selectValues.type}
        />
        <FilterSelect
          idPrefix={idPrefix}
          label="Localidad"
          name="city"
          onValueChange={(value) => onSelectChange?.("city", value)}
          options={cities.map((city) => ({ value: city, label: city }))}
          placeholder="Todas"
          value={selectValues.city}
        />
        <Field className="min-w-0">
          <FieldLabel htmlFor={`${idPrefix}-priceMin`}>Precio mín.</FieldLabel>
          <Input
            className={inputClassName}
            defaultValue={filters.priceMin ?? legacyMinimum}
            id={`${idPrefix}-priceMin`}
            inputMode="numeric"
            min="0"
            name="priceMin"
            pattern="[0-9]*"
            placeholder="Sin mínimo"
            type="number"
          />
        </Field>
        <Field className="min-w-0">
          <FieldLabel htmlFor={`${idPrefix}-priceMax`}>Precio máx.</FieldLabel>
          <Input
            className={inputClassName}
            defaultValue={filters.priceMax ?? legacyMaximum}
            id={`${idPrefix}-priceMax`}
            inputMode="numeric"
            min="0"
            name="priceMax"
            pattern="[0-9]*"
            placeholder="Sin máximo"
            type="number"
          />
        </Field>
        <FilterSelect
          idPrefix={idPrefix}
          label="Dormitorios mín."
          name="bedrooms"
          onValueChange={(value) => onSelectChange?.("bedrooms", value)}
          options={quantityOptions.map((value) => ({
            value: String(value),
            label: `${value} o más`,
          }))}
          placeholder="Cualquiera"
          value={selectValues.bedrooms?.toString()}
        />
        <FilterSelect
          idPrefix={idPrefix}
          label="Baños mín."
          name="bathrooms"
          onValueChange={(value) => onSelectChange?.("bathrooms", value)}
          options={quantityOptions.map((value) => ({
            value: String(value),
            label: `${value} o más`,
          }))}
          placeholder="Cualquiera"
          value={selectValues.bathrooms?.toString()}
        />
    </FieldGroup>
  );
}

function FilterForm({
  cities,
  filters,
  formId,
  onSelectChange,
  publicBasePath,
  selectValues,
  autoApply = false,
}: Omit<FilterFieldsProps, "idPrefix" | "onSelectChange"> & {
  autoApply?: boolean;
  formId: string;
  onSelectChange?: (name: FilterSelectName, value: string) => void;
  publicBasePath: string;
}) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function navigateFromForm(form: HTMLFormElement, override?: [string, string]) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const formData = new FormData(form);
    const params = new URLSearchParams();
    const filterNames = ["operation", "type", "city", "priceMin", "priceMax", "bedrooms", "bathrooms"];

    for (const name of filterNames) {
      const value = override?.[0] === name ? override[1] : formData.get(name);
      if (typeof value === "string" && value.trim()) params.set(name, value);
    }

    const sort = formData.get("sort");
    if (typeof sort === "string" && sort && sort !== "newest") params.set("sort", sort);

    const query = params.toString();
    router.push(query ? `${publicBasePath}/propiedades?${query}` : `${publicBasePath}/propiedades`);
  }

  return (
    <form
      action={`${publicBasePath}/propiedades`}
      autoComplete="off"
      className="flex min-h-0 flex-col"
      id={formId}
      method="get"
      ref={formRef}
      onInput={
        autoApply
          ? (event) => {
              if (!(event.target instanceof HTMLInputElement) || !["priceMin", "priceMax"].includes(event.target.name)) return;
              if (debounceRef.current) clearTimeout(debounceRef.current);
              const form = event.currentTarget;
              debounceRef.current = setTimeout(() => {
                debounceRef.current = null;
                navigateFromForm(form);
              }, 650);
            }
          : undefined
      }
      onSubmit={
        autoApply
          ? (event) => {
              event.preventDefault();
              navigateFromForm(event.currentTarget);
            }
          : undefined
      }
    >
      <FilterFields
        cities={cities}
        filters={filters}
        idPrefix={formId}
        onSelectChange={autoApply
          ? (name, value) => {
              if (formRef.current) navigateFromForm(formRef.current, [name, value]);
            }
          : onSelectChange}
        selectValues={selectValues}
        stacked={autoApply}
      />

      {filters.sort !== "newest" ? (
        <input name="sort" type="hidden" value={filters.sort} />
      ) : null}
    </form>
  );
}

export function CatalogFilters({
  cities,
  filters,
  publicBasePath,
}: CatalogFiltersProps) {
  const urlSelectValues = getSelectValues(filters);
  const [mobileSelectValues, setMobileSelectValues] = useState(urlSelectValues);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const activeFilterCount = [
    filters.operation,
    filters.type,
    filters.city,
    filters.price,
    filters.priceMin,
    filters.priceMax,
    filters.bedrooms,
    filters.bathrooms,
  ].filter((value) => value !== undefined).length;

  useEffect(() => {
    startTransition(() => {
      setMobileSelectValues({
        operation: filters.operation,
        type: filters.type,
        city: filters.city,
        bedrooms: filters.bedrooms,
        bathrooms: filters.bathrooms,
      });
    });
  }, [filters.operation, filters.type, filters.city, filters.bedrooms, filters.bathrooms]);

  return (
    <>
      <div className="hidden lg:block">
        <div className="rounded-lg border border-border bg-muted/45 p-4 sm:p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold tracking-[-0.02em]">Filtros</h2>
            <Link
              className={buttonVariants({
                className: "h-9 rounded-lg px-3 text-sm",
                variant: "ghost",
              })}
              href={getClearHref(filters, publicBasePath)}
            >
              Limpiar filtros
            </Link>
          </div>
          <FilterForm
            cities={cities}
            filters={filters}
            formId="catalog-filters-desktop"
            publicBasePath={publicBasePath}
            autoApply
            selectValues={urlSelectValues}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 lg:hidden">
        <Sheet
          open={mobileSheetOpen}
          onOpenChange={(open) => {
            setMobileSheetOpen(open);
            setMobileSelectValues(getSelectValues(filters));
          }}
        >
          <SheetTrigger
            render={
              <Button className="h-11 rounded-lg px-4" variant="outline">
                <SlidersHorizontal data-icon="inline-start" />
                Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Button>
            }
          />
          <SheetContent className="max-h-[90dvh] overflow-hidden rounded-t-xl" side="bottom">
            <SheetHeader className="border-b border-border px-5 py-4">
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Refiná la búsqueda de propiedades.</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <FilterForm
                cities={cities}
                filters={filters}
                formId="catalog-filters-mobile"
                publicBasePath={publicBasePath}
                selectValues={mobileSelectValues}
                onSelectChange={(name, value) => {
                  setMobileSelectValues((current) => ({
                    ...current,
                    [name]: value || undefined,
                  }));
                }}
              />
            </div>
            <SheetFooter className="border-t border-border bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                className={buttonVariants({
                  className: "h-11 rounded-lg px-4",
                  variant: "ghost",
                })}
                href={getClearHref(filters, publicBasePath)}
              >
                Limpiar filtros
              </Link>
              <Button className="h-11 rounded-lg px-5" form="catalog-filters-mobile" type="submit">
                Ver resultados
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <CatalogSort compact filters={filters} publicBasePath={publicBasePath} />
      </div>
    </>
  );
}

type CatalogSortProps = {
  filters: PublicPropertyFilters;
  publicBasePath: string;
  compact?: boolean;
};

function getClearHref(filters: PublicPropertyFilters, publicBasePath: string) {
  if (filters.sort === "newest") return `${publicBasePath}/propiedades`;
  return `${publicBasePath}/propiedades?sort=${filters.sort}`;
}

function getSortHref(
  filters: PublicPropertyFilters,
  publicBasePath: string,
  sort: PublicPropertyFilters["sort"],
) {
  const params = new URLSearchParams();

  if (filters.operation) params.set("operation", filters.operation);
  if (filters.type) params.set("type", filters.type);
  if (filters.city) params.set("city", filters.city);
  if (filters.price) params.set("price", filters.price);
  if (filters.priceMin !== undefined) params.set("priceMin", String(filters.priceMin));
  if (filters.priceMax !== undefined) params.set("priceMax", String(filters.priceMax));
  if (filters.bedrooms !== undefined) params.set("bedrooms", String(filters.bedrooms));
  if (filters.bathrooms !== undefined) params.set("bathrooms", String(filters.bathrooms));
  if (sort !== "newest") params.set("sort", sort);

  const query = params.toString();
  return query ? `${publicBasePath}/propiedades?${query}` : `${publicBasePath}/propiedades`;
}

export function CatalogSort({ compact = false, filters, publicBasePath }: CatalogSortProps) {
  const router = useRouter();

  function navigateToSort(value: string) {
    if (!(["newest", "oldest", "price_asc", "price_desc"] as const).includes(value as PublicPropertyFilters["sort"])) {
      return;
    }

    router.push(getSortHref(filters, publicBasePath, value as PublicPropertyFilters["sort"]));
  }

  return (
    <div className={cn("flex items-end gap-2", compact ? "w-auto" : "w-full sm:w-auto")}>
      {compact ? (
        <Field className="min-w-0">
          <FieldLabel className="sr-only" htmlFor="catalog-sort-mobile">Ordenar por</FieldLabel>
          <NativeSelect
            aria-label="Ordenar por"
            className="w-[13rem] [&_select]:h-11 [&_select]:rounded-lg [&_select]:border-border [&_select]:bg-background [&_select]:pr-10 [&_select]:pl-3"
            id="catalog-sort-mobile"
            onChange={(event) => navigateToSort(event.currentTarget.value)}
            size="default"
            value={filters.sort}
          >
            <NativeSelectOption value="newest">Ordenar: Más recientes</NativeSelectOption>
            <NativeSelectOption value="oldest">Ordenar: Más antiguos</NativeSelectOption>
            <NativeSelectOption value="price_asc">Ordenar: Menor precio</NativeSelectOption>
            <NativeSelectOption value="price_desc">Ordenar: Mayor precio</NativeSelectOption>
          </NativeSelect>
        </Field>
      ) : (
        <Field className="min-w-0 sm:w-48">
          <FieldLabel htmlFor="catalog-sort">Ordenar por</FieldLabel>
          <Select
            items={[
              { value: "newest", label: "Más recientes" },
              { value: "oldest", label: "Más antiguos" },
              { value: "price_asc", label: "Menor precio" },
              { value: "price_desc", label: "Mayor precio" },
            ]}
            name="sort"
            onValueChange={(value) => {
              if (typeof value === "string") navigateToSort(value);
            }}
            value={filters.sort}
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
                <SelectItem value="oldest">Más antiguos</SelectItem>
                <SelectItem value="price_asc">Menor precio</SelectItem>
                <SelectItem value="price_desc">Mayor precio</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  );
}
