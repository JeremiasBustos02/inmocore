"use client";

import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import {
  Building2,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/auth-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const roleLabels = {
  owner: "Propietario",
  admin: "Administrador",
  agent: "Agente",
} as const;

type AdminNavigationProps = {
  organizationName: string;
  organizationSlug: string;
  role: keyof typeof roleLabels;
};

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  key: "dashboard" | "properties" | "import" | "organization";
  label: string;
};

function getNavigationItems(
  organizationSlug: string,
  role: keyof typeof roleLabels,
): NavigationItem[] {
  const basePath = `/admin/${encodeURIComponent(organizationSlug)}`;
  const items: NavigationItem[] = [
    {
      href: basePath,
      icon: LayoutDashboard,
      key: "dashboard",
      label: "Dashboard",
    },
    {
      href: `${basePath}/properties`,
      icon: Building2,
      key: "properties",
      label: "Propiedades",
    },
  ];

  if (role === "owner" || role === "admin") {
    items.push(
      {
        href: `${basePath}/properties/import`,
        icon: Upload,
        key: "import",
        label: "Importar",
      },
      {
        href: `${basePath}/organization`,
        icon: Settings2,
        key: "organization",
        label: "Organización",
      },
    );
  }

  return items;
}

function isActiveItem(item: NavigationItem, pathname: string | null) {
  if (!pathname) return false;
  if (item.key === "dashboard") return pathname === item.href;
  if (item.key === "properties") {
    return (
      (pathname === item.href || pathname.startsWith(`${item.href}/`)) &&
      !pathname.startsWith(`${item.href}/import`)
    );
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavigationLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavigationItem[];
  pathname: string | null;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Navegación administrativa" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActiveItem(item, pathname);
        const Icon = item.icon;

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-muted text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            href={item.href}
            key={item.key}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SecondaryActions({ organizationSlug }: { organizationSlug: string }) {
  const publicHref = `/${encodeURIComponent(organizationSlug)}`;

  return (
    <div className="flex flex-col gap-1 border-t pt-4">
      <Link
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "justify-start gap-3 px-3 text-muted-foreground hover:text-foreground",
        )}
        href={publicHref}
      >
        <ExternalLink aria-hidden="true" />
        Ver sitio público
      </Link>
      <form action={logout}>
        <Button
          className="w-full justify-start gap-3 px-3 text-muted-foreground hover:text-foreground"
          variant="ghost"
          type="submit"
        >
          <LogOut aria-hidden="true" />
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}

export function AdminSidebar(props: AdminNavigationProps) {
  const pathname = usePathname();
  const items = getNavigationItems(props.organizationSlug, props.role);

  return (
    <aside className="sticky top-0 hidden h-[100dvh] max-h-[100dvh] w-64 shrink-0 border-r bg-card/30 lg:flex lg:flex-col lg:px-4 lg:py-6">
      <div className="flex flex-col gap-1 px-3">
        <Link className="text-lg font-semibold tracking-tight" href={`/admin/${encodeURIComponent(props.organizationSlug)}`}>
          InmoCore
        </Link>
        <p className="truncate text-sm text-muted-foreground">{props.organizationName}</p>
      </div>
      <div className="mt-8 flex min-h-0 flex-1 flex-col gap-8">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavigationLinks items={items} pathname={pathname} />
        </div>
        <div className="flex shrink-0 flex-col gap-4">
          <p className="px-3 text-xs text-muted-foreground">{roleLabels[props.role]}</p>
          <SecondaryActions organizationSlug={props.organizationSlug} />
        </div>
      </div>
    </aside>
  );
}

export function AdminMobileNav(props: AdminNavigationProps) {
  const pathname = usePathname();
  const items = getNavigationItems(props.organizationSlug, props.role);
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Abrir navegación"
        render={<Button size="icon" variant="outline" />}
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent className="max-h-[100dvh] w-[min(20rem,calc(100vw-2rem))] overflow-hidden" side="left">
        <SheetHeader className="border-b px-5 pb-4 pt-6 text-left">
          <SheetTitle>InmoCore</SheetTitle>
          <SheetDescription className="truncate">{props.organizationName}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <NavigationLinks items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
          <div className="mt-8 flex flex-col gap-4 pb-5">
            <p className="text-xs text-muted-foreground">{roleLabels[props.role]}</p>
            <SecondaryActions organizationSlug={props.organizationSlug} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
