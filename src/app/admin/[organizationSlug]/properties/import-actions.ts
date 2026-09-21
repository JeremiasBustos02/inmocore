"use server";

import { and, eq, inArray } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { requireAuthenticatedUserId } from "@/lib/auth";
import { requireOrganizationMembership } from "@/lib/organizations";
import {
  currencies,
  operationTypes,
  operationTypeLabels,
  propertyStatuses,
  propertyStatusLabels,
  propertyTypes,
  propertyTypeLabels,
} from "./property-options";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 1000;
const MAX_TEXT_LENGTH = 5000;

const headers = {
  reference: ["referencia", "reference"],
  title: ["título", "titulo", "title"],
  description: ["descripción", "descripcion", "description"],
  operationType: ["operación", "operacion", "operationtype"],
  propertyType: ["tipo", "propertytype"],
  status: ["estado", "status"],
  price: ["precio", "price"],
  currency: ["moneda", "currency"],
  isPublished: ["publicada", "publicado", "ispublished"],
  isFeatured: ["destacada", "destacado", "isfeatured"],
  bedrooms: ["dormitorios", "bedrooms"],
  bathrooms: ["baños", "banos", "bathrooms"],
  rooms: ["ambientes", "rooms"],
  garageSpaces: ["cocheras", "garage spaces", "garagespaces"],
  coveredAreaM2: ["superficie cubierta", "superficiecubierta", "coveredaream2"],
  totalAreaM2: ["superficie total", "superficietotal", "totalaream2"],
  address: ["dirección", "direccion", "address"],
  city: ["ciudad", "city"],
  province: ["provincia", "province"],
  country: ["país", "pais", "country"],
} as const;

type HeaderKey = keyof typeof headers;
type ImportValues = {
  reference: string;
  title: string;
  description: string | null;
  operationType: (typeof operationTypes)[number];
  propertyType: (typeof propertyTypes)[number];
  status: (typeof propertyStatuses)[number];
  priceAmount: number | null;
  currency: (typeof currencies)[number] | null;
  address: string | null;
  city: string;
  province: string;
  country: string;
  bedrooms: number | null;
  bathrooms: number | null;
  rooms: number | null;
  garageSpaces: number | null;
  coveredAreaM2: number | null;
  totalAreaM2: number | null;
  isPublished: boolean;
  isFeatured: boolean;
};

type ParsedRow = {
  row: number;
  reference: string;
  title: string;
  values: ImportValues | null;
  errors: string[];
};

type ParseFailure = { error: string };
type ParsedFile = { rows: ParsedRow[] } | ParseFailure;

export type ImportPreview = {
  ok: true;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  rows: Array<Pick<ParsedRow, "row" | "reference" | "title" | "errors">>;
};

type ImportFailure = { ok: false; message: string };
export type ImportActionResult = ImportPreview | ImportFailure | ImportResult;

export type ImportResult = {
  ok: true;
  result: true;
  totalRows: number;
  importedRows: number;
  omittedRows: number;
  errorRows: number;
  duplicateRows: number;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseEnum<T extends string>(
  value: unknown,
  technicalValues: readonly T[],
  labels: Record<T, string>,
) {
  const normalized = normalize(cellText(value));
  return technicalValues.find(
    (option) => normalized === normalize(option) || normalized === normalize(labels[option]),
  ) ?? null;
}

function parseInteger(value: unknown, minimum: number, label: string, errors: string[]) {
  const text = cellText(value);
  if (!text) return null;
  if (!/^\d+$/.test(text)) {
    errors.push(`${label}: debe ser un número entero no negativo.`);
    return null;
  }
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number < minimum) {
    errors.push(`${label}: debe ser un número válido mayor o igual a ${minimum}.`);
    return null;
  }
  return number;
}

function parsePrice(value: unknown, errors: string[]) {
  const text = cellText(value);
  if (!text) return null;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) {
    errors.push("Precio: debe ser un número no negativo con hasta dos decimales.");
    return null;
  }
  const normalized = text.replace(",", ".");
  const [whole, decimal = ""] = normalized.split(".");
  const amount = Number(`${whole}${decimal.padEnd(2, "0")}`);
  if (!Number.isSafeInteger(amount)) {
    errors.push("Precio: el valor es demasiado grande.");
    return null;
  }
  return amount;
}

