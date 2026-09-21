import type { Metadata } from "next";
import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSitePath, getPublicSiteUrl } from "@/lib/public-site";
import { PropertyCard } from "./property-card";
import { PropertySearch } from "./property-search";
import { PublicFooter } from "./public-footer";
import { PublicHeader } from "./public-header";
import {
  getPublicCities,
  getPublicHomeData,
  getPublicOrganization,
  getPublicOrganizationAssetUrl,
} from "./public-data";

type PublicHomePageProps = {
  params: Promise<{ organizationSlug: string }>;
};

export async function generateMetadata({
  params,
}: PublicHomePageProps): Promise<Metadata> {
  const { organizationSlug } = await params;
  const organization = await getPublicOrganization(organizationSlug);

  if (!organization) return {};

  const title = `${organization.name} | Propiedades`;
  const description = `Propiedades publicadas por ${organization.name}, disponibles para venta y alquiler.`;
  const heroImageUrl = getPublicOrganizationAssetUrl(organization.heroImagePath);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(heroImageUrl
        ? { images: [{ url: heroImageUrl, alt: organization.heroTitle ?? organization.name }] }
        : {}),
    },
    ...(getPublicSiteUrl()
      ? { alternates: { canonical: getPublicSitePath(`/${encodeURIComponent(organization.slug)}`) } }
      : {}),
  };
}

const propertyTypes = [
  { label: "Casas", value: "house" },
  { label: "Departamentos", value: "apartment" },
  { label: "Terrenos", value: "land" },
  { label: "Locales", value: "commercial" },
] as const;

const benefits = [
  {
    title: "Conocemos la zona",
    description: "Conocemos el mercado inmobiliario de la región y sus alrededores.",
  },
  {
    title: "Te acompañamos",
    description: "Estamos presentes desde la primera visita hasta la firma.",
  },
  {
    title: "Hablamos claro",
    description: "Información simple y transparente para que puedas decidir tranquilo.",
  },
];

