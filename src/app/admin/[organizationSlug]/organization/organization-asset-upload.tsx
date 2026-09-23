"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminFilePicker } from "@/components/admin/admin-file-picker";
import {
  MAX_ORGANIZATION_ASSET_INPUT_SIZE,
  MAX_ORGANIZATION_ASSET_SIZE,
  ORGANIZATION_ASSETS_BUCKET,
  type OrganizationAssetType,
} from "@/lib/organization-assets";
import {
  HERO_IMAGE_PRESET,
  IMAGE_CACHE_CONTROL,
  LOGO_IMAGE_PRESET,
  getOptimizedImageExtension,
  optimizeImage,
} from "@/lib/image-optimization";
import { createClient } from "@/lib/supabase/client";
import { updateOrganizationAsset } from "../actions";

type OrganizationAssetUploadProps = {
  organizationId: string;
  organizationSlug: string;
  assetType: OrganizationAssetType;
  currentUrl: string | null;
  label: string;
};

export function OrganizationAssetUpload({
  organizationId,
  organizationSlug,
  assetType,
  currentUrl,
  label,
}: OrganizationAssetUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File[]>([]);

  async function uploadAsset() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    setMessage(null);
    if (!(file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")) {
      setError("Usá una imagen PNG, JPEG o WebP.");
      return;
    }
    if (file.size > MAX_ORGANIZATION_ASSET_INPUT_SIZE) {
      setError("La imagen no puede superar los 5 MB.");
      return;
    }

    setIsUploading(true);
    setMessage("Preparando imagen...");

    try {
      const preset = assetType === "hero" ? HERO_IMAGE_PRESET : LOGO_IMAGE_PRESET;
      const optimized = await optimizeImage(file, preset);
      setMessage("Subiendo imagen optimizada...");
      const extension = getOptimizedImageExtension(optimized.file.type);
      if (!extension) throw new Error("El formato optimizado no es compatible.");
      const storagePath = `${organizationId}/${assetType}/${crypto.randomUUID()}.${extension}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(ORGANIZATION_ASSETS_BUCKET)
        .upload(storagePath, optimized.file, { contentType: optimized.file.type, cacheControl: IMAGE_CACHE_CONTROL, upsert: false });
      if (uploadError) throw new Error("No se pudo subir la imagen.");

      const result = await updateOrganizationAsset(organizationSlug, assetType, storagePath, optimized.file.type);
      if (!result.ok) {
        await supabase.storage.from(ORGANIZATION_ASSETS_BUCKET).remove([storagePath]);
        throw new Error(result.error);
      }

      setMessage(`${label} actualizado.`);
      setSelectedFile([]);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No se pudo actualizar la imagen.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {currentUrl ? (
        <div className="overflow-hidden rounded-lg border bg-muted p-2">
          <Image
            alt={`${label} actual`}
            className={assetType === "logo" ? "h-20 w-auto max-w-full object-contain" : "aspect-[16/7] w-full object-cover"}
            height={assetType === "logo" ? 80 : 525}
            src={currentUrl}
            width={assetType === "logo" ? 320 : 1200}
          />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">Todavía no hay una imagen configurada.</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminFilePicker
          accept="image/png,image/jpeg,image/webp"
          files={selectedFile}
          hint={`PNG, JPG o WebP · original hasta ${MAX_ORGANIZATION_ASSET_INPUT_SIZE / 1024 / 1024} MB · salida optimizada hasta ${MAX_ORGANIZATION_ASSET_SIZE / 1024 / 1024} MB`}
          inputRef={inputRef}
          label={currentUrl ? "Seleccionar nueva imagen" : "Seleccionar imagen"}
          onChange={setSelectedFile}
          disabled={isUploading}
          icon={ImageIcon}
        />
        <Button disabled={isUploading || selectedFile.length === 0} onClick={uploadAsset} type="button">
          {isUploading ? "Subiendo…" : currentUrl ? "Reemplazar" : "Subir imagen"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Se convierte y optimiza antes de subir. El logo conserva transparencia.</p>
      {message ? <p className="text-sm text-muted-foreground" role="status">{message}</p> : null}
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
