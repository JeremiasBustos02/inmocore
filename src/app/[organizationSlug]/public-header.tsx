import { Menu } from "lucide-react";
import Link from "next/link";

type PublicHeaderProps = {
  organizationName: string;
  organizationSlug: string;
};

export function PublicHeader({
  organizationName,
  organizationSlug,
}: PublicHeaderProps) {
  const homeHref = `/${encodeURIComponent(organizationSlug)}`;
  const propertiesHref = `${homeHref}/properties`;
  const links = [
    { label: "Propiedades", href: `${homeHref}#propiedades` },
    { label: "Venta", href: `${propertiesHref}?operation=sale` },
    { label: "Alquiler", href: `${propertiesHref}?operation=rent` },
    { label: "Tasaciones", href: `${homeHref}#tasaciones` },
  ];

  return (
    <header className="relative z-40 border-b border-border/70 bg-background">
      <a
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform focus:translate-y-0"
        href="#contenido-principal"
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex h-20 w-full max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link
          className="max-w-[15rem] break-words text-base font-semibold leading-tight tracking-[-0.02em] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 sm:max-w-xs"
          href={homeHref}
        >
          {organizationName}
        </Link>

        <nav aria-label="Navegación principal" className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              className="public-link py-1 text-sm font-medium"
              href={link.href}
              key={link.label}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <details className="group relative md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
            Menú
            <Menu aria-hidden="true" className="size-5" strokeWidth={1.7} />
          </summary>
          <nav
            aria-label="Navegación mobile"
            className="absolute right-0 top-14 flex w-56 flex-col border border-border bg-card p-2 shadow-sm"
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
