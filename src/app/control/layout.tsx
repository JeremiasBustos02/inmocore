import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export default async function ControlLayout({ children }: { children: ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div>
            <Link className="font-semibold tracking-tight" href="/control">
              InmoCore Control
            </Link>
            <p className="text-xs text-muted-foreground">Provider backoffice</p>
          </div>
          <form action={logout}>
            <Button size="sm" type="submit" variant="outline">Cerrar sesión</Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
