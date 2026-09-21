import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import { getBrandForeground, getSafeBrandColor } from "@/lib/organization-assets";
import { getPublicOrganization } from "./public-data";

export default async function PublicOrganizationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const organization = await getPublicOrganization(organizationSlug);
  if (!organization) notFound();

  const primaryColor = getSafeBrandColor(organization.primaryColor);
  return (
    <div
      style={{
        "--brand-primary": primaryColor,
        "--brand-primary-foreground": getBrandForeground(organization.primaryColor),
      } as CSSProperties}
    >
      {children}
    </div>
  );
}
