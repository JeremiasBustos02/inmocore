import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
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

const reasons = [
  {
    title: "Conocimiento local",
    description: "Una lectura atenta del mercado y del contexto de cada propiedad.",
  },
  {
    title: "Atención personalizada",
    description: "Acompañamiento cercano para tomar decisiones con tranquilidad.",
  },
  {
    title: "Gestión transparente",
    description: "Información clara y seguimiento durante cada etapa de la operación.",
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
          className="relative min-h-[510px] overflow-visible bg-muted pb-10 sm:min-h-[560px] lg:min-h-[540px]"
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
            className={`relative mx-auto flex w-full max-w-[1320px] flex-col items-center px-5 pt-20 text-center sm:px-8 sm:pt-24 lg:px-10 lg:pt-28 ${heroProperty ? "text-white" : "text-foreground"}`}
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
          className="mx-auto w-full max-w-[1320px] scroll-mt-6 px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24"
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

        <section className="border-y border-border bg-muted">
          <div className="mx-auto w-full max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Explorar por tipo
            </h2>
            <div className="mt-8 grid border-t border-l border-border sm:grid-cols-2">
              {propertyTypes.map((type) => (
                <Link
                  className="group flex min-h-20 items-center justify-between border-r border-b border-border bg-background px-5 text-base font-semibold hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:px-6"
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

        <section className="mx-auto grid w-full max-w-[1320px] scroll-mt-6 gap-7 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-24" id="estudio">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Sobre el estudio</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Una gestión cercana
            </h2>
          </div>
          <p className="max-w-2xl text-pretty text-xl leading-8 tracking-[-0.015em] text-foreground/80 md:justify-self-end md:text-2xl md:leading-9">
            Acompañamos cada operación con una gestión clara, profesional y enfocada en lo que necesitás.
          </p>
        </section>

        <section className="border-y border-border">
          <div className="mx-auto w-full max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Por qué elegirnos
            </h2>
            <div className="mt-9 grid border-t border-border md:grid-cols-3">
              {reasons.map((reason, index) => (
                <article className="border-b border-border py-7 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0" key={reason.title}>
                  <p className="text-sm font-semibold tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-6 text-balance text-lg font-semibold">{reason.title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                    {reason.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="scroll-mt-6 bg-primary text-primary-foreground" id="contacto">
          <div className="mx-auto grid w-full max-w-[1320px] gap-7 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-[1.2fr_.8fr] md:items-end lg:px-10">
            <div>
              <p className="text-sm font-semibold text-primary-foreground/65">Consultas y tasaciones</p>
              <h2 className="mt-4 max-w-2xl text-balance text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-tight tracking-[-0.04em]">
                Hablemos sobre tu próxima operación inmobiliaria.
              </h2>
            </div>
            <p className="max-w-md text-base leading-7 text-primary-foreground/70 md:justify-self-end">
              {organization.name} te acompaña para evaluar una propiedad o encontrar una nueva oportunidad.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter
        organizationName={organization.name}
        organizationSlug={organization.slug}
        contactEmail={organization.contactEmail}
        contactPhone={organization.contactPhone}
        whatsappPhone={organization.whatsappPhone}
      />
    </div>
  );
}