function parseBoolean(value: unknown, label: string, errors: string[]) {
  const normalized = normalize(cellText(value));
  if (!normalized) return false;
  if (["si", "sí", "true", "1", "yes", "publicada", "publicado"].includes(normalized)) return true;
  if (["no", "false", "0", "not", "nopublicada", "nopublicado"].includes(normalized)) return false;
  errors.push(`${label}: usá Sí o No.`);
  return false;
}

function boundedText(value: unknown, label: string, errors: string[], required = false) {
  const text = cellText(value);
  if (required && !text) errors.push(`${label}: es obligatorio.`);
  if (text.length > MAX_TEXT_LENGTH) errors.push(`${label}: supera el máximo de ${MAX_TEXT_LENGTH} caracteres.`);
  return text || null;
}

function parseRow(raw: unknown[], columns: Map<HeaderKey, number>, row: number): ParsedRow {
  const get = (key: HeaderKey) => raw[columns.get(key) ?? -1];
  const errors: string[] = [];
  const reference = boundedText(get("reference"), "Referencia", errors, true) ?? "";
  const title = boundedText(get("title"), "Título", errors, true) ?? "";
  const operationType = parseEnum(get("operationType"), operationTypes, operationTypeLabels);
  const propertyType = parseEnum(get("propertyType"), propertyTypes, propertyTypeLabels);
  const status = parseEnum(get("status") || "Borrador", propertyStatuses, propertyStatusLabels);
  const city = boundedText(get("city"), "Ciudad", errors, true) ?? "";
  const province = boundedText(get("province"), "Provincia", errors, true) ?? "";
  const country = boundedText(get("country"), "País", errors) ?? "Argentina";
  const description = boundedText(get("description"), "Descripción", errors);
  const address = boundedText(get("address"), "Dirección", errors);
  const priceAmount = parsePrice(get("price"), errors);
  const currency = priceAmount === null ? null : parseEnum(get("currency"), currencies, { ARS: "Pesos", USD: "Dólares" });

  if (!operationType) errors.push("Operación: valor desconocido. Usá Venta o Alquiler.");
  if (!propertyType) errors.push("Tipo: valor desconocido. Usá un tipo de propiedad válido.");
  if (!status) errors.push("Estado: valor desconocido. Usá Disponible, Borrador u otro estado válido.");
  if (priceAmount !== null && !currency) errors.push("Moneda: es obligatoria cuando se informa un precio (ARS o USD).");

  const values: ImportValues | null = operationType && propertyType && status
    ? {
        reference,
        title,
        description,
        operationType,
        propertyType,
        status,
        priceAmount,
        currency,
        address,
        city,
        province,
        country,
        bedrooms: parseInteger(get("bedrooms"), 0, "Dormitorios", errors),
        bathrooms: parseInteger(get("bathrooms"), 0, "Baños", errors),
        rooms: parseInteger(get("rooms"), 0, "Ambientes", errors),
        garageSpaces: parseInteger(get("garageSpaces"), 0, "Cocheras", errors),
        coveredAreaM2: parseInteger(get("coveredAreaM2"), 1, "Superficie cubierta", errors),
        totalAreaM2: parseInteger(get("totalAreaM2"), 1, "Superficie total", errors),
        isPublished: parseBoolean(get("isPublished"), "Publicada", errors),
        isFeatured: parseBoolean(get("isFeatured"), "Destacada", errors),
      }
    : null;

  if (values && values.isPublished && !["available", "reserved"].includes(values.status)) {
    values.isPublished = false;
  }

  return { row, reference, title, values, errors };
}

