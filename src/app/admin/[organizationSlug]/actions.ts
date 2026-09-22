"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";
import { parseCoordinates } from "@/lib/location";
import {
  MAX_ORGANIZATION_ASSET_SIZE,
  ORGANIZATION_ASSETS_BUCKET,
  ORGANIZATION_ASSET_EXTENSIONS,
  type OrganizationAssetType,
} from "@/lib/organization-assets";
import { createClient } from "@/lib/supabase/server";

function adminOrganizationPath(organizationSlug: string) {
  return `/admin/${encodeURIComponent(organizationSlug)}/organization`;
}

export async function updateOrganizationWhatsApp(
  organizationSlug: string,
  formData: FormData,
) {
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    notFound();
  }

  const rawPhone = formData.get("whatsappPhone");
  const whatsappPhone =
    typeof rawPhone === "string"
      ? rawPhone.trim().replace(/[+().\s-]/g, "")
      : "";

  if (whatsappPhone && !/^\d{8,15}$/.test(whatsappPhone)) {
    redirect(`${adminOrganizationPath(organizationSlug)}?whatsapp=invalid`);
  }

  await db
    .update(organizations)
    .set({ whatsappPhone: whatsappPhone || null, updatedAt: new Date() })
    .where(eq(organizations.id, membership.id));

  revalidatePath(`/${encodeURIComponent(organizationSlug)}`);
  revalidatePath(`/admin/${encodeURIComponent(organizationSlug)}`);
  revalidatePath(adminOrganizationPath(organizationSlug));
  redirect(`${adminOrganizationPath(organizationSlug)}?whatsapp=saved`);
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSET_PATH_PATTERN =
  /^[0-9a-f-]{36}\/(logo|hero)\/[0-9a-f-]{36}\.webp$/i;

function readOptionalText(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export async function updateOrganizationSettings(
  organizationSlug: string,
  formData: FormData,
) {
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    notFound();
  }

  const rawColor = formData.get("primaryColor");
  const primaryColor =
    typeof rawColor === "string" && rawColor.trim()
      ? rawColor.trim().toLowerCase()
      : null;
  const contactEmail = readOptionalText(formData, "contactEmail", 254)?.toLowerCase() ?? null;
  const contactPhone = readOptionalText(formData, "contactPhone", 30);
  const contactAddress = readOptionalText(formData, "contactAddress", 180);
  const contactHours = readOptionalText(formData, "contactHours", 1000);
  const heroTitle = readOptionalText(formData, "heroTitle", 120);
  const heroSubtitle = readOptionalText(formData, "heroSubtitle", 240);
  const whatsappPhone = readOptionalText(formData, "whatsappPhone", 20)?.replace(/[+().\s-]/g, "") ?? null;
  const coordinates = parseCoordinates(
    formData.get("latitude"),
    formData.get("longitude"),
  );

  if (primaryColor && !HEX_COLOR_PATTERN.test(primaryColor)) {
    redirect(`${adminOrganizationPath(organizationSlug)}?settings=invalid-color`);
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    redirect(`${adminOrganizationPath(organizationSlug)}?settings=invalid-email`);
  }
  if (contactPhone && !/^\+?[\d\s().-]{8,30}$/.test(contactPhone)) {
    redirect(`${adminOrganizationPath(organizationSlug)}?settings=invalid-phone`);
  }
  if (whatsappPhone && !/^\d{8,15}$/.test(whatsappPhone)) {
    redirect(`${adminOrganizationPath(organizationSlug)}?settings=invalid-whatsapp`);
  }
  if (coordinates === undefined) {
    redirect(`${adminOrganizationPath(organizationSlug)}?settings=invalid-location`);
  }

  await db
    .update(organizations)
    .set({
      whatsappPhone,
      contactEmail,
      contactPhone,
      contactAddress,
      contactHours,
      contactLatitude: coordinates?.latitude ?? null,
      contactLongitude: coordinates?.longitude ?? null,
      primaryColor,
      heroTitle,
      heroSubtitle,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, membership.id));

  revalidatePath(`/${encodeURIComponent(organizationSlug)}`);
  revalidatePath(`/admin/${encodeURIComponent(organizationSlug)}`);
  revalidatePath(adminOrganizationPath(organizationSlug));
  redirect(`${adminOrganizationPath(organizationSlug)}?settings=saved`);
}

export async function updateOrganizationAsset(
  organizationSlug: string,
  assetType: OrganizationAssetType,
  storagePath: string,
) {
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    notFound();
  }
  if (!UUID_PATTERN.test(membership.id) || !ASSET_PATH_PATTERN.test(storagePath)) {
    return { ok: false, error: "La ruta del asset no es válida." } as const;
  }

  const [organization] = await db
    .select({ logoPath: organizations.logoPath, heroImagePath: organizations.heroImagePath })
    .from(organizations)
    .where(eq(organizations.id, membership.id))
    .limit(1);
  const expectedPrefix = `${membership.id}/${assetType}/`;
  if (!storagePath.startsWith(expectedPrefix)) {
    return { ok: false, error: "El asset no pertenece a esta organización." } as const;
  }

  const supabase = await createClient();
  const filename = storagePath.split("/").pop() ?? "";
  const { data: files, error: storageError } = await supabase.storage
    .from(ORGANIZATION_ASSETS_BUCKET)
    .list(`${membership.id}/${assetType}`, { limit: 10, search: filename });
  const uploadedFile = files?.find((file) => file.name === filename);
  const metadata = uploadedFile?.metadata;
  const mimeType = typeof metadata?.mimetype === "string" ? metadata.mimetype : null;
  const fileSize = typeof metadata?.size === "number" ? metadata.size : null;
  if (
    storageError ||
    !uploadedFile ||
    !mimeType ||
    !(mimeType in ORGANIZATION_ASSET_EXTENSIONS) ||
    fileSize === null ||
    fileSize > MAX_ORGANIZATION_ASSET_SIZE
  ) {
    return { ok: false, error: "El archivo no cumple los requisitos de imagen." } as const;
  }

  const previousPath = assetType === "logo" ? organization?.logoPath : organization?.heroImagePath;
  const update = assetType === "logo"
    ? { logoPath: storagePath, updatedAt: new Date() }
    : { heroImagePath: storagePath, updatedAt: new Date() };

  try {
    await db.update(organizations).set(update).where(eq(organizations.id, membership.id));
  } catch {
    return { ok: false, error: "No se pudo guardar la referencia del asset." } as const;
  }

  if (previousPath && previousPath !== storagePath) {
    await supabase.storage.from(ORGANIZATION_ASSETS_BUCKET).remove([previousPath]);
  }

  revalidatePath(`/${encodeURIComponent(organizationSlug)}`);
  revalidatePath(adminOrganizationPath(organizationSlug));
  return { ok: true } as const;
}
