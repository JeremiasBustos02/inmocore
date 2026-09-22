import { sql } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { formatPropertyCode } from "@/lib/property-code-format";

type PropertyCodeTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function reservePropertyCode(
  tx: PropertyCodeTransaction,
  organizationId: string,
) {
  const [organization] = await tx
    .update(organizations)
    .set({ propertyCodeSequence: sql`${organizations.propertyCodeSequence} + 1` })
    .where(sql`${organizations.id} = ${organizationId}`)
    .returning({
      prefix: organizations.propertyCodePrefix,
      sequence: organizations.propertyCodeSequence,
    });

  if (!organization) {
    throw new Error("The organization could not reserve a property code.");
  }

  return formatPropertyCode(organization.prefix, organization.sequence);
}
