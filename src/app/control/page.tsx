import { asc, count, eq } from "drizzle-orm";
import Link from "next/link";
import { Building2, ExternalLink, Plus } from "lucide-react";
import { db } from "@/db";
import { organizations, properties } from "@/db/schema";
import { Button } from "@/components/ui/button";

export default async function ControlPage() {
  const organizationRows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      isDemo: organizations.isDemo,
      siteVariant: organizations.siteVariant,
      customDomain: organizations.customDomain,
      propertyCount: count(properties.id),
    })
    .from(organizations)
    .leftJoin(properties, eq(properties.organizationId, organizations.id))
    .groupBy(organizations.id)
    .orderBy(asc(organizations.name));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">CONTROL</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Inmobiliarias</h1>
          <p className="mt-2 text-sm text-muted-foreground">Administrá las organizaciones de la plataforma.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/control/organizations/new" />}>
          <Plus aria-hidden="true" />
          Nueva inmobiliaria
        </Button>
      </div>

      {organizationRows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border bg-background">
          <div className="hidden grid-cols-[minmax(0,1.3fr)_0.7fr_0.8fr_0.8fr_1fr_auto] gap-4 border-b bg-muted/40 px-5 py-3 text-xs font-semibold text-muted-foreground md:grid">
            <span>Organización</span>
            <span>Estado</span>
            <span>Variante</span>
            <span>Propiedades</span>
            <span>Dominio</span>
            <span className="sr-only">Acciones</span>
          </div>
          <ul>
            {organizationRows.map((organization) => (
              <li className="border-b last:border-b-0" key={organization.id}>
                <div className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1.3fr)_0.7fr_0.8fr_0.8fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{organization.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{organization.slug}</p>
                  </div>
                  <p className="text-sm">
                    <span className={organization.isDemo ? "text-amber-700" : "text-emerald-700"}>
                      {organization.isDemo ? "Demo" : "Activa"}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{organization.siteVariant}</p>
                  <p className="text-sm text-muted-foreground">{organization.propertyCount}</p>
                  <p className="truncate text-sm text-muted-foreground">{organization.customDomain ?? "Sin dominio"}</p>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button nativeButton={false} render={<Link href={`/control/organizations/${organization.id}`} />} size="sm" variant="outline">
                      <Building2 aria-hidden="true" />
                      Abrir
                    </Button>
                    <Button nativeButton={false} render={<Link href={`/${encodeURIComponent(organization.slug)}`} />} size="sm" variant="ghost">
                      <ExternalLink aria-hidden="true" />
                      Ver sitio
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border bg-background px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">Todavía no hay organizaciones</h2>
          <p className="mt-2 text-sm text-muted-foreground">Creá la primera inmobiliaria desde este panel.</p>
        </div>
      )}
    </div>
  );
}
