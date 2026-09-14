export const publicPropertyTypeOptions = [
  { value: "house", label: "Casa" },
  { value: "apartment", label: "Departamento" },
  { value: "land", label: "Terreno" },
  { value: "commercial", label: "Local" },
  { value: "office", label: "Oficina" },
  { value: "country_house", label: "Quinta" },
  { value: "garage", label: "Cochera" },
  { value: "other", label: "Otro" },
] as const;

export const publicOperationLabels = {
  sale: "Venta",
  rent: "Alquiler",
} as const;

export const publicPropertyTypeLabels = Object.fromEntries(
  publicPropertyTypeOptions.map(({ value, label }) => [value, label]),
) as Record<(typeof publicPropertyTypeOptions)[number]["value"], string>;

export function formatPublicPrice(
  priceAmount: number | null,
  currency: "ARS" | "USD" | null,
) {
  if (priceAmount === null || currency === null) return "Consultar";

  const amount = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: priceAmount % 100 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(priceAmount / 100);

  return `${currency} ${amount}`;
}
