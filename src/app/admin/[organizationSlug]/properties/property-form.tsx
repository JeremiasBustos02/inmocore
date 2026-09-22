/* eslint-disable @next/next/no-img-element -- Local object URL previews are generated in-browser and never sent to an image host. */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { LocationPicker } from "@/components/maps/location-picker";
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
import { AdminFilePicker } from "@/components/admin/admin-file-picker";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_PROPERTY_IMAGES, MAX_PROPERTY_IMAGE_SIZE, PROPERTY_IMAGE_EXTENSIONS, PROPERTY_IMAGES_BUCKET } from "@/lib/property-images";
import { createClient } from "@/lib/supabase/client";
import { registerPropertyImage } from "./image-actions";
import type { properties } from "@/db/schema";
import type { Coordinates } from "@/lib/location";
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
   | "propertyCode"
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
  | "latitude"
  | "longitude"
  | "locationVisibility"
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
  action: (formData: FormData) => void | Promise<void | { ok: boolean; propertyId?: string; error?: string }>;
  cancelHref: string;
  error?: string;
  initialValues?: PropertyFormValues;
  submitLabel: string;
  pendingLabel?: string;
  geocodeAction: (query: string | { address?: string; city?: string; province?: string; country?: string }) => Promise<
    | { ok: true; candidates: { coordinates: Coordinates; displayName: string; address: { road?: string; houseNumber?: string; city?: string; province?: string; country?: string }; hasHouseNumber: boolean }[]; houseNumberNotFound: boolean }
    | { ok: false; reason: "not-found" | "unavailable" }
  >;
  organizationCoordinates?: Coordinates | null;
  markerColor?: string | null;
  createImageUpload?: { organizationId: string; organizationSlug: string };
};

