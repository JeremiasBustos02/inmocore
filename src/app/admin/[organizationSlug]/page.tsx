import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  Eye,
  Home,
  ImageOff,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { properties, propertyImages } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";
import {
  operationTypeLabels,
  propertyStatusLabels,
  propertyTypeLabels,
} from "./properties/property-options";

type OrganizationPageProps = {
  params: Promise<{ organizationSlug: string }>;
};

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

type BarItem = {
  label: string;
  value: number;
};

function DistributionBars({ items, emptyMessage }: { items: BarItem[]; emptyMessage: string }) {
  const maximum = Math.max(...items.map((item) => item.value), 0);

  if (items.length === 0 || maximum === 0) {
    return <p className="mt-5 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      {items.map((item) => (
        <div className="flex flex-col gap-1.5" key={item.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{item.label}</span>
            <span className="font-semibold tabular-nums">{item.value}</span>
          </div>
          <div
            aria-hidden="true"
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(item.value / maximum) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatMonth(month: string) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

export default async function OrganizationPage({
  params,
}: OrganizationPageProps) {
  const userId = await requireAuthenticatedUserId();
  const { organizationSlug } = await params;
  const membership = await requireOrganizationMembership(
    userId,
    organizationSlug,
  );

  if (!membership) {
    notFound();
  }

  const now = new Date();
  const currentMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const sixMonthsAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
  );
  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const organizationCondition = eq(properties.organizationId, membership.id);
  const [propertyMetricRows, monthlyCreationRows, typeRows, cityRows] = await Promise.all([
    db
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
        createdLast30Days: sql<number>`count(*) filter (where ${gte(properties.createdAt, thirtyDaysAgo)})`,
        withoutImages: sql<number>`count(*) filter (where not exists (
           select 1 from ${propertyImages}
           where ${propertyImages.propertyId} = ${properties.id}
         ))`,
      })
      .from(properties)
      .where(organizationCondition),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${properties.createdAt} at time zone 'UTC'), 'YYYY-MM')`,
        count: sql<number>`count(*)`,
      })
      .from(properties)
      .where(
        and(
          organizationCondition,
          gte(properties.createdAt, sixMonthsAgo),
          lt(properties.createdAt, nextMonthStart),
        ),
      )
      .groupBy(sql`date_trunc('month', ${properties.createdAt} at time zone 'UTC')`)
      .orderBy(sql`date_trunc('month', ${properties.createdAt} at time zone 'UTC')`),
    db
      .select({
        type: properties.propertyType,
        count: sql<number>`count(*)`,
      })
      .from(properties)
      .where(organizationCondition)
      .groupBy(properties.propertyType)
      .orderBy(desc(sql<number>`count(*)`)),
    db
      .select({
        city: properties.city,
        count: sql<number>`count(*)`,
      })
      .from(properties)
      .where(organizationCondition)
      .groupBy(properties.city)
      .orderBy(desc(sql<number>`count(*)`))
      .limit(6),
  ]);
  const [propertyMetrics] = propertyMetricRows;

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
    createdLast30Days: Number(propertyMetrics?.createdLast30Days ?? 0),
    withoutImages: Number(propertyMetrics?.withoutImages ?? 0),
  };

  const monthlyCreation = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(
      Date.UTC(
        currentMonthStart.getUTCFullYear(),
        currentMonthStart.getUTCMonth() - (5 - index),
        1,
      ),
    );
    const month = monthDate.toISOString().slice(0, 7);
    const row = monthlyCreationRows.find((item) => item.month === month);

    return { label: formatMonth(month), value: Number(row?.count ?? 0) };
  });

  const typeDistribution = typeRows.map((row) => ({
    label: propertyTypeLabels[row.type],
    value: Number(row.count),
  }));
  const cityDistribution = cityRows.map((row) => ({
    label: row.city,
    value: Number(row.count),
  }));

  const propertiesHref = `/admin/${encodeURIComponent(organizationSlug)}/properties`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Resumen general de tu inmobiliaria.</p>
        </div>
      </header>

      <section aria-labelledby="metrics-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" id="metrics-title">Vista general</h2>
            <p className="mt-1 text-sm text-muted-foreground">Indicadores actuales de tu inventario.</p>
          </div>
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

      <section aria-labelledby="trends-title">
        <div className="mb-4">
          <h2 className="text-lg font-semibold" id="trends-title">Evolución y composición</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Incorporación y distribución actual del inventario. Los estados no representan historial.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <section className="rounded-xl border bg-card p-5" aria-labelledby="creation-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold" id="creation-title">Nuevas propiedades</h3>
                <p className="mt-1 text-sm text-muted-foreground">Altas por mes, últimos seis meses.</p>
              </div>
              <Badge variant="secondary">{metrics.createdLast30Days} últimos 30 días</Badge>
            </div>
            <div className="mt-6 grid min-h-48 grid-cols-6 items-end gap-2 sm:gap-4" role="img" aria-label="Propiedades creadas por mes en los últimos seis meses">
              {monthlyCreation.map((month) => {
                const maximum = Math.max(...monthlyCreation.map((item) => item.value), 1);
                const height = month.value === 0 ? 4 : Math.max((month.value / maximum) * 100, 8);

                return (
                  <div className="flex h-48 min-w-0 flex-col items-center justify-end gap-2" key={month.label}>
                    <span className="text-sm font-semibold tabular-nums">{month.value}</span>
                    <div className="flex h-32 w-full items-end rounded-md bg-muted/60" aria-hidden="true">
                      <div className="w-full rounded-md bg-primary" style={{ height: `${height}%` }} />
                    </div>
                    <span className="text-center text-xs text-muted-foreground">{month.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5" aria-labelledby="operation-title">
            <div>
              <h3 className="text-lg font-semibold" id="operation-title">Por operación</h3>
              <p className="mt-1 text-sm text-muted-foreground">Composición actual del inventario.</p>
            </div>
            <DistributionBars
              emptyMessage="Todavía no hay propiedades para distribuir."
              items={[
                { label: operationTypeLabels.sale, value: metrics.sale },
                { label: operationTypeLabels.rent, value: metrics.rent },
              ]}
            />
          </section>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2" aria-label="Distribución por tipo y localidad">
        <section className="rounded-xl border bg-card p-5" aria-labelledby="type-title">
          <h3 className="text-lg font-semibold" id="type-title">Por tipo</h3>
          <p className="mt-1 text-sm text-muted-foreground">Qué clases de propiedades concentran la oferta.</p>
          <DistributionBars emptyMessage="Todavía no hay propiedades para distribuir." items={typeDistribution} />
        </section>
        <section className="rounded-xl border bg-card p-5" aria-labelledby="city-title">
          <h3 className="text-lg font-semibold" id="city-title">Por localidad</h3>
          <p className="mt-1 text-sm text-muted-foreground">Las seis localidades con más propiedades.</p>
          <DistributionBars emptyMessage="Todavía no hay localidades para mostrar." items={cityDistribution} />
        </section>
      </section>

    </main>
  );
}
