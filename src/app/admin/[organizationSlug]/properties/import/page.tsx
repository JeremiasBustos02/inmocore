import { notFound } from "next/navigation";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";
import { PropertyImportClient } from "../import-client";

export default async function PropertyImportPage({ params }: { params: Promise<{ organizationSlug: string }> }) {
  const { organizationSlug } = await params;
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) notFound();
  return <PropertyImportClient organizationSlug={organizationSlug} />;
}
