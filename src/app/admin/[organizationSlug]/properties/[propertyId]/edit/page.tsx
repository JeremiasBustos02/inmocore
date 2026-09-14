import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";
import { archiveProperty, updateProperty } from "../../actions";
import { PropertyForm } from "../../property-form";
import { Button } from "@/components/ui/button";

type EditPropertyPageProps = {
  params: Promise<{ organizationSlug: string; propertyId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditPropertyPage({ params, searchParams }: EditPropertyPageProps) {
  const userId = await requireAuthenticatedUserId();
  const { organizationSlug, propertyId } = await params;
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership) {
    notFound();
  }

  const [property] = await db
    .select()
    .from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, membership.id)))
    .limit(1);

  if (!property) {
    notFound();
  }

  const { error } = await searchParams;
  const propertiesHref = `/admin/${encodeURIComponent(organizationSlug)}/properties`;
  const updateAction = updateProperty.bind(null, organizationSlug, propertyId);
  const archiveAction = archiveProperty.bind(null, organizationSlug, propertyId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{membership.name}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Editar propiedad</h1>
      </header>
      <PropertyForm action={updateAction} cancelHref={propertiesHref} error={error} initialValues={property} submitLabel="Guardar cambios" />
      {property.status !== "archived" ? (
        <section className="flex flex-col gap-3 border-t pt-6">
          <h2 className="font-medium">Archivar propiedad</h2>
          <p className="text-sm text-muted-foreground">La propiedad dejará de estar publicada y seguirá disponible en el historial.</p>
          <form action={archiveAction}>
            <Button variant="destructive" type="submit">Archivar</Button>
          </form>
        </section>
      ) : null}
    </main>
  );
}
