"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";
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
  const reference = requiredText(formData, "reference");
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

  if (
    !reference ||
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
    (price !== null && !currency)
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
    reference,
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
    redirect(`${propertiesPath(organizationSlug)}/new?error=invalid`);
  }

  let duplicateReference = false;

  try {
    await db.insert(properties).values({
      organizationId: membership.id,
      ...values,
    });
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
    duplicateReference = true;
  }

  if (duplicateReference) {
    redirect(`${propertiesPath(organizationSlug)}/new?error=reference`);
  }

  revalidatePath(propertiesPath(organizationSlug));
  redirect(propertiesPath(organizationSlug));
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
  let duplicateReference = false;

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
    if (!isUniqueViolation(error)) {
      throw error;
    }
    duplicateReference = true;
  }

  if (duplicateReference) {
    redirect(`${editPath}?error=reference`);
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
