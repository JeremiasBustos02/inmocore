import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, organizations } from "@/db/schema";

export function getAccessibleOrganizations(userId: string) {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(
      organizations,
      eq(memberships.organizationId, organizations.id),
    )
    .where(eq(memberships.userId, userId))
    .orderBy(organizations.name);
}

export async function requireOrganizationMembership(
  userId: string,
  organizationSlug: string,
) {
  const [membership] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      whatsappPhone: organizations.whatsappPhone,
      contactAddress: organizations.contactAddress,
      contactEmail: organizations.contactEmail,
      contactPhone: organizations.contactPhone,
      logoPath: organizations.logoPath,
      primaryColor: organizations.primaryColor,
      heroImagePath: organizations.heroImagePath,
      heroTitle: organizations.heroTitle,
      heroSubtitle: organizations.heroSubtitle,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(
      organizations,
      eq(memberships.organizationId, organizations.id),
    )
    .where(
      and(
        eq(memberships.userId, userId),
        eq(organizations.slug, organizationSlug),
      ),
    )
    .limit(1);

  return membership ?? null;
}
