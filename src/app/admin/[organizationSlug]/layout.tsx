import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { AdminMobileNav, AdminSidebar } from "./admin-navigation";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";
import { getInvitationOrganization } from "@/lib/invitation-onboarding";

type AdminLayoutProps = {
  children: ReactNode;
  params: Promise<{ organizationSlug: string }>;
};

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const userId = await requireAuthenticatedUserId();
  if (await getInvitationOrganization(userId)) redirect("/auth/set-password");
  const { organizationSlug } = await params;
  const membership = await requireOrganizationMembership(userId, organizationSlug);

  if (!membership) {
    notFound();
  }

  const navigationProps = {
    organizationName: membership.name,
    organizationSlug,
    role: membership.role,
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <AdminSidebar {...navigationProps} />
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b bg-background px-4 py-3 lg:hidden sm:px-6">
          <AdminMobileNav {...navigationProps} />
          <div className="min-w-0">
            <p className="font-semibold tracking-tight">InmoCore</p>
            <p className="truncate text-xs text-muted-foreground">{membership.name}</p>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
