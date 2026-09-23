"use server";

import { and, count, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { properties, propertyImages } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import {
  MAX_PROPERTY_IMAGES,
  PROPERTY_IMAGE_EXTENSIONS,
  PROPERTY_IMAGES_BUCKET,
} from "@/lib/property-images";
import { requireOrganizationMembership } from "@/lib/organizations";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_FILENAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|jpg)$/i;

function editPath(organizationSlug: string, propertyId: string) {
  return `/admin/${encodeURIComponent(organizationSlug)}/properties/${encodeURIComponent(propertyId)}/edit`;
}

function dashboardPath(organizationSlug: string) {
  return `/admin/${encodeURIComponent(organizationSlug)}`;
}

async function requireAuthorizedProperty(
  organizationSlug: string,
  propertyId: string,
) {
  if (!UUID_PATTERN.test(propertyId)) {
    notFound();
  }

  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership) {
    notFound();
  }

  const [property] = await db
    .select({ id: properties.id, organizationId: properties.organizationId })
    .from(properties)
    .where(
      and(
        eq(properties.id, propertyId),
        eq(properties.organizationId, membership.id),
      ),
    )
    .limit(1);

  if (!property) {
    notFound();
  }

  return property;
}

function isValidStoragePath(
  storagePath: string,
  organizationId: string,
  propertyId: string,
) {
  const parts = storagePath.split("/");
  return (
    parts.length === 3 &&
    parts[0] === organizationId &&
    parts[1] === propertyId &&
    IMAGE_FILENAME_PATTERN.test(parts[2])
  );
}

export async function registerPropertyImage(
  organizationSlug: string,
  propertyId: string,
  storagePath: string,
  contentType: string,
) {
  const property = await requireAuthorizedProperty(organizationSlug, propertyId);
  const expectedExtension = PROPERTY_IMAGE_EXTENSIONS[contentType as keyof typeof PROPERTY_IMAGE_EXTENSIONS];

  if (
    !expectedExtension ||
    !storagePath.toLowerCase().endsWith(`.${expectedExtension}`) ||
    !isValidStoragePath(storagePath, property.organizationId, property.id)
  ) {
    return { ok: false, error: "La ruta de la imagen no es válida." } as const;
  }

  const [imageState] = await db
    .select({
      imageCount: count(),
      maximumSortOrder: max(propertyImages.sortOrder),
    })
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, property.id));

  if (imageState.imageCount >= MAX_PROPERTY_IMAGES) {
    return {
      ok: false,
      error: `Una propiedad puede tener hasta ${MAX_PROPERTY_IMAGES} imágenes.`,
    } as const;
  }

  try {
    await db.insert(propertyImages).values({
      propertyId: property.id,
      storagePath,
      sortOrder: (imageState.maximumSortOrder ?? -1) + 1,
    });
  } catch {
    return {
      ok: false,
      error: "No se pudo registrar la imagen.",
    } as const;
  }

  revalidatePath(editPath(organizationSlug, propertyId));
  revalidatePath(dashboardPath(organizationSlug));
  return { ok: true } as const;
}

export async function reorderPropertyImages(
  organizationSlug: string,
  propertyId: string,
  imageIds: string[],
) {
  const property = await requireAuthorizedProperty(organizationSlug, propertyId);

  if (
    imageIds.length === 0 ||
    imageIds.length > MAX_PROPERTY_IMAGES ||
    new Set(imageIds).size !== imageIds.length ||
    imageIds.some((id) => !UUID_PATTERN.test(id))
  ) {
    return { ok: false, error: "El orden de imágenes no es válido." } as const;
  }

  const reordered = await db.transaction(async (tx) => {
    const existingImages = await tx
      .select({ id: propertyImages.id })
      .from(propertyImages)
      .where(eq(propertyImages.propertyId, property.id));
    const existingIds = new Set(existingImages.map((image) => image.id));

    if (
      existingIds.size !== imageIds.length ||
      imageIds.some((id) => !existingIds.has(id))
    ) {
      return false;
    }

    for (const [sortOrder, imageId] of imageIds.entries()) {
      await tx
        .update(propertyImages)
        .set({ sortOrder })
        .where(
          and(
            eq(propertyImages.id, imageId),
            eq(propertyImages.propertyId, property.id),
          ),
        );
    }

    return true;
  });

  if (!reordered) {
    return { ok: false, error: "No se pudo actualizar el orden." } as const;
  }

  revalidatePath(editPath(organizationSlug, propertyId));
  return { ok: true } as const;
}

export async function deletePropertyImage(
  organizationSlug: string,
  propertyId: string,
  imageId: string,
) {
  const property = await requireAuthorizedProperty(organizationSlug, propertyId);

  if (!UUID_PATTERN.test(imageId)) {
    return { ok: false, error: "La imagen no es válida." } as const;
  }

  const [image] = await db
    .select({ id: propertyImages.id, storagePath: propertyImages.storagePath })
    .from(propertyImages)
    .where(
      and(
        eq(propertyImages.id, imageId),
        eq(propertyImages.propertyId, property.id),
      ),
    )
    .limit(1);

  if (!image) {
    return { ok: false, error: "La imagen no existe." } as const;
  }

  const supabase = await createClient();
  const { error: storageError } = await supabase.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .remove([image.storagePath]);

  if (storageError) {
    return {
      ok: false,
      error: "No se pudo eliminar el archivo de Storage.",
    } as const;
  }

  await db
    .delete(propertyImages)
    .where(
      and(
        eq(propertyImages.id, image.id),
        eq(propertyImages.propertyId, property.id),
      ),
    );

  revalidatePath(editPath(organizationSlug, propertyId));
  revalidatePath(dashboardPath(organizationSlug));
  return { ok: true } as const;
}
