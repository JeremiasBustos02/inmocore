import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyCard } from "./property-card";
import { PropertySearch } from "./property-search";
import { PublicFooter } from "./public-footer";
import { PublicHeader } from "./public-header";
import { getPublicHomeData, getPublicOrganization } from "./public-data";

type PublicHomePageProps = {
  params: Promise<{ organizationSlug: string }>;
};

export async function generateMetadata({
  params,
}: PublicHomePageProps): Promise<Metadata> {
  const { organizationSlug } = await params;
  const organization = await getPublicOrganization(organizationSlug);

  if (!organization) return {};

  return {
    title: `${organization.name} | Propiedades`,
    description: `Propiedades publicadas por ${organization.name}, disponibles para venta y alquiler.`,
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

  const propertyList = await getPublicHomeData(organization.id);
  const heroProperty = propertyList.find((property) => property.coverUrl);
  const homeHref = `/${encodeURIComponent(organization.slug)}`;

  return (
    <div className="public-site">
      <PublicHeader
        organizationName={organization.name}
        organizationSlug={organization.slug}
      />

      <main id="contenido-principal">
        <section aria-labelledby="hero-title" className="relative border-b border-border">
          <div className="mx-auto grid w-full max-w-[1320px] lg:min-h-[510px] lg:grid-cols-[5fr_7fr]">
            <div className="flex flex-col justify-center px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-16 lg:px-10 lg:pb-28 lg:pt-20">
              <p className="mb-7 text-sm font-medium text-brand-accent">
                Venta y alquiler · {organization.name}
              </p>
              <h1
                className="public-display max-w-[11ch] text-balance text-[clamp(3.25rem,6.5vw,6.25rem)] leading-[0.91] tracking-[-0.035em]"
                id="hero-title"
              >
                Elegir un lugar es elegir cómo vivir.
              </h1>
              <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
                Propiedades seleccionadas, presentadas con información clara.
              </p>
            </div>

            <div className="relative min-h-[320px] overflow-hidden bg-[#d8d5cc] sm:min-h-[430px] lg:min-h-full">
              {heroProperty?.coverUrl ? (
                <Image
                  alt={`${heroProperty.title} en ${heroProperty.city}`}
                  className="object-cover"
                  fill
                  priority
                  sizes="(max-width: 1023px) 100vw, 58vw"
                  src={heroProperty.coverUrl}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[#d8d5cc]"
                >
                  <div className="absolute inset-x-[14%] bottom-0 h-[68%] border-x border-t border-foreground/15" />
                  <div className="absolute bottom-0 left-[28%] h-[42%] w-[28%] border-x border-t border-foreground/15" />
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 mx-auto -mt-px w-full max-w-[1320px] px-5 sm:px-8 lg:-mt-20 lg:px-10">
            <PropertySearch organizationSlug={organization.slug} />
          </div>
        </section>

        <section
          aria-labelledby="featured-title"
          className="mx-auto w-full max-w-[1320px] scroll-mt-6 px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-28"
          id="propiedades"
        >
          <div className="mb-10 grid gap-4 border-b border-border pb-8 md:grid-cols-2 md:items-end">
            <h2
              className="public-display max-w-lg text-balance text-[clamp(2.5rem,4vw,4.25rem)] leading-[0.98] tracking-[-0.025em]"
              id="featured-title"
            >
              Propiedades para mirar con tiempo
            </h2>
            <p className="max-w-md text-base leading-7 text-muted-foreground md:justify-self-end">
              Una selección de oportunidades destacadas y publicaciones recientes.
            </p>
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
            <div className="max-w-xl py-8">
              <h3 className="public-display text-balance text-3xl">Nuevas propiedades, próximamente</h3>
              <p className="mt-3 leading-7 text-muted-foreground">
                En este momento no hay propiedades publicadas. La selección se actualizará cuando haya nuevas opciones disponibles.
              </p>
            </div>
          )}
        </section>

        <section className="border-y border-border bg-card">
          <div className="mx-auto grid w-full max-w-[1320px] lg:grid-cols-[7fr_5fr]">
            <div className="px-5 py-16 sm:px-8 sm:py-20 lg:border-r lg:border-border lg:px-10 lg:py-24">
              <h2 className="public-display text-balance text-[clamp(2.4rem,4vw,4rem)] leading-none">
                Explorar por tipo
              </h2>
              <div className="mt-9 border-t border-border">
                {propertyTypes.map((type) => (
                  <Link
                    className="group flex items-center justify-between border-b border-border py-5 text-lg font-medium hover:text-brand-accent focus-visible:outline-2 focus-visible:outline-offset-4"
                    href={`${homeHref}/properties?type=${type.value}`}
                    key={type.value}
                  >
                    {type.label}
                    <ArrowRight
                      aria-hidden="true"
                      className="size-5 transition-transform duration-200 group-hover:translate-x-1"
                      strokeWidth={1.5}
                    />
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex scroll-mt-6 flex-col justify-center bg-foreground px-5 py-16 text-primary-foreground sm:px-8 sm:py-20 lg:px-12 lg:py-24" id="estudio">
              <p className="text-sm text-primary-foreground/65">Nuestro trabajo</p>
              <h2 className="public-display mt-6 max-w-md text-balance text-[clamp(2.3rem,3.5vw,3.5rem)] leading-[1.02]">
                Decisiones importantes, acompañadas de cerca.
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-primary-foreground/70">
                Facilitamos cada etapa de una operación inmobiliaria con escucha, criterio y una gestión clara.
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="valuation-title"
          className="mx-auto grid w-full max-w-[1320px] scroll-mt-6 gap-6 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-[1fr_1fr] md:items-end lg:px-10 lg:py-24"
          id="tasaciones"
        >
          <h2
            className="public-display max-w-xl text-balance text-[clamp(2.6rem,5vw,5rem)] leading-[0.96] tracking-[-0.025em]"
            id="valuation-title"
          >
            Cada propiedad merece una mirada precisa.
          </h2>
          <p className="max-w-md text-base leading-7 text-muted-foreground md:justify-self-end">
            Próximamente vas a poder solicitar una tasación desde este sitio. Sin formularios vacíos ni respuestas automáticas.
          </p>
        </section>
      </main>

      <PublicFooter
        organizationName={organization.name}
        organizationSlug={organization.slug}
      />
    </div>
  );
}
