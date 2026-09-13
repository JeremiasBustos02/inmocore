import { redirect } from "next/navigation";
import { login } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUserId } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getAuthenticatedUserId()) {
    redirect("/admin");
  }

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Ingresar</h1>
          <p className="text-sm text-muted-foreground">
            Accedé al panel de tu inmobiliaria.
          </p>
        </div>

        <form action={login} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Contraseña
            </label>
            <input
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {error === "invalid_credentials" ? (
            <p className="text-sm text-destructive" role="alert">
              El email o la contraseña son incorrectos.
            </p>
          ) : null}

          <Button className="w-full" type="submit">
            Ingresar
          </Button>
        </form>
      </div>
    </main>
  );
}
