"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { locationVisibilities, properties, propertyImages } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { parseCoordinates } from "@/lib/location";
import { reservePropertyCode } from "@/lib/property-codes";
import { requireOrganizationMembership } from "@/lib/organizations";
import { PROPERTY_IMAGES_BUCKET } from "@/lib/property-images";
import {
  currencies,
  operationTypes,
  propertyStatuses,
  propertyTypes,
} from "./property-options";

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function enumValue<T extends string>(
  formData: FormData,
  name: string,
  values: readonly T[],
) {
  const value = formData.get(name);
  return typeof value === "string"
    ? (values.find((option) => option === value) ?? null)
    : null;
}

function optionalInteger(formData: FormData, name: string, minimum: number) {
  const value = formData.get(name);

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  if (!/^\d+$/.test(value.trim())) {
    return undefined;
  }

  const number = Number(value);
  return Number.isSafeInteger(number) && number >= minimum ? number : undefined;
}

function parsePropertyForm(formData: FormData) {
  const title = requiredText(formData, "title");
  const operationType = enumValue(formData, "operationType", operationTypes);
  const propertyType = enumValue(formData, "propertyType", propertyTypes);
  const status = enumValue(formData, "status", propertyStatuses);
  const city = requiredText(formData, "city");
  const province = requiredText(formData, "province");
  const country = requiredText(formData, "country");
  const price = optionalInteger(formData, "price", 0);
  const bedrooms = optionalInteger(formData, "bedrooms", 0);
  const bathrooms = optionalInteger(formData, "bathrooms", 0);
  const rooms = optionalInteger(formData, "rooms", 0);
  const garageSpaces = optionalInteger(formData, "garageSpaces", 0);
  const coveredAreaM2 = optionalInteger(formData, "coveredAreaM2", 1);
  const totalAreaM2 = optionalInteger(formData, "totalAreaM2", 1);
  const currency = price === null ? null : enumValue(formData, "currency", currencies);
  const coordinates = parseCoordinates(
    formData.get("latitude"),
    formData.get("longitude"),
  );
  const locationVisibility = enumValue(
    formData,
    "locationVisibility",
    locationVisibilities,
  );

  if (
    !title ||
    !operationType ||
    !propertyType ||
    !status ||
    !city ||
    !province ||
    !country ||
    price === undefined ||
    bedrooms === undefined ||
    bathrooms === undefined ||
    rooms === undefined ||
    garageSpaces === undefined ||
    coveredAreaM2 === undefined ||
    totalAreaM2 === undefined ||
    (price !== null && !currency) ||
    coordinates === undefined ||
    !locationVisibility
  ) {
    return null;
  }

  const priceAmount = price === null ? null : price * 100;

  if (priceAmount !== null && !Number.isSafeInteger(priceAmount)) {
    return null;
  }

  const wantsPublished = formData.get("isPublished") === "on";
  const isPublished =
    wantsPublished && (status === "available" || status === "reserved");

  return {
    title,
    description: optionalText(formData, "description"),
    operationType,
    propertyType,
    status,
    priceAmount,
    currency,
    address: optionalText(formData, "address"),
    city,
    province,
    country,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    locationVisibility,
    bedrooms,
    bathrooms,
    rooms,
    garageSpaces,
    coveredAreaM2,
    totalAreaM2,
    isPublished,
    isFeatured: formData.get("isFeatured") === "on",
  };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function propertiesPath(organizationSlug: string) {
  return `/admin/${encodeURIComponent(organizationSlug)}/properties`;
}

export async function createProperty(
  organizationSlug: string,
  formData: FormData,
) {
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership) {
    notFound();
  }

  const values = parsePropertyForm(formData);

  if (!values) {
    return { ok: false as const, error: "invalid" };
  }

  let createdProperty: { id: string } | undefined;

  try {
    createdProperty = await db.transaction(async (tx) => {
      const propertyCode = await reservePropertyCode(tx, membership.id);
      const [property] = await tx
        .insert(properties)
        .values({
          organizationId: membership.id,
          propertyCode,
          ...values,
        })
        .returning({ id: properties.id });
      return property;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false as const, error: "code" };
    }
    throw error;
  }

  if (!createdProperty) {
    throw new Error("The property could not be created.");
  }

  revalidatePath(propertiesPath(organizationSlug));
  return { ok: true as const, propertyId: createdProperty.id };
}

