export function normalizeSlug(value) {
  const slug = value?.trim().toLowerCase();
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    throw new Error("El slug debe usar sólo minúsculas, números y guiones, con máximo 80 caracteres.");
  }
  return slug;
}

/** @param {string | undefined | null} value @param {string | undefined | null} platformHostname */
export function normalizeCustomDomain(value, platformHostname = null) {
  const domain = value?.trim().toLowerCase().replace(/\.$/, "") || null;
  if (!domain) return null;
  if (
    domain.length > 253 ||
    domain.includes(":") ||
    domain.includes("/") ||
    domain.includes("@") ||
    domain.includes("?") ||
    domain.includes("#")
  ) {
    throw new Error("--custom-domain debe ser un hostname sin protocolo, puerto ni path.");
  }
  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length === 0 ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    throw new Error("--custom-domain no es un hostname válido.");
  }
  if (domain === platformHostname || domain.endsWith(".vercel.app")) {
    throw new Error("--custom-domain no puede ser el hostname de la plataforma o de Vercel.");
  }
  return domain;
}

export function normalizeSiteVariant(value) {
  const siteVariant = value?.trim().toLowerCase() || "default";
  if (siteVariant !== "default" && siteVariant !== "editorial") {
    throw new Error("--site-variant debe ser default o editorial.");
  }
  return siteVariant;
}
