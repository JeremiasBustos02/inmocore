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
      <div className="mx-auto flex h-[72px] w-full max-w-[1320px] items-center justify-between px-5 sm:h-20 sm:px-8 lg:px-10">
        <Link
          className="min-w-0 max-w-[14rem] flex-1 truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 sm:max-w-xs sm:text-base"
          href={homeHref}
        >
           {logoUrl ? <Image alt={organizationName} className="h-12 w-auto max-w-[13rem] object-contain object-left sm:h-14 sm:max-w-[15rem]" height={56} sizes="240px" src={logoUrl} width={240} /> : organizationName}
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <nav aria-label="Navegación principal" className="flex items-center gap-7">
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
          <Link className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground/75 transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2" href="/login">
            Acceso
          </Link>
        </div>

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
             <Link className="mt-1 border-t border-border px-4 py-3 text-sm font-medium text-foreground/75 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px]" href="/login">
               Acceso
             </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
