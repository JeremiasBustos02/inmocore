import { count, eq, sql } from "drizzle-orm";
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Eye,
  Home,
  ImageOff,
  List,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { logout } from "@/app/auth-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { properties, propertyImages } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";
import { updateOrganizationWhatsApp } from "./actions";
import { propertyStatusLabels } from "./properties/property-options";

type OrganizationPageProps = {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<{ whatsapp?: string }>;
};

const roleLabels = {
  owner: "Propietario",
  admin: "Administrador",
  agent: "Agente",
} as const;

type MetricCardProps = {
  label: string;
  value: number;
  detail?: string;
  icon: typeof Building2;
};

function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <article className="flex min-h-32 flex-col justify-between rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon aria-hidden="true" className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </article>
  );
}

export default async function OrganizationPage({
  params,
  searchParams,
}: OrganizationPageProps) {
  const userId = await requireAuthenticatedUserId();
  const [{ organizationSlug }, { whatsapp }] = await Promise.all([params, searchParams]);
  const membership = await requireOrganizationMembership(
    userId,
    organizationSlug,
  );

  if (!membership) {
    notFound();
  }

  const [propertyMetrics] = await db
    .select({
      total: count(),
      published: sql<number>`count(*) filter (where ${properties.isPublished})`,
      unpublished: sql<number>`count(*) filter (where not ${properties.isPublished})`,
      available: sql<number>`count(*) filter (where ${properties.status} = 'available')`,
      draft: sql<number>`count(*) filter (where ${properties.status} = 'draft')`,
      reserved: sql<number>`count(*) filter (where ${properties.status} = 'reserved')`,
      sold: sql<number>`count(*) filter (where ${properties.status} = 'sold')`,
      rented: sql<number>`count(*) filter (where ${properties.status} = 'rented')`,
      archived: sql<number>`count(*) filter (where ${properties.status} = 'archived')`,
      sale: sql<number>`count(*) filter (where ${properties.operationType} = 'sale')`,
      rent: sql<number>`count(*) filter (where ${properties.operationType} = 'rent')`,
      withoutImages: sql<number>`count(*) filter (where not exists (
        select 1 from ${propertyImages}
        where ${propertyImages.propertyId} = ${properties.id}
      ))`,
    })
    .from(properties)
    .where(eq(properties.organizationId, membership.id));

  const metrics = {
    total: Number(propertyMetrics?.total ?? 0),
    published: Number(propertyMetrics?.published ?? 0),
    unpublished: Number(propertyMetrics?.unpublished ?? 0),
    available: Number(propertyMetrics?.available ?? 0),
    draft: Number(propertyMetrics?.draft ?? 0),
    reserved: Number(propertyMetrics?.reserved ?? 0),
    sold: Number(propertyMetrics?.sold ?? 0),
    rented: Number(propertyMetrics?.rented ?? 0),
    archived: Number(propertyMetrics?.archived ?? 0),
    sale: Number(propertyMetrics?.sale ?? 0),
    rent: Number(propertyMetrics?.rent ?? 0),
    withoutImages: Number(propertyMetrics?.withoutImages ?? 0),
  };

  const propertiesHref = `/admin/${encodeURIComponent(organizationSlug)}/properties`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Panel de administración</p>
          <h1 className="text-3xl font-semibold tracking-tight">{membership.name}</h1>
          <p className="text-sm text-muted-foreground">
            {roleLabels[membership.role]} · Resumen de propiedades
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className={buttonVariants({ variant: "outline" })} href={`/${encodeURIComponent(organizationSlug)}`}>
            <ExternalLink data-icon="inline-start" /> Ver sitio público
          </Link>
          <form action={logout}>
            <Button variant="outline" type="submit">Cerrar sesión</Button>
          </form>
        </div>
      </header>

      <section aria-labelledby="metrics-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" id="metrics-title">Vista general</h2>
            <p className="mt-1 text-sm text-muted-foreground">Indicadores actuales de tu inventario.</p>
          </div>
          <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={propertiesHref}>
            <List data-icon="inline-start" /> Ver todas
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard icon={Building2} label="Propiedades totales" value={metrics.total} />
          <MetricCard icon={Eye} label="Publicadas" value={metrics.published} detail="Visibles en el sitio público" />
          <MetricCard icon={CheckCircle2} label="Disponibles" value={metrics.available} detail="Listas para operar" />
          <MetricCard icon={CircleAlert} label="Sin publicar" value={metrics.unpublished} detail="Requieren revisión" />
          <MetricCard icon={Home} label="En venta" value={metrics.sale} />
          <MetricCard icon={Home} label="En alquiler" value={metrics.rent} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <section className="rounded-xl border bg-card p-5" aria-labelledby="status-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold" id="status-title">Estado del inventario</h2>
              <p className="mt-1 text-sm text-muted-foreground">Resumen para priorizar el trabajo operativo.</p>
            </div>
            <Badge variant="secondary">{metrics.total} total</Badge>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {([
              ["available", metrics.available],
              ["draft", metrics.draft],
              ["reserved", metrics.reserved],
              ["sold", metrics.sold],
              ["rented", metrics.rented],
              ["archived", metrics.archived],
            ] as const).map(([status, value]) => (
              <div className="flex items-center justify-between gap-3 border-b pb-3" key={status}>
                <dt className="text-sm text-muted-foreground">{propertyStatusLabels[status]}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border bg-card p-5" aria-labelledby="actions-title">
          <h2 className="text-lg font-semibold" id="actions-title">Acciones rápidas</h2>
          <div className="mt-4 flex flex-col gap-2">
            <Link className={buttonVariants({ variant: "default" })} href={`${propertiesHref}/new`}>
              <Plus data-icon="inline-start" /> Nueva propiedad
            </Link>
            <Link className={buttonVariants({ variant: "outline" })} href={propertiesHref}>
              <List data-icon="inline-start" /> Ver propiedades
            </Link>
          </div>
          {metrics.withoutImages > 0 ? (
            <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
              <ImageOff aria-hidden="true" />
              {metrics.withoutImages} {metrics.withoutImages === 1 ? "propiedad no tiene" : "propiedades no tienen"} imágenes.
            </p>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">Todas las propiedades tienen imágenes.</p>
          )}
        </section>
      </div>

      {membership.role === "owner" || membership.role === "admin" ? (
        <section className="rounded-xl border bg-card p-6" aria-labelledby="whatsapp-title">
            <h2 className="text-xl font-semibold" id="whatsapp-title">
              Contacto por WhatsApp
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Guardá el número en formato internacional, sólo con dígitos. Ejemplo: 5492266XXXXXX.
            </p>
            <form action={updateOrganizationWhatsApp.bind(null, organizationSlug)} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-sm">
                <label className="text-sm font-medium" htmlFor="whatsappPhone">
                  Número de WhatsApp
                </label>
                <input
                  autoComplete="tel"
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  defaultValue={membership.whatsappPhone ?? ""}
                  id="whatsappPhone"
                  inputMode="tel"
                  maxLength={20}
                  name="whatsappPhone"
                  placeholder="5492266XXXXXX"
                  type="tel"
                />
              </div>
              <Button type="submit">Guardar número</Button>
            </form>
            {whatsapp === "saved" ? (
              <p className="mt-3 text-sm text-muted-foreground" role="status">Número actualizado.</p>
            ) : whatsapp === "invalid" ? (
              <p className="mt-3 text-sm text-destructive" role="alert">Ingresá entre 8 y 15 dígitos.</p>
            ) : null}
        </section>
      ) : null}
    </main>
  );
}
