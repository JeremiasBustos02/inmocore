import { and, count, desc, eq, inArray, ne, notExists, sql } from "drizzle-orm";
import {
  Building2,
  CheckCircle2,
  ImageOff,
  MapPin,
  Plus,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/db";
import { properties, propertyImages } from "@/db/schema";
import { PROPERTY_IMAGES_BUCKET } from "@/lib/property-images";
import { createClient } from "@/lib/supabase/server";
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

type DistributionItem = { label: string; value: number };

function DistributionBars({
  items,
  emptyMessage,
}: {
  items: DistributionItem[];
  emptyMessage: string;
}) {
  const maximum = Math.max(...items.map((item) => item.value), 0);
  if (maximum === 0) {
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
          <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-muted">
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

function formatPrice(priceAmount: number | null, currency: "ARS" | "USD" | null) {
  if (priceAmount === null || currency === null) return "Consultar precio";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(priceAmount / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function OrganizationPage({ params }: OrganizationPageProps) {
  const userId = await requireAuthenticatedUserId();
  const { organizationSlug } = await params;
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership) notFound();

  const organizationCondition = eq(properties.organizationId, membership.id);
  const activeCondition = and(organizationCondition, ne(properties.status, "archived"));
  const imagesForProperty = db
    .select({ id: propertyImages.id })
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, properties.id));
  const [metricRows, typeRows, recentRows] = await Promise.all([
    db
      .select({
        active: sql<number>`count(*) filter (where ${properties.status} <> 'archived')`,
        published: sql<number>`count(*) filter (where ${properties.status} <> 'archived' and ${properties.isPublished})`,
        archived: sql<number>`count(*) filter (where ${properties.status} = 'archived')`,
        sale: sql<number>`count(*) filter (where ${properties.status} <> 'archived' and ${properties.operationType} = 'sale')`,
        rent: sql<number>`count(*) filter (where ${properties.status} <> 'archived' and ${properties.operationType} = 'rent')`,
        withoutImages: sql<number>`count(*) filter (where ${properties.status} <> 'archived' and ${notExists(imagesForProperty)})`,
        withoutLocation: sql<number>`count(*) filter (where ${properties.status} <> 'archived' and (${properties.latitude} is null or ${properties.longitude} is null))`,
      })
      .from(properties)
      .where(organizationCondition),
    db
      .select({ type: properties.propertyType, value: count() })
      .from(properties)
      .where(activeCondition)
      .groupBy(properties.propertyType)
      .orderBy(desc(count()))
      .limit(5),
    db
      .select({
        id: properties.id,
        title: properties.title,
        operationType: properties.operationType,
        priceAmount: properties.priceAmount,
        currency: properties.currency,
        status: properties.status,
        updatedAt: properties.updatedAt,
      })
      .from(properties)
      .where(activeCondition)
      .orderBy(desc(properties.updatedAt))
      .limit(5),
  ]);

  const metrics = metricRows[0];
  const recentImages = recentRows.length > 0
    ? await db
        .selectDistinctOn([propertyImages.propertyId], {
          propertyId: propertyImages.propertyId,
          storagePath: propertyImages.storagePath,
        })
        .from(propertyImages)
        .innerJoin(properties, eq(propertyImages.propertyId, properties.id))
        .where(and(
          organizationCondition,
          ne(properties.status, "archived"),
          inArray(propertyImages.propertyId, recentRows.map((property) => property.id)),
        ))
        .orderBy(propertyImages.propertyId, propertyImages.sortOrder, propertyImages.createdAt)
    : [];
  const imagePaths = new Map(recentImages.map((image) => [image.propertyId, image.storagePath]));
  const supabase = recentImages.length > 0 ? await createClient() : null;
  const propertiesHref = `/admin/${encodeURIComponent(organizationSlug)}/properties`;
  const typeDistribution = typeRows.map((row) => ({
    label: propertyTypeLabels[row.type],
    value: Number(row.value),
  }));
  const operationDistribution = [
    { label: operationTypeLabels.sale, value: Number(metrics?.sale ?? 0) },
    { label: operationTypeLabels.rent, value: Number(metrics?.rent ?? 0) },
  ];
  const warnings = [
    {
      label: "sin imágenes",
      value: Number(metrics?.withoutImages ?? 0),
      icon: ImageOff,
    },
    {
      label: "sin ubicación",
      value: Number(metrics?.withoutLocation ?? 0),
      icon: MapPin,
    },
  ].filter((item) => item.value > 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{membership.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">Un resumen claro de tu catálogo.</p>
        </div>
        <Link className={buttonVariants()} href={`${propertiesHref}/new`}>
          <Plus data-icon="inline-start" /> Nueva propiedad
        </Link>
      </header>

      <section aria-label="Resumen de propiedades" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Activas", value: metrics?.active ?? 0, icon: Building2, detail: "No archivadas" },
          { label: "Publicadas", value: metrics?.published ?? 0, icon: Tag, detail: "Visibles en el sitio" },
          { label: "Archivadas", value: metrics?.archived ?? 0, icon: CheckCircle2, detail: "Fuera del catálogo activo" },
        ].map(({ label, value, icon: Icon, detail }) => (
          <article className="flex min-h-36 items-start justify-between rounded-2xl bg-muted/50 p-6" key={label}>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">{Number(value)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </div>
            <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
          </article>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]">
        <section className="rounded-2xl bg-card p-5 sm:p-6" aria-labelledby="catalog-title">
          <h2 className="text-lg font-semibold" id="catalog-title">Estado del catálogo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Distribución de propiedades activas.</p>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium">Por operación</h3>
              <DistributionBars emptyMessage="Todavía no hay propiedades." items={operationDistribution} />
            </div>
            <div>
              <h3 className="text-sm font-medium">Tipos más frecuentes</h3>
              <DistributionBars emptyMessage="Todavía no hay propiedades." items={typeDistribution} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-card p-5 sm:p-6" aria-labelledby="attention-title">
          <h2 className="text-lg font-semibold" id="attention-title">Necesitan atención</h2>
          {warnings.length === 0 ? (
            <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" />
              Tu catálogo está al día.
            </p>
          ) : (
            <ul className="mt-4 divide-y">
              {warnings.map(({ label, value, icon: Icon }) => (
                <li className="flex items-center gap-3 py-4 text-sm" key={label}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span>
                      <strong className="tabular-nums">{value}</strong>{" "}
                      {value === 1 ? "propiedad" : "propiedades"} {label}
                    </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="recent-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" id="recent-title">Propiedades recientes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Últimas actualizadas.</p>
          </div>
          <Link className="text-sm font-medium text-primary hover:underline" href={propertiesHref}>Ver todas</Link>
        </div>
        {recentRows.length === 0 ? (
          <div className="rounded-2xl bg-muted/40 p-6 text-sm text-muted-foreground">
            Todavía no hay propiedades en el catálogo.
          </div>
        ) : (
          <ul className="divide-y rounded-2xl bg-card px-4 sm:px-5">
            {recentRows.map((property) => {
              const imagePath = imagePaths.get(property.id);
              const editHref = `${propertiesHref}/${property.id}/edit`;
              return (
                <li key={property.id}>
                  <Link className="flex min-w-0 items-center gap-3 py-4 sm:gap-4" href={editHref}>
                    {imagePath && supabase ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- Runtime-configured public Storage URL. */
                      <img
                        alt=""
                        className="size-14 shrink-0 rounded-lg object-cover sm:size-16"
                        src={supabase.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(imagePath).data.publicUrl}
                      />
                    ) : (
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted sm:size-16">
                        <Building2 aria-hidden="true" className="size-5 text-muted-foreground" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{property.title}</span>
                      <span className="mt-1 block truncate text-sm text-muted-foreground">
                        {operationTypeLabels[property.operationType]} · {formatPrice(property.priceAmount, property.currency)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge variant={property.status === "draft" ? "outline" : "secondary"}>
                        {propertyStatusLabels[property.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(property.updatedAt)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
