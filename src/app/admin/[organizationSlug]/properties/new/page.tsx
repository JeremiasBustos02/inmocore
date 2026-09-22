import { notFound } from "next/navigation";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";
import { createProperty } from "../actions";
import { geocodePropertyAddress } from "../../geocoding-actions";
import { PropertyForm } from "../property-form";

type NewPropertyPageProps = {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function NewPropertyPage({ params, searchParams }: NewPropertyPageProps) {
  const userId = await requireAuthenticatedUserId();
  const { organizationSlug } = await params;
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership) {
    notFound();
  }

  const { error } = await searchParams;
  const propertiesHref = `/admin/${encodeURIComponent(organizationSlug)}/properties`;
  const action = createProperty.bind(null, organizationSlug);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{membership.name}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Nueva propiedad</h1>
          <p className="text-sm text-muted-foreground">Cargá una propiedad al inventario.</p>
      </header>
      <PropertyForm
        action={action}
        cancelHref={propertiesHref}
        error={error}
        geocodeAction={geocodePropertyAddress.bind(null, organizationSlug)}
        markerColor={membership.primaryColor}
        organizationCoordinates={membership.contactLatitude !== null && membership.contactLongitude !== null
          ? { latitude: membership.contactLatitude, longitude: membership.contactLongitude }
          : null}
        pendingLabel="Creando…"
        submitLabel="Crear propiedad y continuar"
      />
    </main>
  );
}
