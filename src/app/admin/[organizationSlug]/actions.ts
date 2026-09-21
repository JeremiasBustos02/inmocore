"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";

function adminOrganizationPath(organizationSlug: string) {
  return `/admin/${encodeURIComponent(organizationSlug)}`;
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
  revalidatePath(adminOrganizationPath(organizationSlug));
  redirect(`${adminOrganizationPath(organizationSlug)}?whatsapp=saved`);
}
