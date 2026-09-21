import Link from "next/link";

type PublicFooterProps = {
  organizationName: string;
  organizationSlug: string;
  contactEmail: string | null;
  contactPhone: string | null;
  whatsappPhone: string | null;
};

export function PublicFooter({
  organizationName,
  organizationSlug,
  contactEmail,
  contactPhone,
  whatsappPhone,
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
        <div className="flex flex-col gap-3 text-sm md:items-end">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {contactPhone ? <a className="public-link" href={`tel:${contactPhone}`}>{contactPhone}</a> : null}
            {contactEmail ? <a className="public-link" href={`mailto:${contactEmail}`}>{contactEmail}</a> : null}
            {whatsappPhone ? <a className="public-link" href={`https://wa.me/${whatsappPhone}`}>WhatsApp</a> : null}
          </div>
          <nav aria-label="Navegación del pie" className="flex flex-wrap gap-x-6 gap-y-3">
          <Link className="public-link" href={homeHref}>Inicio</Link>
          <Link className="public-link" href={`${homeHref}/properties`}>Propiedades</Link>
          <Link className="public-link" href={`${homeHref}#contacto`}>Contacto</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
