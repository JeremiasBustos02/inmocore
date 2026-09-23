/* eslint-disable @next/next/no-img-element -- Admin thumbnails use public Storage URLs from a runtime-configured project. */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon } from "lucide-react";
import { AdminFilePicker } from "@/components/admin/admin-file-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  MAX_PROPERTY_IMAGES,
  PROPERTY_IMAGES_BUCKET,
} from "@/lib/property-images";
import {
  IMAGE_CACHE_CONTROL,
  MAX_IMAGE_INPUT_SIZE,
  PROPERTY_IMAGE_PRESET,
  getOptimizedImageExtension,
  optimizeImageBatch,
  validateImageInput,
} from "@/lib/image-optimization";
import { createClient } from "@/lib/supabase/client";
import {
  deletePropertyImage,
  registerPropertyImage,
  reorderPropertyImages,
} from "../../image-actions";

type PropertyImage = {
  id: string;
  publicUrl: string;
};

type PropertyImagesProps = {
  images: PropertyImage[];
  organizationId: string;
  organizationSlug: string;
  propertyId: string;
  propertyTitle: string;
};

type SelectedImage = {
  id: string;
  original: File;
  optimized?: File;
  previewUrl?: string;
  error?: string;
  status: "processing" | "ready" | "error";
};

export function PropertyImages({
  images,
  organizationId,
  organizationSlug,
  propertyId,
  propertyTitle,
}: PropertyImagesProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useRef(new Set<string>());
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function clearSelection() {
    selectedImages.forEach(({ previewUrl }) => {
      if (!previewUrl) return;
      URL.revokeObjectURL(previewUrl);
      previewUrls.current.delete(previewUrl);
    });
    setSelectedImages([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function selectFiles(files: FileList | File[] | null) {
    setError(null);

    if (!files || files.length === 0) {
      clearSelection();
      return;
    }

    const selected = Array.from(files);

    if (images.length + selected.length > MAX_PROPERTY_IMAGES) {
      setError(`Una propiedad puede tener hasta ${MAX_PROPERTY_IMAGES} imágenes.`);
      clearSelection();
      return;
    }

    const nextSelection = selected.map((original): SelectedImage => {
      const validationError = validateImageInput(original);
      return {
        id: crypto.randomUUID(),
        original,
        status: validationError ? "error" : "processing",
        error: validationError ?? undefined,
      };
    });
    setSelectedImages((current) => [...current, ...nextSelection]);
    const validSelection = nextSelection.filter(({ status }) => status === "processing");
    if (validSelection.length) void processAndUpload(validSelection);
  }

  async function processAndUpload(imagesToUpload: SelectedImage[]) {
    if (imagesToUpload.length === 0) return;

    setError(null);
    setIsWorking(true);

    try {
      setUploadProgress("Preparando imágenes...");
      const processed = await optimizeImageBatch(
        imagesToUpload.map(({ original }) => original),
        PROPERTY_IMAGE_PRESET,
        (completed, total) => setUploadProgress(`Optimizando ${completed} de ${total}...`),
      );
      const ready = processed.flatMap((result) => {
        const item = imagesToUpload[result.index];
        if (!result.ok) {
          setSelectedImages((current) => current.map((candidate) => candidate.id === item.id
            ? { ...candidate, status: "error", error: result.error }
            : candidate));
          return [];
        }
        const previewUrl = URL.createObjectURL(result.result.file);
        previewUrls.current.add(previewUrl);
        const updated = { ...item, optimized: result.result.file, previewUrl, status: "ready" as const, error: undefined };
        setSelectedImages((current) => current.map((candidate) => candidate.id === item.id ? updated : candidate));
        return [updated];
      });

      const supabase = createClient();
      const uploadedIds = new Set<string>();
      for (const [index, item] of ready.entries()) {
        const file = item.optimized;
        if (!file) continue;
        const extension = getOptimizedImageExtension(file.type);
        if (!extension) {
          setSelectedImages((current) => current.map((candidate) => candidate.id === item.id
            ? { ...candidate, status: "error", error: "El formato optimizado no es compatible." }
            : candidate));
          continue;
        }
        setUploadProgress(`Subiendo imágenes… ${index + 1} de ${ready.length}`);
        const storagePath = `${organizationId}/${propertyId}/${crypto.randomUUID()}.${extension}`;
        try {
          const { error: uploadError } = await supabase.storage
            .from(PROPERTY_IMAGES_BUCKET)
            .upload(storagePath, file, {
              contentType: file.type,
              cacheControl: IMAGE_CACHE_CONTROL,
              upsert: false,
            });
          if (uploadError) {
            setSelectedImages((current) => current.map((candidate) => candidate.id === item.id
              ? { ...candidate, status: "error", error: "No se pudo subir la imagen optimizada. Podés reintentar." }
              : candidate));
            continue;
          }

          const registration = await registerPropertyImage(organizationSlug, propertyId, storagePath, file.type);
          if (!registration.ok) {
            await supabase.storage.from(PROPERTY_IMAGES_BUCKET).remove([storagePath]);
            setSelectedImages((current) => current.map((candidate) => candidate.id === item.id
              ? { ...candidate, status: "error", error: registration.error }
              : candidate));
            continue;
          }
          uploadedIds.add(item.id);
        } catch {
          setSelectedImages((current) => current.map((candidate) => candidate.id === item.id
            ? { ...candidate, status: "error", error: "No se pudo subir la imagen. Podés reintentar." }
            : candidate));
        }
      }

      setSelectedImages((current) => current.filter((item) => {
        if (!uploadedIds.has(item.id)) return true;
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
          previewUrls.current.delete(item.previewUrl);
        }
        return false;
      }));
      if (processed.some((result) => !result.ok) || ready.length !== uploadedIds.size) {
        setError("Algunas imágenes no se pudieron procesar o subir. Podés reintentarlas o eliminarlas.");
      }
    } finally {
      setUploadProgress(null);
      setIsWorking(false);
      router.refresh();
    }
  }

  function retryImage(image: SelectedImage) {
    if (image.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
      previewUrls.current.delete(image.previewUrl);
    }
    setSelectedImages((current) => current.map((candidate) => candidate.id === image.id
      ? { ...candidate, optimized: undefined, previewUrl: undefined, status: "processing", error: undefined }
      : candidate));
    void processAndUpload([{ ...image, optimized: undefined, previewUrl: undefined, status: "processing", error: undefined }]);
  }

  async function applyOrder(imageIds: string[]) {
    setError(null);
    setIsWorking(true);

    try {
      const result = await reorderPropertyImages(
        organizationSlug,
        propertyId,
        imageIds,
      );
      if (!result.ok) setError(result.error);
    } catch {
      setError("No se pudo actualizar el orden.");
    } finally {
      setIsWorking(false);
      router.refresh();
    }
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;

    const imageIds = images.map((image) => image.id);
    [imageIds[index], imageIds[target]] = [imageIds[target], imageIds[index]];
    await applyOrder(imageIds);
  }

  async function makeCover(imageId: string) {
    await applyOrder([
      imageId,
      ...images.filter((image) => image.id !== imageId).map((image) => image.id),
    ]);
  }

  async function removeImage(imageId: string) {
    setError(null);
    setIsWorking(true);

    try {
      const result = await deletePropertyImage(
        organizationSlug,
        propertyId,
        imageId,
      );
      if (!result.ok) setError(result.error);
    } catch {
      setError("No se pudo eliminar la imagen.");
    } finally {
      setIsWorking(false);
      router.refresh();
    }
  }

  return (
    <section className="flex flex-col gap-5 border-t pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Imágenes</h2>
        <p className="text-sm text-muted-foreground">
          Hasta {MAX_PROPERTY_IMAGES} imágenes JPEG, PNG o WebP de {MAX_IMAGE_INPUT_SIZE / 1024 / 1024} MB por archivo. La primera imagen es la portada.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <AdminFilePicker
          accept="image/jpeg,image/png,image/webp"
          files={selectedImages.map((image) => image.original)}
          hint={`JPEG, PNG o WebP · máximo ${MAX_IMAGE_INPUT_SIZE / 1024 / 1024} MB por archivo · hasta ${MAX_PROPERTY_IMAGES} imágenes`}
          inputRef={inputRef}
          label="Seleccionar imágenes"
          multiple
          disabled={isWorking || images.length + selectedImages.length >= MAX_PROPERTY_IMAGES}
          onChange={(files) => selectFiles(files.length > 0 ? files : null)}
          icon={ImageIcon}
        />

        {selectedImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {selectedImages.map((image, index) => (
              <div key={image.id}>
                {image.previewUrl ? <img className="aspect-square w-full rounded-lg border object-cover" src={image.previewUrl} alt={`Vista previa optimizada ${index + 1}`} /> : <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted p-3 text-center text-xs text-muted-foreground">{image.status === "processing" ? "Preparando imagen…" : image.original.name}</div>}
                {image.status === "error" ? <p className="mt-1 text-xs text-destructive">✕ {image.original.name} — {image.error}</p> : null}
                {image.status === "error" ? <Button className="mt-1" size="sm" type="button" variant="outline" disabled={isWorking} onClick={() => retryImage(image)}>Reintentar</Button> : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {uploadProgress ? (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {uploadProgress}
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {images.length === 0 ? (
        <Empty className="min-h-40 border">
          <EmptyHeader>
            <EmptyTitle>Esta propiedad todavía no tiene imágenes</EmptyTitle>
            <EmptyDescription>
              Seleccioná una o varias imágenes para comenzar.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {images.map((image, index) => (
            <article
              className="flex flex-col gap-3 rounded-xl border bg-card p-3"
              key={image.id}
            >
              <div className="relative">
                <img
                  className="aspect-video w-full rounded-lg object-cover"
                  src={image.publicUrl}
                  alt={`Imagen ${index + 1} de ${propertyTitle}`}
                />
                {index === 0 ? (
                  <Badge className="absolute left-2 top-2">Portada</Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isWorking || index === 0}
                  onClick={() => moveImage(index, -1)}
                >
                  Mover arriba
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isWorking || index === images.length - 1}
                  onClick={() => moveImage(index, 1)}
                >
                  Mover abajo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isWorking || index === 0}
                  onClick={() => makeCover(image.id)}
                >
                  Hacer portada
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isWorking}
                  onClick={() => removeImage(image.id)}
                >
                  Eliminar
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
