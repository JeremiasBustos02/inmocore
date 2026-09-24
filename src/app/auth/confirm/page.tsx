import { InviteConfirmation } from "./invite-confirmation";

type ConfirmPageProps = {
  searchParams: Promise<{ organization?: string }>;
};

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const { organization } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Aceptando invitación</h1>
        <p className="mt-2 text-sm text-muted-foreground" role="status">Estamos preparando tu acceso...</p>
        <InviteConfirmation organizationSlug={organization} />
      </div>
    </main>
  );
}
