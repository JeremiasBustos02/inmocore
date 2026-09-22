"use server";

import { notFound } from "next/navigation";
import { geocodeAddress } from "@/lib/geocoding";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";

export async function geocodePropertyAddress(
  organizationSlug: string,
  query: string,
) {
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);
  if (!membership) notFound();

  return geocodeAddress(query);
}

export async function geocodeOrganizationAddress(
  organizationSlug: string,
  query: string,
) {
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    notFound();
  }

  return geocodeAddress(query);
}
