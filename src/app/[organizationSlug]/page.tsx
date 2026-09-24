import type { Metadata } from "next";
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrganizationPublicUrl,
  getPublicBasePath,
  getPublicPath,
} from "@/lib/public-site";
import { PropertyCard } from "./property-card";
import { PublicMap } from "@/components/maps/public-map";
import { getGoogleMapsSearchUrl } from "@/lib/location";
import { PublicReveal } from "./public-reveal";
import { PropertySearch } from "./property-search";
import { PublicFooter } from "./public-footer";
import { PublicHeader } from "./public-header";
import {
  getPublicCities,
  getPublicHeroSuggestions,
  getPublicHomeData,
  getPublicOrganization,
  getPublicOrganizationContactHours,
  getPublicOrganizationAssetUrl,
} from "./public-data";
import { PublicSiteVariant } from "./site-variants";
import {
  publicOperationLabels,
  publicPropertyTypeLabels,
} from "./public-property-options";

type PublicHomePageProps = {
  params: Promise<{ organizationSlug: string }>;
};

export async function generateMetadata({
  params,
}: PublicHomePageProps): Promise<Metadata> {
  const { organizationSlug } = await params;
  const organization = await getPublicOrganization(organizationSlug);

  if (!organization) return {};

  const heroSuggestionData = await getPublicHeroSuggestions(organization.id);
  const operations = heroSuggestionData.operations
    .map((operation) => `en ${publicOperationLabels[operation].toLowerCase()}`);
  const operationText = operations.length === 2
    ? `${operations[0]} y ${operations[1]}`
    : operations[0];
  const title = organization.name;
  const description = `Consultá las propiedades publicadas por ${organization.name}${operationText ? `. Hay publicaciones ${operationText}` : ""}.`.slice(0, 155);
  const heroImageUrl = getPublicOrganizationAssetUrl(organization.heroImagePath);
  const canonical = getOrganizationPublicUrl(organization);

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(canonical ? { url: canonical } : {}),
      ...(heroImageUrl
        ? { images: [{ url: heroImageUrl, alt: organization.heroTitle ?? organization.name }] }
        : {}),
    },
    ...(canonical ? { alternates: { canonical } } : {}),
    ...(organization.isDemo ? { robots: { index: false, follow: false } } : {}),
  };
}

const propertyTypes = [
  { label: "Casas", value: "house" },
  { label: "Departamentos", value: "apartment" },
  { label: "Terrenos", value: "land" },
  { label: "Locales", value: "commercial" },
] as const;

