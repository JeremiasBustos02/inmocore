import Link from "next/link";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { properties } from "@/db/schema";
import {
  currencies,
  operationTypeLabels,
  operationTypes,
  propertyStatusLabels,
  propertyStatuses,
  propertyTypeLabels,
  propertyTypes,
} from "./property-options";

type PropertyFormValues = Pick<
  typeof properties.$inferSelect,
  | "reference"
  | "title"
  | "description"
  | "operationType"
  | "propertyType"
  | "status"
  | "priceAmount"
  | "currency"
  | "address"
  | "city"
  | "province"
  | "country"
  | "rooms"
  | "bedrooms"
  | "bathrooms"
  | "garageSpaces"
  | "coveredAreaM2"
  | "totalAreaM2"
  | "isPublished"
  | "isFeatured"
>;

type PropertyFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  error?: string;
  initialValues?: PropertyFormValues;
  submitLabel: string;
  pendingLabel?: string;
};

export function PropertyForm({
  action,
  cancelHref,
  error,
  initialValues,
  submitLabel,
  pendingLabel = "Guardando…",
}: PropertyFormProps) {
  return (
    <form action={action} className="flex flex-col gap-8">
      {error && error !== "reference" ? (
        <Field data-invalid>
          <FieldError>
            {error === "reference"
              ? "Ya existe una propiedad con esa referencia en esta inmobiliaria."
              : "Revisá los campos obligatorios y los valores numéricos."}
          </FieldError>
        </Field>
      ) : null}

      <FieldSet>
        <FieldLegend>Información</FieldLegend>
        <FieldGroup>
          <div className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="reference">Referencia</FieldLabel>
              <Input aria-invalid={error === "reference"} id="reference" name="reference" defaultValue={initialValues?.reference} required />
              {error === "reference" ? <FieldError>Ya existe una propiedad con esa referencia en esta inmobiliaria.</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="title">Título</FieldLabel>
              <Input id="title" name="title" defaultValue={initialValues?.title} required />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="description">Descripción</FieldLabel>
            <Textarea id="description" name="description" defaultValue={initialValues?.description ?? ""} rows={4} />
          </Field>
          <div className="grid gap-5 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="operationType">Operación</FieldLabel>
              <NativeSelect className="w-full" id="operationType" name="operationType" defaultValue={initialValues?.operationType ?? "sale"}>
                {operationTypes.map((value) => <NativeSelectOption key={value} value={value}>{operationTypeLabels[value]}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="propertyType">Tipo</FieldLabel>
              <NativeSelect className="w-full" id="propertyType" name="propertyType" defaultValue={initialValues?.propertyType ?? "house"}>
                {propertyTypes.map((value) => <NativeSelectOption key={value} value={value}>{propertyTypeLabels[value]}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="status">Estado</FieldLabel>
              <NativeSelect className="w-full" id="status" name="status" defaultValue={initialValues?.status ?? "draft"}>
                {propertyStatuses.map((value) => <NativeSelectOption key={value} value={value}>{propertyStatusLabels[value]}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Precio</FieldLegend>
        <FieldDescription>Ingresá el importe completo, sin centavos. Podés dejarlo vacío para mostrarlo como consulta.</FieldDescription>
        <FieldGroup>
          <div className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="price">Precio</FieldLabel>
              <Input id="price" name="price" type="number" min="0" step="1" defaultValue={initialValues?.priceAmount == null ? "" : initialValues.priceAmount / 100} />
            </Field>
            <Field>
              <FieldLabel htmlFor="currency">Moneda</FieldLabel>
              <NativeSelect className="w-full" id="currency" name="currency" defaultValue={initialValues?.currency ?? "USD"}>
                {currencies.map((value) => <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Ubicación</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="address">Dirección</FieldLabel>
            <Input id="address" name="address" defaultValue={initialValues?.address ?? ""} />
          </Field>
          <div className="grid gap-5 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="city">Ciudad</FieldLabel>
              <Input id="city" name="city" defaultValue={initialValues?.city} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="province">Provincia</FieldLabel>
              <Input id="province" name="province" defaultValue={initialValues?.province} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="country">País</FieldLabel>
              <Input id="country" name="country" defaultValue={initialValues?.country ?? "Argentina"} required />
            </Field>
          </div>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Características</FieldLegend>
        <FieldGroup>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField id="rooms" label="Ambientes" value={initialValues?.rooms} min={0} />
            <NumberField id="bedrooms" label="Dormitorios" value={initialValues?.bedrooms} min={0} />
            <NumberField id="bathrooms" label="Baños" value={initialValues?.bathrooms} min={0} />
            <NumberField id="garageSpaces" label="Cocheras" value={initialValues?.garageSpaces} min={0} />
            <NumberField id="coveredAreaM2" label="Superficie cubierta (m²)" value={initialValues?.coveredAreaM2} min={1} />
            <NumberField id="totalAreaM2" label="Superficie total (m²)" value={initialValues?.totalAreaM2} min={1} />
          </div>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Publicación</FieldLegend>
        <FieldDescription>Los borradores y las propiedades vendidas, alquiladas o archivadas se guardan siempre despublicadas.</FieldDescription>
        <FieldGroup data-slot="checkbox-group">
          <Field orientation="horizontal">
            <Checkbox id="isPublished" name="isPublished" defaultChecked={initialValues?.isPublished} />
            <FieldContent>
              <FieldLabel htmlFor="isPublished">Publicada</FieldLabel>
            </FieldContent>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="isFeatured" name="isFeatured" defaultChecked={initialValues?.isFeatured} />
            <FieldContent>
              <FieldLabel htmlFor="isFeatured">Destacada</FieldLabel>
            </FieldContent>
          </Field>
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-wrap justify-end gap-3">
        <Link className={buttonVariants({ variant: "outline" })} href={cancelHref}>Cancelar</Link>
        <AdminSubmitButton pendingLabel={pendingLabel}>{submitLabel}</AdminSubmitButton>
      </div>
    </form>
  );
}

function NumberField({ id, label, value, min }: { id: string; label: string; value?: number | null; min: number }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} name={id} type="number" min={min} step="1" defaultValue={value ?? ""} />
    </Field>
  );
}