export function PropertyForm({
  action,
  cancelHref,
  error,
  initialValues,
  submitLabel,
  pendingLabel = "Guardando…",
  geocodeAction,
  organizationCoordinates,
  markerColor,
  createImageUpload,
}: PropertyFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef(new Set<string>());
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [uploadedImageCount, setUploadedImageCount] = useState(0);
  const [totalImageCount, setTotalImageCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  function selectFiles(selected: File[]) {
    setFileError(null);
    if (selected.length + files.length > MAX_PROPERTY_IMAGES) return setFileError(`Una propiedad puede tener hasta ${MAX_PROPERTY_IMAGES} imágenes.`);
    const invalid = selected.find((file) => !(file.type in PROPERTY_IMAGE_EXTENSIONS) || file.size > MAX_PROPERTY_IMAGE_SIZE);
    if (invalid) return setFileError(invalid.size > MAX_PROPERTY_IMAGE_SIZE ? "Cada imagen debe pesar 10 MB o menos." : "Sólo se permiten imágenes JPEG, PNG o WebP.");
    setFiles((current) => [...current, ...selected.map((file) => { const preview = URL.createObjectURL(file); previewUrls.current.add(preview); return { file, preview }; })]);
    if (inputRef.current) inputRef.current.value = "";
  }
  async function uploadPending(propertyId: string, pendingFiles: File[]) {
    if (!createImageUpload) return;
    const supabase = createClient();
    const failed: File[] = [];
    let uploadedCount = 0;
    for (const [index, file] of pendingFiles.entries()) {
      setProgress(`Subiendo imágenes… ${index + 1} de ${pendingFiles.length}`);
      const extension = PROPERTY_IMAGE_EXTENSIONS[file.type as keyof typeof PROPERTY_IMAGE_EXTENSIONS];
      const storagePath = `${createImageUpload.organizationId}/${propertyId}/${crypto.randomUUID()}.${extension}`;
      try {
        const uploaded = await supabase.storage.from(PROPERTY_IMAGES_BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
        if (uploaded.error) { failed.push(file); continue; }
        const registered = await registerPropertyImage(createImageUpload.organizationSlug, propertyId, storagePath);
        if (registered.ok) { uploadedCount += 1; continue; }
        // Storage and SQL cannot share a transaction; remove an orphan if row registration fails.
        await supabase.storage.from(PROPERTY_IMAGES_BUCKET).remove([storagePath]);
        failed.push(file);
      } catch {
        failed.push(file);
      }
    }
    setUploadedImageCount((count) => count + uploadedCount);
    setFailedFiles(failed);
    setCreatedId(propertyId);
    setFiles((current) => current.filter(({ file, preview }) => { if (failed.includes(file)) return true; URL.revokeObjectURL(preview); previewUrls.current.delete(preview); return false; }));
    setProgress(failed.length ? `Propiedad creada. Se subieron ${uploadedImageCount + uploadedCount} de ${totalImageCount || files.length} imágenes.` : "Finalizando…");
    if (!failed.length) router.push(`/admin/${encodeURIComponent(createImageUpload.organizationSlug)}/properties/${encodeURIComponent(propertyId)}/edit?created=1`);
    return failed.length;
  }
  async function retryPending() {
    if (!createdId || !failedFiles.length) return;
    setIsSubmitting(true);
    try { await uploadPending(createdId, failedFiles); }
    finally { setIsSubmitting(false); }
  }
  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    if (!createImageUpload) return;
    event.preventDefault();
    setIsSubmitting(true);
    setFileError(null);
    setCreateError(null);
    setProgress("Creando propiedad…");
    try {
      const result = await action(new FormData(event.currentTarget));
      if (!result || typeof result !== "object" || !result.ok || !result.propertyId) {
        setCreateError(result?.error === "code" ? "No se pudo generar un código único para la propiedad. Intentá nuevamente." : "Revisá los campos obligatorios y los valores numéricos.");
        setProgress(null);
        return;
      }
      setCreatedId(result.propertyId);
      setTotalImageCount(files.length);
      if (!files.length) { setProgress("Finalizando…"); router.push(`/admin/${encodeURIComponent(createImageUpload.organizationSlug)}/properties/${encodeURIComponent(result.propertyId)}/edit?created=1`); return; }
      await uploadPending(result.propertyId, files.map(({ file }) => file));
    } catch { setProgress("No se pudo crear la propiedad. Revisá los datos e intentá nuevamente."); }
    finally { setIsSubmitting(false); }
  }
  const initialCoordinates = initialValues?.latitude !== null && initialValues?.latitude !== undefined && initialValues.longitude !== null && initialValues.longitude !== undefined
    ? { latitude: initialValues.latitude, longitude: initialValues.longitude }
    : null;

  return (
    <form action={createImageUpload ? undefined : (formData) => { void action(formData); }} onSubmit={createImageUpload ? handleCreate : undefined} className="flex flex-col gap-8">
      {error ? (
        <Field data-invalid>
          <FieldError>
            {error === "code"
              ? "No se pudo generar un código único para la propiedad. Intentá nuevamente."
              : "Revisá los campos obligatorios y los valores numéricos."}
          </FieldError>
        </Field>
      ) : null}
      {createError ? <Field data-invalid><FieldError>{createError}</FieldError></Field> : null}

      <FieldSet>
        {createImageUpload ? <><FieldLegend>Fotos</FieldLegend><FieldGroup><Field><FieldLabel>Imágenes</FieldLabel><AdminFilePicker accept="image/jpeg,image/png,image/webp" files={files.map(({ file }) => file)} hint={`JPEG, PNG o WebP · máximo 10 MB por imagen · hasta ${MAX_PROPERTY_IMAGES}`} inputRef={inputRef} label="Seleccionar imágenes" multiple disabled={isSubmitting || files.length >= MAX_PROPERTY_IMAGES} onChange={selectFiles} icon={ImageIcon} />{fileError ? <FieldError>{fileError}</FieldError> : null}{files.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{files.map(({ file, preview }, index) => <div className="relative" key={preview}><img className="aspect-square w-full rounded-lg border object-cover" src={preview} alt={`Vista previa ${index + 1}`} /><span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-1 text-xs">{index === 0 ? "Portada" : `Foto ${index + 1}`}</span><Button className="absolute right-2 top-2" size="icon" type="button" variant="destructive" aria-label={`Eliminar ${file.name}`} onClick={() => { URL.revokeObjectURL(preview); previewUrls.current.delete(preview); setFiles((current) => current.filter((item) => item.preview !== preview)); }}><Trash2 /></Button></div>)}</div> : null}{createdId && failedFiles.length ? <Button type="button" variant="outline" disabled={isSubmitting} onClick={retryPending}>Reintentar imágenes pendientes</Button> : null}{progress ? <p className="text-sm text-muted-foreground" aria-live="polite">{progress}</p> : null}</Field></FieldGroup></> : null}
      </FieldSet>

      <FieldSet>
        <FieldLegend>Información</FieldLegend>
        <FieldGroup>
          <div className="grid gap-5 md:grid-cols-2">
            {initialValues?.propertyCode ? (
              <Field>
              <FieldLabel>Código de propiedad</FieldLabel>
                <p className="flex h-10 items-center rounded-lg border border-input bg-muted px-3 text-sm font-medium text-muted-foreground" aria-label="Código de propiedad generado">
                  {initialValues.propertyCode}
                </p>
                <FieldDescription>Generado automáticamente</FieldDescription>
              </Field>
            ) : null}
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
          <Field>
            <FieldLabel>Ubicación en el mapa</FieldLabel>
            <LocationPicker
              addressFieldNames={["address", "city", "province", "country"]}
              fallbackCoordinates={organizationCoordinates}
              geocodeAction={geocodeAction}
              initialCoordinates={initialCoordinates}
              markerColor={markerColor}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="locationVisibility">Ubicación pública</FieldLabel>
            <NativeSelect className="w-full md:max-w-sm" id="locationVisibility" name="locationVisibility" defaultValue={initialValues?.locationVisibility ?? "exact"}>
              <NativeSelectOption value="exact">Exacta</NativeSelectOption>
              <NativeSelectOption value="approximate">Aproximada</NativeSelectOption>
              <NativeSelectOption value="hidden">Oculta</NativeSelectOption>
            </NativeSelect>
            <FieldDescription>
              Exacta muestra el punto seleccionado. Aproximada muestra solamente una zona. Oculta no muestra el mapa.
            </FieldDescription>
          </Field>
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
        {createImageUpload ? <Button disabled={isSubmitting || Boolean(fileError) || Boolean(createdId)} type="submit">{createdId ? "Propiedad creada" : isSubmitting ? progress ?? "Procesando…" : submitLabel}</Button> : <AdminSubmitButton pendingLabel={pendingLabel}>{submitLabel}</AdminSubmitButton>}
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