export default async function PublicHomePage({ params }: PublicHomePageProps) {
  const { organizationSlug } = await params;
  const organization = await getPublicOrganization(organizationSlug);

  if (!organization) notFound();

  const canonical = getOrganizationPublicUrl(organization);
  const logoUrl = getPublicOrganizationAssetUrl(organization.logoPath);
  const absoluteLogoUrl = logoUrl && canonical
    ? new URL(logoUrl, canonical).toString()
    : null;
  const hasBusinessCoordinates =
    organization.contactLatitude !== null &&
    organization.contactLongitude !== null &&
    Number.isFinite(organization.contactLatitude) &&
    Number.isFinite(organization.contactLongitude) &&
    organization.contactLatitude >= -90 &&
    organization.contactLatitude <= 90 &&
    organization.contactLongitude >= -180 &&
    organization.contactLongitude <= 180;
  const businessStructuredData = canonical
    ? {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        name: organization.name,
        url: canonical,
        ...(absoluteLogoUrl ? { logo: absoluteLogoUrl } : {}),
        ...(organization.contactPhone ? { telephone: organization.contactPhone } : {}),
        ...(organization.contactEmail ? { email: organization.contactEmail } : {}),
        ...(hasBusinessCoordinates
          ? {
              geo: {
                "@type": "GeoCoordinates",
                latitude: organization.contactLatitude,
                longitude: organization.contactLongitude,
              },
            }
          : {}),
      }
    : null;

  const [propertyList, cities, heroSuggestionData, contactHours] = await Promise.all([
    getPublicHomeData(organization.id),
    getPublicCities(organization.id),
    getPublicHeroSuggestions(organization.id),
    getPublicOrganizationContactHours(organization.id),
  ]);
  const heroProperty = propertyList.find((property) => property.coverUrl);
  const heroImageUrl = getPublicOrganizationAssetUrl(organization.heroImagePath) ?? heroProperty?.coverUrl;
  const aboutImageUrl = getPublicOrganizationAssetUrl(organization.aboutImagePath);
  const hasAbout = Boolean(organization.aboutTitle?.trim() || organization.aboutDescription?.trim() || aboutImageUrl);
  const publicBasePath = getPublicBasePath(organizationSlug, organization.slug);
  const suggestedOperation = heroSuggestionData.operations.includes("rent")
    ? "rent"
    : heroSuggestionData.operations[0];
  const heroSuggestions = [
    ...heroSuggestionData.propertyTypes.slice(0, 3).map((propertyType) => ({
      label: publicPropertyTypeLabels[propertyType],
      params: { type: propertyType },
    })),
    ...(suggestedOperation
      ? [{
          label: publicOperationLabels[suggestedOperation],
          params: { operation: suggestedOperation },
        }]
      : []),
    ...cities.slice(0, 3).map((city) => ({
      label: `Propiedades en ${city}`,
      params: { city },
    })),
  ].slice(0, 6);
  const organizationLocation = organization.contactLatitude !== null && organization.contactLongitude !== null
    ? {
        kind: "exact" as const,
        latitude: organization.contactLatitude,
        longitude: organization.contactLongitude,
      }
    : null;
  const organizationMapsHref = organizationLocation
    ? getGoogleMapsSearchUrl(organizationLocation)
    : null;

  return (
    <PublicSiteVariant siteVariant={organization.siteVariant}>
    <div className="public-site overflow-x-clip">
      <PublicHeader
        organizationName={organization.name}
        publicBasePath={publicBasePath}
        logoUrl={getPublicOrganizationAssetUrl(organization.logoPath)}
      />

      <main id="contenido-principal">
        {businessStructuredData ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(businessStructuredData).replace(/</g, "\\u003c"),
            }}
          />
        ) : null}
        <section
          aria-labelledby="hero-title"
          className="relative flex min-h-[560px] overflow-hidden bg-muted sm:min-h-[580px] lg:min-h-[600px]"
        >
          <div className="absolute inset-0 overflow-hidden">
            {heroImageUrl ? (
              <Image
                alt={organization.heroTitle ?? `${organization.name} portada`}
                 className="object-cover object-center"
                fill
                preload
                sizes="100vw"
                src={heroImageUrl}
              />
            ) : null}
          </div>
          <div
            aria-hidden="true"
             className={`absolute inset-0 ${heroImageUrl ? "bg-black/40" : "bg-black/5"}`}
          />
          <div
             className={`public-hero-content relative mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center justify-center px-5 py-14 text-center sm:px-8 sm:py-16 lg:px-8 lg:py-20 ${heroProperty ? "text-white" : "text-foreground"}`}
          >
             <h1
                className="public-hero-enter public-hero-enter-1 w-full max-w-4xl text-balance text-[clamp(2.35rem,4.2vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.04em]"
              id="hero-title"
            >
                {organization.heroTitle ?? `${organization.name} | Propiedades`}
            </h1>
              <p className={`public-hero-enter public-hero-enter-2 mt-3 w-full max-w-xl text-base leading-7 sm:mt-4 sm:text-[19px] ${heroImageUrl ? "text-white/85" : "text-muted-foreground"}`}>
                {organization.heroSubtitle ?? `Consultá las propiedades publicadas por ${organization.name}.`}
            </p>
             <div className="relative z-10 mt-7 w-full sm:mt-8">
               <PropertySearch
                 cities={cities}
                 hasHeroImage={Boolean(heroImageUrl)}
                 publicBasePath={publicBasePath}
                 suggestions={heroSuggestions}
               />
            </div>
          </div>
        </section>

         <PublicReveal
           as="section"
           aria-labelledby="featured-title"
           className="mx-auto w-full max-w-[1440px] scroll-mt-6 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-20"
          id="propiedades"
         >
          <div className="mb-9 flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                className="text-balance text-[clamp(2rem,3vw,2.75rem)] font-semibold leading-tight tracking-[-0.035em]"
                id="featured-title"
              >
                Propiedades destacadas
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Una selección de oportunidades disponibles.
              </p>
            </div>
            <Link
               className="public-link flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold"
              href={getPublicPath(publicBasePath, "/propiedades")}
            >
              Ver todas
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          {propertyList.length > 0 ? (
             <div className="public-featured-grid grid gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
              {propertyList.map((property) => (
                <PropertyCard
                  key={property.id}
                  publicBasePath={publicBasePath}
                  property={property}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-muted px-6 py-10">
              <h3 className="text-balance text-xl font-semibold tracking-[-0.02em]">No hay propiedades publicadas por el momento</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                La selección se actualizará cuando haya nuevas opciones disponibles.
              </p>
            </div>
           )}
          <div className="mt-12 sm:mt-14 lg:mt-16">
            <h2 className="text-balance text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Explorar por tipo
            </h2>
            <div className="mt-6 grid border-l border-t border-border sm:grid-cols-2">
              {propertyTypes.map((type) => (
                <Link
                   className="group flex min-h-20 cursor-pointer items-center justify-between border-b border-r border-border bg-background px-5 text-base font-semibold hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:px-6"
                  href={`${getPublicPath(publicBasePath, "/propiedades")}?type=${type.value}`}
                  key={type.value}
                >
                  {type.label}
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
         </PublicReveal>

          <div className="border-t border-border bg-muted">
            {hasAbout ? (
              <PublicReveal as="section" aria-labelledby="about-title" className="scroll-mt-6" id="estudio">
                <div className={`mx-auto grid w-full max-w-[1440px] gap-8 px-5 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-20 md:items-center md:gap-12 lg:gap-20 lg:px-8 lg:pb-24 lg:pt-24 ${aboutImageUrl ? "md:grid-cols-[minmax(0,43fr)_minmax(0,57fr)]" : ""}`}>
                  {aboutImageUrl ? (
                    <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden bg-border md:max-w-none">
                      <Image
                        alt={organization.aboutTitle?.trim() ? `${organization.aboutTitle.trim()} - ${organization.name}` : organization.name}
                        className="object-cover"
                        fill
                        sizes="(min-width: 1440px) 540px, (min-width: 768px) 40vw, (min-width: 640px) 384px, calc(100vw - 40px)"
                        src={aboutImageUrl}
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 max-w-2xl">
                    {organization.aboutEyebrow?.trim() ? <p className="text-xs font-semibold tracking-[0.22em] text-primary/70">{organization.aboutEyebrow}</p> : null}
                    <h2 className="mt-5 break-words text-balance text-[clamp(2rem,4vw,4rem)] font-semibold leading-[1.08] tracking-[-0.045em]" id="about-title">{organization.aboutTitle?.trim() || organization.name}</h2>
                    {organization.aboutDescription?.trim() ? <p className="mt-7 whitespace-pre-line break-words text-base leading-8 text-foreground/75 sm:text-lg sm:leading-9">{organization.aboutDescription}</p> : null}
                    {organization.whatsappPhone ? (
                      <a className="public-link mt-8 inline-flex w-fit items-center gap-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" href={`https://wa.me/${organization.whatsappPhone}`} rel="noopener noreferrer" target="_blank">
                        Contactar <ArrowRight aria-hidden="true" className="size-4" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </PublicReveal>
            ) : null}

            {hasAbout ? <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-8" aria-hidden="true"><div className="border-t border-border/70" /></div> : null}

            <PublicReveal as="section" aria-labelledby="contact-title" className="scroll-mt-6" id="contacto">
              <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:px-8 lg:pb-24 lg:pt-20">
               <div className="max-w-2xl">
                 <p className="text-xs font-semibold tracking-[0.24em] text-muted-foreground">HABLEMOS</p>
                 <h2 className="mt-5 text-balance text-[clamp(2.25rem,4.5vw,4.25rem)] font-semibold leading-[1.04] tracking-[-0.045em]" id="contact-title">
                   ¿Buscás una propiedad?
                 </h2>
                  <p className="mt-5 text-lg leading-8 text-foreground/70 sm:text-xl">
                    Podés comunicarte con {organization.name} por los medios publicados.
                  </p>
               </div>

              {organization.contactAddress || contactHours || organization.contactPhone || organization.contactEmail ? (
               <div className="mt-14 grid border-y border-border md:grid-cols-3">
                {organization.contactAddress || contactHours ? (
                  <div className="flex min-w-0 items-center gap-4 border-b border-border py-7 md:border-b-0 md:pr-8">
                     <MapPin aria-hidden="true" className="size-5 shrink-0 text-primary" strokeWidth={1.6} />
                     <div className="min-w-0">
                       <span className="block text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">VISITANOS</span>
                       {organization.contactAddress ? <p className="mt-2 break-words text-base font-medium leading-6">{organization.contactAddress}</p> : null}
                     </div>
                     {contactHours ? (
                         <div className={`${organization.contactAddress ? "mt-5" : "mt-2"} flex items-start gap-2.5`}>
                           <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.7} />
                           <p className="min-w-0 whitespace-pre-line break-words text-sm leading-6 text-muted-foreground">{contactHours}</p>
                         </div>
                       ) : null}
                  </div>
                ) : null}
               {organization.contactPhone ? (
                 <a
                   className="group flex min-h-28 items-center gap-4 border-b border-border py-7 transition-colors duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:border-b-0 md:border-l md:px-8"
                   href={`tel:${organization.contactPhone}`}
                 >
                   <Phone aria-hidden="true" className="size-5 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.6} />
                   <span className="min-w-0">
                     <span className="block text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">LLAMANOS</span>
                     <span className="mt-2 block text-base font-medium leading-6 break-words">{organization.contactPhone}</span>
                   </span>
                 </a>
               ) : null}
               {organization.contactEmail ? (
                 <a
                   className="group flex min-h-28 items-center gap-4 py-7 transition-colors duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:border-l md:pl-8"
                   href={`mailto:${organization.contactEmail}`}
                 >
                   <Mail aria-hidden="true" className="size-5 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.6} />
                   <span className="min-w-0">
                     <span className="block text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">ESCRIBINOS</span>
                     <span className="mt-2 block text-base font-medium leading-6 break-all">{organization.contactEmail}</span>
                   </span>
                 </a>
               ) : null}
              </div>
              ) : null}

              {organization.whatsappPhone ? (
               <a
                  className="group mt-12 inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:w-fit"
                 href={`https://wa.me/${organization.whatsappPhone}`}
                 rel="noopener noreferrer"
                 target="_blank"
               >
                 <MessageCircle aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                 <span>Escribinos por WhatsApp</span>
                 <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
               </a>
              ) : null}
              {organizationLocation ? (
                <div className="mt-12">
                  <PublicMap
                    className="h-[260px] w-full overflow-hidden rounded-lg border border-border bg-background sm:h-[320px]"
                    location={organizationLocation}
                    markerColor={organization.primaryColor}
                  />
                  {organizationMapsHref ? (
                    <a
                      aria-label="Abrir la ubicación de la inmobiliaria en Google Maps"
                      className="mt-3 inline-flex w-fit cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      href={organizationMapsHref}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Abrir en Google Maps ↗
                    </a>
                  ) : null}
                </div>
              ) : null}
              </div>
            </PublicReveal>
         </div>
       </main>

       <PublicFooter
        contactAddress={organization.contactAddress}
        organizationName={organization.name}
        publicBasePath={publicBasePath}
        contactEmail={organization.contactEmail}
        contactPhone={organization.contactPhone}
        whatsappPhone={organization.whatsappPhone}
        logoUrl={getPublicOrganizationAssetUrl(organization.logoPath)}
      />
    </div>
    </PublicSiteVariant>
  );
}
