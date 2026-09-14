import Link from "next/link";

type PublicFooterProps = {
  organizationName: string;
  organizationSlug: string;
};

export function PublicFooter({
  organizationName,
  organizationSlug,
}: PublicFooterProps) {
  const homeHref = `/${encodeURIComponent(organizationSlug)}`;

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-7 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
        <div>
          <p className="font-semibold">{organizationName}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            © {new Date().getFullYear()} {organizationName}
          </p>
        </div>
        <nav aria-label="Navegación del pie" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link className="public-link" href={homeHref}>Inicio</Link>
          <Link className="public-link" href={`${homeHref}/properties`}>Propiedades</Link>
          <Link className="public-link" href={`${homeHref}#contacto`}>Contacto</Link>
        </nav>
      </div>
    </footer>
  );
}
