import Link from "next/link";

export default function InvalidInvitationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">No pudimos aceptar esta invitación</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Puede haber vencido o ya haber sido utilizada. Pedí una nueva invitación a quien administra tu inmobiliaria.
        </p>
        <Link className="mt-6 inline-block text-sm font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/login">
          Ir al inicio de sesión
        </Link>
      </div>
    </main>
  );
}
