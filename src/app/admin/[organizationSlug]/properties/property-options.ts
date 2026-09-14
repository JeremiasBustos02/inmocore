import {
  currencies,
  operationTypes,
  propertyStatuses,
  propertyTypes,
} from "@/db/schema";

export { currencies, operationTypes, propertyStatuses, propertyTypes };

export const operationTypeLabels = {
  sale: "Venta",
  rent: "Alquiler",
} satisfies Record<(typeof operationTypes)[number], string>;

export const propertyTypeLabels = {
  house: "Casa",
  apartment: "Departamento",
  land: "Terreno",
  commercial: "Local",
  office: "Oficina",
  country_house: "Quinta",
  garage: "Cochera",
  other: "Otro",
} satisfies Record<(typeof propertyTypes)[number], string>;

export const propertyStatusLabels = {
  draft: "Borrador",
  available: "Disponible",
  reserved: "Reservada",
  sold: "Vendida",
  rented: "Alquilada",
  archived: "Archivada",
} satisfies Record<(typeof propertyStatuses)[number], string>;
