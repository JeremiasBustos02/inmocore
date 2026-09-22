"use server";

import { notFound } from "next/navigation";
import { geocodeAddress } from "@/lib/geocoding";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";

export async function geocodePropertyAddress(
  organizationSlug: string,
  query: string | { address?: string; city?: string; province?: string; country?: string },
) {
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);
  if (!membership) notFound();

  const coordinates = membership.contactLatitude !== null && membership.contactLongitude !== null
    ? { latitude: membership.contactLatitude, longitude: membership.contactLongitude }
    : null;
  return geocodeAddress(query, coordinates);
}

export async function geocodeOrganizationAddress(
  organizationSlug: string,
  query: string | { address?: string; city?: string; province?: string; country?: string },
) {
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    notFound();
  }

  const coordinates = membership.contactLatitude !== null && membership.contactLongitude !== null
    ? { latitude: membership.contactLatitude, longitude: membership.contactLongitude }
    : null;
  return geocodeAddress(query, coordinates);
}
