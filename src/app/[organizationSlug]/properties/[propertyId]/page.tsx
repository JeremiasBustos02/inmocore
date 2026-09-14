import type { Metadata } from "next";
import { ArrowLeft, House } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFooter } from "../../public-footer";
import { PublicHeader } from "../../public-header";
import { getPublicOrganization, getPublicPropertyDetail } from "../../public-data";
import {
  formatPublicPrice,
  publicOperationLabels,
  publicPropertyTypeLabels,
} from "../../public-property-options";

type PublicPropertyPageProps = {
  params: Promise<{ organizationSlug: string; propertyId: string }>;
};

export async function generateMetadata({
  params,
}: PublicPropertyPageProps): Promise<Metadata> {
  const { organizationSlug, propertyId } = await params;
  const organization = await getPublicOrganization(organizationSlug);

  if (!organization) return {};

  const property = await getPublicPropertyDetail(organization.id, propertyId);
  if (!property) return {};

  const description = property.description
    ?.replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);

  return {
    title: `${property.title} | ${organization.name}`,
    description: description || `${property.title} en ${property.city}.`,
  };
}

export default async function PublicPropertyPage({ params }: PublicPropertyPageProps) {
  const { organizationSlug, propertyId } = await params;
  const organization = await getPublicOrganization(organizationSlug);

  if (!organization) notFound();

  const property = await getPublicPropertyDetail(organization.id, propertyId);
  if (!property) notFound();

  const catalogHref = `/${encodeURIComponent(organization.slug)}/properties`;
  const features = [
    property.rooms !== null
      ? { label: property.rooms === 1 ? "Ambiente" : "Ambientes", value: property.rooms }
      : null,
    property.bedrooms !== null
      ? { label: property.bedrooms === 1 ? "Dormitorio" : "Dormitorios", value: property.bedrooms }
      : null,
    property.bathrooms !== null
      ? { label: property.bathrooms === 1 ? "Baño" : "Baños", value: property.bathrooms }
      : null,
    property.garageSpaces !== null
      ? { label: property.garageSpaces === 1 ? "Cochera" : "Cocheras", value: property.garageSpaces }
      : null,
    property.coveredAreaM2 !== null
      ? { label: "Superficie cubierta", value: `${property.coveredAreaM2} m²` }
      : null,
    property.totalAreaM2 !== null
      ? { label: "Superficie total", value: `${property.totalAreaM2} m²` }
      : null,
  ].filter((feature) => feature !== null);
  const location = [
    property.address,
    property.city,
    property.province,
    property.country !== "Argentina" ? property.country : null,
  ].filter((value): value is string => Boolean(value));
  const [mainImage, ...secondaryImages] = property.images;

  return (
    <div className="public-site flex min-h-screen flex-col overflow-x-hidden">
      <PublicHeader organizationName={organization.name} organizationSlug={organization.slug} />
      <main className="flex-1" id="contenido-principal">
        <article className="mx-auto w-full max-w-[1320px] px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
          <Link className="public-link inline-flex items-center gap-2 text-sm font-semibold" href={catalogHref}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Volver a propiedades
          </Link>

          <div className="mt-7">
            {mainImage ? (
              <div
                className={
                  secondaryImages.length > 0
                    ? "grid gap-2 lg:h-[520px] lg:grid-cols-[2fr_1fr]"
                    : "relative aspect-[4/3] max-h-[680px] overflow-hidden rounded-xl bg-muted sm:aspect-[16/9]"
                }
              >
                <div className={secondaryImages.length > 0
                  ? "relative aspect-[4/3] overflow-hidden rounded-xl bg-muted lg:aspect-auto"
                  : "absolute inset-0"}
                >
                  <Image
                    alt={`${property.title} en ${property.city}`}
                    className="object-cover"
                    fill
                    preload
                    sizes={secondaryImages.length > 0
                      ? "(max-width: 1023px) 100vw, 67vw"
                      : "(max-width: 1320px) 100vw, 1240px"}
                    src={mainImage.url}
                  />
                </div>
                {secondaryImages.length > 0 ? (
                  <div className={secondaryImages.length === 1
                    ? "grid grid-cols-1 gap-2"
                    : secondaryImages.length === 2
                      ? "grid grid-cols-2 gap-2 lg:grid-cols-1 lg:grid-rows-2"
                      : "grid grid-cols-2 gap-2 lg:grid-rows-2"}
                  >
                    {secondaryImages.map((image, index) => (
                      <div
                        className={`relative aspect-[4/3] overflow-hidden rounded-lg bg-muted lg:aspect-auto ${secondaryImages.length === 3 && index === 2 ? "col-span-2" : ""}`}
                        key={image.id}
                      >
                        <Image
                          alt={`${property.title}, imagen ${index + 2}`}
                          className="object-cover"
                          fill
                          sizes="(max-width: 1023px) 50vw, 17vw"
                          src={image.url}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex aspect-[4/3] max-h-[620px] items-center justify-center rounded-xl bg-muted sm:aspect-[16/9]">
                <House aria-hidden="true" className="size-12 text-foreground/20" strokeWidth={1.3} />
              </div>
            )}
          </div>

          <header className="mt-10 grid gap-7 border-b border-border pb-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted-foreground">
                {publicOperationLabels[property.operationType]} · {publicPropertyTypeLabels[property.propertyType]}
              </p>
              <h1 className="mt-3 max-w-4xl break-words text-balance text-[clamp(2.25rem,4.5vw,4rem)] font-semibold leading-[1.08] tracking-[-0.04em]">
                {property.title}
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                {[property.address, property.city].filter(Boolean).join(", ")}
              </p>
            </div>
            <p className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-none tracking-[-0.035em] tabular-nums md:pb-1 md:text-right">
              {formatPublicPrice(property.priceAmount, property.currency)}
            </p>
          </header>

          {features.length > 0 ? (
            <section aria-labelledby="features-title" className="border-b border-border py-10">
              <h2 className="text-2xl font-semibold tracking-[-0.025em]" id="features-title">
                Características
              </h2>
              <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
                {features.map((feature) => (
                  <div key={feature.label}>
                    <dt className="text-sm leading-5 text-muted-foreground">{feature.label}</dt>
                    <dd className="mt-1.5 text-lg font-semibold tabular-nums">{feature.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,.5fr)] lg:gap-20">
            {property.description ? (
              <section aria-labelledby="description-title">
                <h2 className="text-2xl font-semibold tracking-[-0.025em]" id="description-title">
                  Descripción
                </h2>
                <p className="mt-5 max-w-3xl break-words whitespace-pre-line text-base leading-8 text-foreground/80">
                  {property.description}
                </p>
              </section>
            ) : null}

            <aside className={`${property.description ? "" : "lg:col-start-2"} min-w-0 lg:border-l lg:border-border lg:pl-8`}>
              <h2 className="text-2xl font-semibold tracking-[-0.025em]">Ubicación</h2>
              <p className="mt-5 break-words text-base leading-7 text-foreground/80">
                {location.join(", ")}
              </p>
              <p className="mt-7 text-sm text-muted-foreground">Ref. {property.reference}</p>
            </aside>
          </div>
        </article>
      </main>
      <PublicFooter organizationName={organization.name} organizationSlug={organization.slug} />
    </div>
  );
}