export default async function PublicHomePage({ params }: PublicHomePageProps) {
  const { organizationSlug } = await params;
  const organization = await getPublicOrganization(organizationSlug);

  if (!organization) notFound();

  const [propertyList, cities] = await Promise.all([
    getPublicHomeData(organization.id),
    getPublicCities(organization.id),
  ]);
  const heroProperty = propertyList.find((property) => property.coverUrl);
  const heroImageUrl = getPublicOrganizationAssetUrl(organization.heroImagePath) ?? heroProperty?.coverUrl;
  const homeHref = `/${encodeURIComponent(organization.slug)}`;

  return (
    <div className="public-site overflow-x-hidden">
      <PublicHeader
        organizationName={organization.name}
        organizationSlug={organization.slug}
        logoUrl={getPublicOrganizationAssetUrl(organization.logoPath)}
      />

      <main id="contenido-principal">
        <section
          aria-labelledby="hero-title"
          className="relative min-h-[480px] overflow-visible bg-muted pb-6 sm:min-h-[520px] sm:pb-8 lg:min-h-[500px]"
        >
          <div className="absolute inset-0 overflow-hidden">
            {heroImageUrl ? (
              <Image
                alt={organization.heroTitle ?? `${organization.name} portada`}
                className="object-cover"
                fill
                preload
                sizes="100vw"
                src={heroImageUrl}
              />
            ) : null}
          </div>
          <div
            aria-hidden="true"
            className={`absolute inset-0 ${heroImageUrl ? "bg-black/45" : "bg-black/5"}`}
          />
          <div
            className={`relative mx-auto flex w-full max-w-[1320px] flex-col items-center px-5 pt-16 text-center sm:px-8 sm:pt-20 lg:px-10 lg:pt-24 ${heroProperty ? "text-white" : "text-foreground"}`}
          >
            <h1
              className="w-full max-w-4xl text-balance text-[clamp(2.45rem,5vw,4.5rem)] font-semibold leading-[1.04] tracking-[-0.04em]"
              id="hero-title"
            >
               {organization.heroTitle ?? "Encontrá tu próximo lugar"}
            </h1>
             <p className={`mt-4 w-full max-w-xl text-base leading-7 sm:text-lg ${heroImageUrl ? "text-white/85" : "text-muted-foreground"}`}>
               {organization.heroSubtitle ?? "Propiedades para vivir, invertir y proyectar con confianza."}
            </p>
            <div className="relative z-10 mt-7 w-full sm:mt-8">
              <PropertySearch cities={cities} organizationSlug={organization.slug} />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="featured-title"
          className="mx-auto w-full max-w-[1320px] scroll-mt-6 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-16 lg:px-10 lg:pb-20 lg:pt-20"
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
              className="public-link flex w-fit items-center gap-2 text-sm font-semibold"
              href={`${homeHref}/properties`}
            >
              Ver todas
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          {propertyList.length > 0 ? (
            <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
              {propertyList.map((property) => (
                <PropertyCard
                  key={property.id}
                  organizationSlug={organization.slug}
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
        </section>

        <section className="border-t border-border bg-muted">
          <div className="mx-auto w-full max-w-[1320px] px-5 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Explorar por tipo
            </h2>
            <div className="mt-8 grid border-t border-l border-border sm:grid-cols-2">
              {propertyTypes.map((type) => (
                <Link
                  className="group flex min-h-20 items-center justify-between border-r border-b border-border bg-background px-5 text-base font-semibold hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:px-6"
                  href={`${homeHref}/properties?type=${type.value}`}
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
        </section>

        <section aria-labelledby="estudio-title" className="scroll-mt-6 border-t border-border bg-muted" id="estudio">
          <div className="mx-auto grid w-full max-w-[1320px] gap-16 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-[1.15fr_.85fr] md:gap-20 lg:gap-32 lg:px-10 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.22em] text-primary/70">¿POR QUÉ ELEGIRNOS?</p>
              <h2 className="mt-6 text-balance text-[clamp(2.6rem,5.4vw,5.25rem)] font-semibold leading-[1.02] tracking-[-0.055em]" id="estudio-title">
                Conocemos la zona. Te acompañamos. Hablamos claro.
              </h2>
            </div>

            <div className="md:pt-3">
              {benefits.map(({ title, description }, index) => (
                <article className={`py-7 ${index > 0 ? "border-t border-border" : ""}`} key={title}>
                  <h3 className="text-xl font-semibold tracking-[-0.025em]">{title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

         <section aria-labelledby="contact-title" className="scroll-mt-6 border-t border-border bg-muted" id="contacto">
           <div className="mx-auto w-full max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
             <div className="max-w-2xl">
               <p className="text-xs font-semibold tracking-[0.24em] text-muted-foreground">HABLEMOS</p>
               <h2 className="mt-5 text-balance text-[clamp(2.25rem,4.5vw,4.25rem)] font-semibold leading-[1.04] tracking-[-0.045em]" id="contact-title">
                 ¿Buscás una propiedad?
               </h2>
               <p className="mt-5 text-lg leading-8 text-foreground/70 sm:text-xl">Estamos para ayudarte a encontrarla.</p>
             </div>

             <div className="mt-14 grid border-y border-border md:grid-cols-3">
               {organization.contactAddress ? (
                 <a
                   className="group flex min-h-28 items-center gap-4 border-b border-border py-7 transition-colors duration-200 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:border-b-0 md:pr-8"
                   href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(organization.contactAddress)}`}
                   rel="noopener noreferrer"
                   target="_blank"
                 >
                   <MapPin aria-hidden="true" className="size-5 shrink-0 text-primary transition-transform duration-200 group-hover:-translate-y-0.5" strokeWidth={1.6} />
                   <span className="min-w-0">
                     <span className="block text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">VISITANOS</span>
                     <span className="mt-2 block text-base font-medium leading-6 break-words">{organization.contactAddress}</span>
                   </span>
                 </a>
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

             {organization.whatsappPhone ? (
               <a
                 className="group mt-12 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:w-fit"
                 href={`https://wa.me/${organization.whatsappPhone}`}
                 rel="noopener noreferrer"
                 target="_blank"
               >
                 <MessageCircle aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                 <span>Escribinos por WhatsApp</span>
                 <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
               </a>
             ) : null}
           </div>
         </section>
       </main>

       <PublicFooter
        contactAddress={organization.contactAddress}
        organizationName={organization.name}
        organizationSlug={organization.slug}
        contactEmail={organization.contactEmail}
        contactPhone={organization.contactPhone}
        whatsappPhone={organization.whatsappPhone}
        logoUrl={getPublicOrganizationAssetUrl(organization.logoPath)}
      />
    </div>
  );
}