export async function updateProperty(
  organizationSlug: string,
  propertyId: string,
  formData: FormData,
) {
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership) {
    notFound();
  }

  const values = parsePropertyForm(formData);
  const editPath = `${propertiesPath(organizationSlug)}/${encodeURIComponent(propertyId)}/edit`;

  if (!values) {
    redirect(`${editPath}?error=invalid`);
  }

  let updated: { id: string }[] = [];
  try {
    updated = await db
      .update(properties)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(properties.id, propertyId),
          eq(properties.organizationId, membership.id),
        ),
      )
      .returning({ id: properties.id });
  } catch (error) {
    if (isUniqueViolation(error)) {
      redirect(`${editPath}?error=code`);
    }
    throw error;
  }

  if (updated.length === 0) {
    notFound();
  }

  revalidatePath(propertiesPath(organizationSlug));
  redirect(propertiesPath(organizationSlug));
}

export async function archiveProperty(
  organizationSlug: string,
  propertyId: string,
) {
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership) {
    notFound();
  }

  const archived = await db
    .update(properties)
    .set({ status: "archived", isPublished: false, updatedAt: new Date() })
    .where(
      and(
        eq(properties.id, propertyId),
        eq(properties.organizationId, membership.id),
      ),
    )
    .returning({ id: properties.id });

  if (archived.length === 0) {
    notFound();
  }

  revalidatePath(propertiesPath(organizationSlug));
  redirect(propertiesPath(organizationSlug));
}

export async function permanentlyDeleteProperty(
  organizationSlug: string,
  propertyId: string,
) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(propertyId)) {
    return { ok: false as const, error: "not-found" as const };
  }

  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);
  if (!membership) return { ok: false as const, error: "not-found" as const };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { ok: false as const, error: "forbidden" as const };
  }

  let deleted: { storagePaths: string[] } | null;
  try {
    deleted = await db.transaction(async (tx) => {
      const [property] = await tx
        .select({ id: properties.id, status: properties.status })
        .from(properties)
        .where(and(
          eq(properties.id, propertyId),
          eq(properties.organizationId, membership.id),
        ))
        .for("update")
        .limit(1);

      if (!property) return null;
      if (property.status !== "archived") return null;

      const images = await tx
        .select({ storagePath: propertyImages.storagePath })
        .from(propertyImages)
        .innerJoin(properties, eq(propertyImages.propertyId, properties.id))
        .where(and(
          eq(properties.id, propertyId),
          eq(properties.organizationId, membership.id),
        ));

      const [removed] = await tx
        .delete(properties)
        .where(and(
          eq(properties.id, propertyId),
          eq(properties.organizationId, membership.id),
        ))
        .returning({ id: properties.id });

      return removed ? { storagePaths: images.map(({ storagePath }) => storagePath) } : null;
    });
  } catch (error) {
    console.error("[property-delete] Database deletion failed", {
      organizationId: membership.id,
      propertyId,
      error,
    });
    return { ok: false as const, error: "delete-failed" as const };
  }

  if (!deleted) {
    const [property] = await db
      .select({ status: properties.status })
      .from(properties)
      .where(and(
        eq(properties.id, propertyId),
        eq(properties.organizationId, membership.id),
      ))
      .limit(1);
    if (!property) return { ok: false as const, error: "not-found" as const };
    return { ok: false as const, error: "not-archived" as const };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (deleted.storagePaths.length > 0 && (!supabaseUrl || !secretKey)) {
    console.error("[property-delete] Storage cleanup is not configured", {
      organizationId: membership.id,
      propertyId,
      pendingStoragePaths: deleted.storagePaths,
    });
  }

  const pendingStoragePaths: string[] = [];
  if (deleted.storagePaths.length > 0 && supabaseUrl && secretKey) {
    try {
      const supabase = createSupabaseClient(supabaseUrl, secretKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });
      for (const storagePath of deleted.storagePaths) {
        try {
          const { error } = await supabase.storage
            .from(PROPERTY_IMAGES_BUCKET)
            .remove([storagePath]);
          if (error) pendingStoragePaths.push(storagePath);
        } catch {
          pendingStoragePaths.push(storagePath);
        }
      }
    } catch {
      pendingStoragePaths.push(...deleted.storagePaths);
    }
  } else {
    pendingStoragePaths.push(...deleted.storagePaths);
  }

  if (pendingStoragePaths.length) {
    console.error("[property-delete] Storage cleanup failed", {
      organizationId: membership.id,
      propertyId,
      pendingStoragePaths,
    });
  }

  const propertiesPathname = propertiesPath(organizationSlug);
  revalidatePath(propertiesPathname);
  revalidatePath(`/${encodeURIComponent(organizationSlug)}`);
  revalidatePath(`/${encodeURIComponent(organizationSlug)}/propiedades`);
  revalidatePath(`/${encodeURIComponent(organizationSlug)}/propiedades/${encodeURIComponent(propertyId)}`);
  revalidatePath("/sitemap.xml");

  return { ok: true as const, storageCleanupPending: pendingStoragePaths.length > 0 };
}
