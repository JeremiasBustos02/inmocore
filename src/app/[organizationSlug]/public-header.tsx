import { Menu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type PublicHeaderProps = {
  organizationName: string;
  organizationSlug: string;
  logoUrl: string | null;
};

export function PublicHeader({
  organizationName,
  organizationSlug,
  logoUrl,
}: PublicHeaderProps) {
  const homeHref = `/${encodeURIComponent(organizationSlug)}`;
  const propertiesHref = `${homeHref}/properties`;
  const links = [
    { label: "Inicio", href: homeHref },
    { label: "Propiedades", href: propertiesHref },
    { label: "Venta", href: `${propertiesHref}?operation=sale` },
    { label: "Alquiler", href: `${propertiesHref}?operation=rent` },
    { label: "Contacto", href: `${homeHref}#contacto` },
  ];

  return (
    <header className="relative z-40 border-b border-border bg-background">
      <a
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform focus-visible:translate-y-0"
        href="#contenido-principal"
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex h-[76px] w-full max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link
          className="min-w-0 max-w-[14rem] flex-1 truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 sm:max-w-xs sm:text-base"
          href={homeHref}
        >
          {logoUrl ? <Image alt={organizationName} className="h-10 w-auto max-w-[12rem] object-contain object-left" height={40} src={logoUrl} width={192} /> : organizationName}
        </Link>

        <nav aria-label="Navegación principal" className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              className="public-link py-1 text-[14px] font-medium text-foreground/80 hover:text-foreground"
              href={link.href}
              key={link.label}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <details className="group relative ml-4 shrink-0 md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
            Menú
            <Menu aria-hidden="true" className="size-5" strokeWidth={1.7} />
          </summary>
          <nav
            aria-label="Navegación mobile"
            className="absolute right-0 top-14 flex w-56 flex-col rounded-lg border border-border bg-card p-2 shadow-sm"
          >
            {links.map((link) => (
              <Link
                className="rounded-md px-4 py-3 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                href={link.href}
                key={link.label}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
