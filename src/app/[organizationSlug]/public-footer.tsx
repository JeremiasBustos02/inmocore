import Image from "next/image";
import Link from "next/link";
import { getPublicPath } from "@/lib/public-site";

type PublicFooterProps = {
  organizationName: string;
  publicBasePath: string;
  contactAddress: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  whatsappPhone: string | null;
  logoUrl: string | null;
};

export function PublicFooter({
  organizationName,
  publicBasePath,
  contactAddress,
  contactEmail,
  contactPhone,
  whatsappPhone,
  logoUrl,
}: PublicFooterProps) {
  const homeHref = publicBasePath || "/";
  const propertiesHref = getPublicPath(publicBasePath, "/properties");
  const hasContact = Boolean(contactAddress || contactEmail || contactPhone || whatsappPhone);

  return (
    <footer className="border-t border-border bg-muted/40">
      <div className={`mx-auto grid w-full max-w-[1320px] gap-10 px-5 py-14 sm:px-8 lg:px-10 lg:py-16 ${hasContact ? "md:grid-cols-[1.4fr_.8fr_1fr]" : "md:grid-cols-[1.4fr_.8fr]"}`}>
        <div>
          <Link className="inline-flex max-w-[15rem] items-center focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4" href={homeHref}>
            {logoUrl ? <Image alt={organizationName} className="h-12 w-auto max-w-[13rem] object-contain object-left" height={48} sizes="208px" src={logoUrl} width={208} /> : <span className="text-lg font-semibold tracking-[-0.02em]">{organizationName}</span>}
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-muted-foreground">Una gestión cercana, clara y profesional para encontrar tu próximo lugar.</p>
        </div>
        <nav aria-label="Navegación del pie" className="flex flex-col items-start gap-3 text-sm">
          <p className="mb-1 font-semibold text-foreground">Navegación</p>
          <Link className="public-link" href={homeHref}>Inicio</Link>
          <Link className="public-link" href={propertiesHref}>Propiedades</Link>
          <Link className="public-link" href={`${propertiesHref}?operation=sale`}>Comprar</Link>
          <Link className="public-link" href={`${propertiesHref}?operation=rent`}>Alquilar</Link>
        </nav>
        {hasContact ? <div className="flex flex-col items-start gap-3 text-sm">
          <p className="mb-1 font-semibold text-foreground">Contacto</p>
          {contactAddress ? <p className="max-w-xs leading-6 text-muted-foreground">{contactAddress}</p> : null}
          {contactPhone ? <a className="public-link" href={`tel:${contactPhone}`}>{contactPhone}</a> : null}
          {contactEmail ? <a className="public-link break-all" href={`mailto:${contactEmail}`}>{contactEmail}</a> : null}
          {whatsappPhone ? <a className="public-link" href={`https://wa.me/${whatsappPhone}`}>WhatsApp</a> : null}
        </div> : null}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-2 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>© {new Date().getFullYear()} {organizationName}</p>
          <p>{organizationName}</p>
        </div>
      </div>
    </footer>
  );
}
