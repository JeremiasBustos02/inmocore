import type { ReactNode } from "react";

type PublicSiteVariantProps = {
  children: ReactNode;
};

function DefaultPublicSite({ children }: PublicSiteVariantProps) {
  return children;
}

function EditorialPublicSite({ children }: PublicSiteVariantProps) {
  return <div className="public-site-editorial">{children}</div>;
}

export function PublicSiteVariant({
  children,
  siteVariant,
}: PublicSiteVariantProps & { siteVariant: string }) {
  if (siteVariant === "editorial") {
    return <EditorialPublicSite>{children}</EditorialPublicSite>;
  }

  return <DefaultPublicSite>{children}</DefaultPublicSite>;
}
