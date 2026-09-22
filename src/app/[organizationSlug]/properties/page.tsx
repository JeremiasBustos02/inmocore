import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizationPublicUrl, getPublicBasePath, getPublicPath } from "@/lib/public-site";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PropertyCard } from "../property-card";
import { PublicFooter } from "../public-footer";
import { PublicHeader } from "../public-header";
import {
  getPublicCities,
  getPublicOrganization,
  getPublicOrganizationAssetUrl,
  getPublicProperties,
  parsePublicPropertyFilters,
  publicFiltersToSearchParams,
} from "../public-data";
import { CatalogFilters, CatalogSort } from "./catalog-filters";

type PublicPropertiesPageProps = {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function hasQueryParameters(searchParams: Record<string, string | string[] | undefined>) {
  return Object.values(searchParams).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined,
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: PublicPropertiesPageProps): Promise<Metadata> {
  const [{ organizationSlug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const organization = await getPublicOrganization(organizationSlug);

  if (!organization) return { robots: { index: false, follow: false } };

  const canonical = getOrganizationPublicUrl(organization, "/properties");
  const hasFilters = hasQueryParameters(rawSearchParams);
  const title = `Propiedades | ${organization.name}`;
  const description = `Propiedades en venta y alquiler publicadas por ${organization.name}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website", ...(canonical ? { url: canonical } : {}) },
    ...(canonical ? { alternates: { canonical } } : {}),
    ...(hasFilters ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function PublicPropertiesPage({
  params,
  searchParams,
}: PublicPropertiesPageProps) {
  const [{ organizationSlug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const organization = await getPublicOrganization(organizationSlug);

  if (!organization) notFound();

  const filters = parsePublicPropertyFilters(rawSearchParams);
  const [result, cities] = await Promise.all([
    getPublicProperties(organization.id, filters),
    getPublicCities(organization.id),
  ]);
  const publicBasePath = getPublicBasePath(organizationSlug, organization.slug);
  const catalogHref = getPublicPath(publicBasePath, "/properties");
  const title = filters.operation === "sale"
    ? "Propiedades en venta"
    : filters.operation === "rent"
      ? "Propiedades en alquiler"
      : "Propiedades";
  const resultLabel = `${result.total} ${result.total === 1 ? "propiedad" : "propiedades"}`;
  const pageHref = (page: number) => {
    const query = publicFiltersToSearchParams(filters, page).toString();
    return query ? `${catalogHref}?${query}` : catalogHref;
  };

  return (
    <div className="public-site flex min-h-screen flex-col overflow-x-hidden">
       <PublicHeader organizationName={organization.name} publicBasePath={publicBasePath} logoUrl={getPublicOrganizationAssetUrl(organization.logoPath)} />
      <main className="flex-1" id="contenido-principal">
        <section className="mx-auto w-full max-w-[1320px] px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
          <div className="max-w-3xl">
            <h1 className="text-balance text-[clamp(2.25rem,4vw,3.75rem)] font-semibold leading-[1.08] tracking-[-0.04em]">
              {title}
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Explorá la oferta disponible de {organization.name}.
            </p>
          </div>

          <div className="mt-9">
            <CatalogFilters
              cities={cities}
              filters={filters}
               publicBasePath={publicBasePath}
            />
          </div>

          <div className="mt-12 flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.025em]">Resultados</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{resultLabel}</p>
            </div>
            <CatalogSort filters={filters} />
          </div>

          {result.properties.length > 0 ? (
            <div className="mt-9 grid gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
              {result.properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  publicBasePath={publicBasePath}
                  property={property}
                />
              ))}
            </div>
          ) : (
            <Empty className="mt-9 min-h-64 bg-muted">
              <EmptyHeader>
                <EmptyTitle className="text-xl font-semibold tracking-[-0.02em]">
                  No encontramos propiedades con esos filtros
                </EmptyTitle>
                <EmptyDescription>
                  Probá ampliando la búsqueda o volviendo al catálogo completo.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link className="public-link text-sm font-semibold" href={catalogHref}>
                  Limpiar filtros
                </Link>
              </EmptyContent>
            </Empty>
          )}

          {result.totalPages > 1 ? (
            <nav
              aria-label="Paginación de propiedades"
              className="mt-16 flex items-center justify-between gap-4 border-t border-border pt-6"
            >
              {result.page > 1 ? (
                <Link className="public-link text-sm font-semibold" href={pageHref(result.page - 1)}>
                  Anterior
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground/50">Anterior</span>
              )}
              <span className="text-sm text-muted-foreground">
                Página {result.page} de {result.totalPages}
              </span>
              {result.page < result.totalPages ? (
                <Link className="public-link text-sm font-semibold" href={pageHref(result.page + 1)}>
                  Siguiente
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground/50">Siguiente</span>
              )}
            </nav>
          ) : null}
        </section>
      </main>
       <PublicFooter
         contactAddress={organization.contactAddress}
         contactEmail={organization.contactEmail}
        contactPhone={organization.contactPhone}
        organizationName={organization.name}
        publicBasePath={publicBasePath}
         whatsappPhone={organization.whatsappPhone}
         logoUrl={getPublicOrganizationAssetUrl(organization.logoPath)}
      />
    </div>
  );
}
