import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { properties, propertyImages } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";
import { archiveProperty, updateProperty } from "../../actions";
import { geocodePropertyAddress } from "../../../geocoding-actions";
import { PropertyForm } from "../../property-form";
import { Button } from "@/components/ui/button";
import { PROPERTY_IMAGES_BUCKET } from "@/lib/property-images";
import { createClient } from "@/lib/supabase/server";
import { PropertyImages } from "./property-images";

type EditPropertyPageProps = {
  params: Promise<{ organizationSlug: string; propertyId: string }>;
  searchParams: Promise<{ created?: string; error?: string }>;
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

  const images = await db
    .select({
      id: propertyImages.id,
      storagePath: propertyImages.storagePath,
    })
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, property.id))
    .orderBy(asc(propertyImages.sortOrder), asc(propertyImages.createdAt));
  const supabase = await createClient();
  const imagesWithUrls = images.map((image) => ({
    id: image.id,
    publicUrl: supabase.storage
      .from(PROPERTY_IMAGES_BUCKET)
      .getPublicUrl(image.storagePath).data.publicUrl,
  }));

  const { created, error } = await searchParams;
  const propertiesHref = `/admin/${encodeURIComponent(organizationSlug)}/properties`;
  const updateAction = updateProperty.bind(null, organizationSlug, propertyId);
  const archiveAction = archiveProperty.bind(null, organizationSlug, propertyId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{membership.name}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Editar propiedad</h1>
          <p className="text-sm text-muted-foreground">Actualizá los datos y las imágenes de la propiedad.</p>
      </header>
      {created === "1" ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300" role="status">
          Propiedad creada. Ahora podés agregar imágenes y completar los detalles.
        </div>
      ) : null}
      <PropertyForm
        action={updateAction}
        cancelHref={propertiesHref}
        error={error}
        geocodeAction={geocodePropertyAddress.bind(null, organizationSlug)}
        initialValues={property}
        markerColor={membership.primaryColor}
        organizationCoordinates={membership.contactLatitude !== null && membership.contactLongitude !== null
          ? { latitude: membership.contactLatitude, longitude: membership.contactLongitude }
          : null}
        submitLabel="Guardar cambios"
      />
      <PropertyImages
        images={imagesWithUrls}
        organizationId={membership.id}
        organizationSlug={organizationSlug}
        propertyId={property.id}
        propertyTitle={property.title}
      />
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
