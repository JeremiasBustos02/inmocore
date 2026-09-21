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
  MAX_PROPERTY_IMAGE_SIZE,
  PROPERTY_IMAGE_EXTENSIONS,
  PROPERTY_IMAGES_BUCKET,
} from "@/lib/property-images";
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
  file: File;
  previewUrl: string;
};

function isAllowedMimeType(
  type: string,
): type is keyof typeof PROPERTY_IMAGE_EXTENSIONS {
  return type in PROPERTY_IMAGE_EXTENSIONS;
}

export function PropertyImages({
  images,
  organizationId,
  organizationSlug,
  propertyId,
  propertyTitle,
}: PropertyImagesProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      selectedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [selectedImages]);

  function clearSelection() {
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

    const invalidType = selected.some((file) => !isAllowedMimeType(file.type));
    if (invalidType) {
      setError("Sólo se permiten imágenes JPEG, PNG o WebP.");
      clearSelection();
      return;
    }

    const oversized = selected.some(
      (file) => file.size > MAX_PROPERTY_IMAGE_SIZE,
    );
    if (oversized) {
      setError("Cada imagen debe pesar 10 MB o menos.");
      clearSelection();
      return;
    }

    setSelectedImages(
      selected.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    );
  }

  async function uploadImages() {
    if (selectedImages.length === 0) return;

    setError(null);
    setIsWorking(true);

    try {
      const supabase = createClient();

      for (const [index, selectedImage] of selectedImages.entries()) {
        const { file } = selectedImage;

        if (!isAllowedMimeType(file.type)) {
          throw new Error("El tipo de una imagen no es válido.");
        }

        setUploadProgress(
          `Subiendo imagen ${index + 1} de ${selectedImages.length}…`,
        );
        const extension = PROPERTY_IMAGE_EXTENSIONS[file.type];
        const storagePath = `${organizationId}/${propertyId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(PROPERTY_IMAGES_BUCKET)
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error("No se pudo subir una de las imágenes.");
        }

        const registration = await registerPropertyImage(
          organizationSlug,
          propertyId,
          storagePath,
        );

        if (!registration.ok) {
          await supabase.storage.from(PROPERTY_IMAGES_BUCKET).remove([storagePath]);
          throw new Error(registration.error);
        }
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudieron subir las imágenes.",
      );
    } finally {
      clearSelection();
      setUploadProgress(null);
      setIsWorking(false);
      router.refresh();
    }
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
          Hasta {MAX_PROPERTY_IMAGES} imágenes JPEG, PNG o WebP de 10 MB cada una.
          La primera imagen es la portada.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <AdminFilePicker
          accept="image/jpeg,image/png,image/webp"
          files={selectedImages.map((image) => image.file)}
          hint={`JPEG, PNG o WebP · máximo 10 MB por imagen · hasta ${MAX_PROPERTY_IMAGES}`}
          inputRef={inputRef}
          label="Seleccionar imágenes"
          multiple
          disabled={isWorking || images.length >= MAX_PROPERTY_IMAGES}
          onChange={(files) => selectFiles(files.length > 0 ? files : null)}
          icon={ImageIcon}
        />

        {selectedImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {selectedImages.map((image, index) => (
              <img
                key={image.previewUrl}
                className="aspect-square w-full rounded-lg border object-cover"
                src={image.previewUrl}
                alt={`Vista previa de imagen seleccionada ${index + 1}`}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={isWorking || selectedImages.length === 0}
            onClick={uploadImages}
          >
            {isWorking ? "Subiendo…" : "Subir imágenes"}
          </Button>
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