async function parseFile(file: File): Promise<ParsedFile> {
  if (!file || !file.name.toLowerCase().endsWith(".xlsx")) {
    return { error: "Seleccioná un archivo .xlsx." } as const;
  }
  if (file.size > MAX_FILE_BYTES) return { error: "El archivo supera el máximo de 5 MB." } as const;

  const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { error: "El archivo no contiene hojas." } as const;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: true,
  });
  const headerRow = rows[0];
  if (!headerRow) return { error: "El archivo está vacío." } as const;

  const columns = new Map<HeaderKey, number>();
  headerRow.forEach((value, index) => {
    const normalized = normalize(cellText(value));
    (Object.keys(headers) as HeaderKey[]).forEach((key) => {
      if (headers[key].some((alias) => normalize(alias) === normalized)) columns.set(key, index);
    });
  });
  const requiredHeaders: HeaderKey[] = ["reference", "title", "operationType", "propertyType", "city", "province"];
  const missingHeaders = requiredHeaders.filter((key) => !columns.has(key));
  if (missingHeaders.length) {
    return { error: `Faltan columnas obligatorias: ${missingHeaders.map((key) => headers[key][0]).join(", ")}.` } as const;
  }

  const dataRows = rows.slice(1).filter((raw) => raw.some((value) => cellText(value) !== ""));
  if (dataRows.length > MAX_ROWS) return { error: `El archivo supera el máximo de ${MAX_ROWS} filas.` } as const;
  return { rows: dataRows.map((raw, index) => parseRow(raw, columns, index + 2)) } as const;
}

async function buildPreview(file: File, organizationId: string): Promise<ImportPreview | ParseFailure> {
  const parsed = await parseFile(file);
  if ("error" in parsed) return parsed;
  const references = [...new Set(parsed.rows.map((row) => row.reference).filter(Boolean))];
  const existing = references.length
    ? await db.select({ reference: properties.reference }).from(properties).where(and(eq(properties.organizationId, organizationId), inArray(properties.reference, references)))
    : [];
  const existingReferences = new Set(existing.map((property) => property.reference));
  const seenReferences = new Set<string>();
  for (const row of parsed.rows) {
    if (row.reference && seenReferences.has(row.reference)) row.errors.push("Referencia duplicada dentro del archivo.");
    if (row.reference && existingReferences.has(row.reference)) row.errors.push("La referencia ya existe en esta organización.");
    if (row.reference) seenReferences.add(row.reference);
  }
  const rows = parsed.rows.map((row) => ({
    row: row.row,
    reference: row.reference,
    title: row.title,
    errors: row.errors,
  }));
  const validRows = parsed.rows.filter((row) => row.errors.length === 0).length;
  return {
    ok: true as const,
    totalRows: parsed.rows.length,
    validRows,
    invalidRows: parsed.rows.length - validRows,
    duplicateRows: parsed.rows.filter((row) => row.errors.some((error) => error.includes("duplicada") || error.includes("ya existe"))).length,
    rows,
  } satisfies ImportPreview;
}

export async function previewPropertyImport(organizationSlug: string, formData: FormData): Promise<ImportActionResult> {
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);
  if (!membership) return { ok: false, message: "No tenés acceso a esta organización." };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { ok: false, message: "Sólo owners y admins pueden importar propiedades." };
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Seleccioná un archivo .xlsx." };
  const preview = await buildPreview(file, membership.id);
  return "error" in preview ? { ok: false, message: preview.error } : preview;
}

export async function confirmPropertyImport(organizationSlug: string, formData: FormData): Promise<ImportActionResult> {
  const userId = await requireAuthenticatedUserId();
  const membership = await requireOrganizationMembership(userId, organizationSlug);
  if (!membership) return { ok: false, message: "No tenés acceso a esta organización." };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { ok: false, message: "Sólo owners y admins pueden importar propiedades." };
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Seleccioná nuevamente el archivo .xlsx." };
  const parsed = await parseFile(file);
  if ("error" in parsed) return { ok: false, message: parsed.error };
  const preview = await buildPreview(file, membership.id);
  if ("error" in preview) return { ok: false, message: preview.error };
  const validRows = parsed.rows.filter((row) => !row.errors.length);
  const inserted = await db.transaction(async (tx) => {
    if (!validRows.length) return [];
    return tx.insert(properties).values(validRows.map((row) => ({ organizationId: membership.id, ...row.values! }))).onConflictDoNothing({ target: [properties.organizationId, properties.reference] }).returning({ reference: properties.reference });
  });
  return {
    ok: true,
    result: true,
    totalRows: parsed.rows.length,
    importedRows: inserted.length,
    omittedRows: parsed.rows.length - inserted.length,
    errorRows: parsed.rows.filter((row) => row.errors.length > 0).length,
    duplicateRows: preview.duplicateRows + (validRows.length - inserted.length),
  };
}
