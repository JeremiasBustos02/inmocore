import type { Metadata } from "next";
import { ArrowLeft, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizationPublicUrl, getPublicBasePath, getPublicPath } from "@/lib/public-site";
import { PublicFooter } from "../../public-footer";
import { PublicHeader } from "../../public-header";
import { getPublicOrganization, getPublicOrganizationAssetUrl, getPublicPropertyDetail, getPublicSimilarProperties } from "../../public-data";
import { PropertyCard } from "../../property-card";
import { PropertyGallery } from "./property-gallery";
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

  if (!organization) return { robots: { index: false, follow: false } };

  const property = await getPublicPropertyDetail(organization.id, propertyId);
  if (!property) return { robots: { index: false, follow: false } };

  const description = property.description
    ?.replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);

  const operationLabel = publicOperationLabels[property.operationType];
  const propertyTypeLabel = publicPropertyTypeLabels[property.propertyType];
  const propertyDescription = description || `${operationLabel} de ${propertyTypeLabel.toLowerCase()} en ${property.city}.`;
  const title = `${property.title} | ${property.city} | ${organization.name}`;
  const canonical = getOrganizationPublicUrl(
    organization,
    `/properties/${property.id}`,
  );

  return {
    title: { absolute: title },
    description: propertyDescription,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title,
      description: propertyDescription,
      type: "website",
      ...(canonical ? { url: canonical } : {}),
      ...(property.images[0]
        ? {
            images: [{ url: property.images[0].url, alt: `${property.title} en ${property.city}` }],
          }
        : {}),
    },
    ...(organization.isDemo ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function PublicPropertyPage({ params }: PublicPropertyPageProps) {
  const { organizationSlug, propertyId } = await params;
  const organization = await getPublicOrganization(organizationSlug);

  if (!organization) notFound();

  const property = await getPublicPropertyDetail(organization.id, propertyId);
  if (!property) notFound();

  const similarProperties = await getPublicSimilarProperties(
    organization.id,
    property.id,
    property.operationType,
    property.propertyType,
    property.city,
  );

  const publicBasePath = getPublicBasePath(organizationSlug, organization.slug);
  const catalogHref = getPublicPath(publicBasePath, "/properties");
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
  const mapsLocation = [
    property.address,
    property.city,
    property.province,
    property.country,
  ].filter((value): value is string => Boolean(value)).join(", ");
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsLocation)}`;
  const whatsappMessage = `Hola, quisiera consultar por la propiedad "${property.title}"${property.city ? ` en ${property.city}` : ""} (Ref. ${property.reference}).`;
  const whatsappHref = organization.whatsappPhone
    ? `https://wa.me/${organization.whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`
    : null;
  const whatsappCtaClass = "public-button inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-primary px-5 text-center text-sm font-semibold tracking-[-0.01em] text-primary-foreground transition-[background-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-0 md:w-auto";
  const contactTitle = "¿Te interesa esta propiedad?";
  const contactDescription = "Contactanos por WhatsApp y te ayudamos con cualquier consulta.";
  const contactNote = "Contacto directo con la inmobiliaria.";

  return (
    <div className="public-site flex min-h-screen flex-col overflow-x-clip">
       <PublicHeader organizationName={organization.name} publicBasePath={publicBasePath} logoUrl={getPublicOrganizationAssetUrl(organization.logoPath)} />
      <main className="flex-1" id="contenido-principal">
        <article className="mx-auto w-full max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14 lg:px-8 lg:py-16">
          <Link className="public-link inline-flex items-center gap-2 text-sm font-semibold" href={catalogHref}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Volver a propiedades
          </Link>

          <div className="mt-7">
            <PropertyGallery city={property.city} images={property.images} propertyTitle={property.title} />
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
            <div className="min-w-0 md:flex md:min-w-[220px] md:flex-col md:items-end md:gap-5">
              <p className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-none tracking-[-0.035em] tabular-nums md:pb-1 md:text-right">
                {formatPublicPrice(property.priceAmount, property.currency)}
              </p>
              {whatsappHref ? (
                <a
                  className={`${whatsappCtaClass} mt-6 hidden md:mt-0 md:inline-flex`}
                  href={whatsappHref}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <MessageCircle aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                  Consultar por WhatsApp
                </a>
              ) : null}
            </div>
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
              <a
                aria-label="Ver ubicación en Google Maps"
                className="public-link mt-5 inline-flex max-w-full items-start gap-2 break-words text-base leading-7 text-foreground/80 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                href={mapsHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" strokeWidth={1.7} />
                <span>{location.join(", ")}</span>
              </a>
              <p className="mt-7 text-sm text-muted-foreground">Ref. {property.reference}</p>
            </aside>
          </div>

          {whatsappHref ? (
            <section
              aria-labelledby="final-contact-title"
              className="mt-12 border-y border-border py-10 sm:py-12"
            >
              <p className="text-sm font-semibold text-muted-foreground">Contacto directo</p>
              <h2
                className="mt-3 text-2xl font-semibold tracking-[-0.025em]"
                id="final-contact-title"
              >
                {contactTitle}
              </h2>
              <p className="mt-3 max-w-md text-base leading-7 text-muted-foreground">
                {contactDescription}
              </p>
              <a
                className={`${whatsappCtaClass} mt-6`}
                href={whatsappHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <MessageCircle aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                Consultar por WhatsApp
              </a>
              <p className="mt-3 text-xs text-muted-foreground">
                {contactNote}
              </p>
            </section>
          ) : null}

          {similarProperties.length > 0 ? (
            <section aria-labelledby="similar-properties-title" className="mt-16 border-t border-border pt-10">
              <div className="flex items-end justify-between gap-5">
                <h2 className="text-2xl font-semibold tracking-[-0.025em]" id="similar-properties-title">
                  Propiedades similares
                </h2>
                <Link className="public-link hidden text-sm font-semibold sm:inline-flex" href={catalogHref}>
                  Ver todas
                </Link>
              </div>
              <div className="mt-7 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3">
                {similarProperties.map((similarProperty) => (
                  <div className="min-w-[82%] snap-start sm:min-w-[45%] md:min-w-0" key={similarProperty.id}>
                    <PropertyCard publicBasePath={publicBasePath} property={similarProperty} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </article>
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
