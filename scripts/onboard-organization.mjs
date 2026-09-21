import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const args = parseArgs(process.argv.slice(2));
const requiredArgs = ["name", "slug", "owner-email"];
const missingArgs = requiredArgs.filter((name) => !args[name]);

if (missingArgs.length > 0) {
  fail(`Faltan argumentos: ${missingArgs.map((name) => `--${name}`).join(", ")}`);
}

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!databaseUrl || !supabaseUrl || !serviceRoleKey) {
  fail("Requeridos: DIRECT_DATABASE_URL (o DATABASE_URL), NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
}

const slug = args.slug.toLowerCase();
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
  fail("El slug debe usar sólo minúsculas, números y guiones, con máximo 80 caracteres.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args["owner-email"])) {
  fail("El email del owner no es válido.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });
const uploadedPaths = [];
let ownerId;

try {
  const inviteOptions = process.env.SUPABASE_INVITE_REDIRECT_URL
    ? {
        redirectTo: process.env.SUPABASE_INVITE_REDIRECT_URL,
        data: args["owner-name"] ? { full_name: args["owner-name"].trim() } : undefined,
      }
    : args["owner-name"]
      ? { data: { full_name: args["owner-name"].trim() } }
      : undefined;
  const { data: invitedUser, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    args["owner-email"].toLowerCase(),
    inviteOptions,
  );
  if (inviteError || !invitedUser.user) {
    fail(inviteError?.message ?? "No se pudo invitar al owner.");
  }
  ownerId = invitedUser.user.id;

  const organizationId = randomUUID();
  const assets = {};
  for (const asset of ["logo", "hero"]) {
    const filePath = args[asset];
    if (!filePath) continue;
    const extension = imageExtension(filePath);
    if (!extension) fail(`--${asset} debe ser una imagen .jpg, .jpeg, .png o .webp.`);
    const storagePath = `${organizationId}/${asset}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("organization-assets")
      .upload(storagePath, await readFile(filePath), {
        contentType: contentType(extension),
        upsert: false,
      });
    if (uploadError) fail(`No se pudo subir ${asset}: ${uploadError.message}`);
    uploadedPaths.push(storagePath);
    assets[asset] = storagePath;
  }

  await sql.begin(async (transaction) => {
    await transaction.unsafe(
      `insert into organizations
        (id, name, slug, whatsapp_phone, contact_address, contact_email, contact_phone,
         logo_path, primary_color, hero_image_path, hero_title, hero_subtitle)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        organizationId,
        args.name.trim(),
        slug,
        normalizePhone(args.whatsapp),
        nullable(args.address),
        nullable(args["public-email"]),
        nullable(args.phone),
        assets.logo ?? null,
        normalizeColor(args["primary-color"]),
        assets.hero ?? null,
        nullable(args["hero-title"]),
        nullable(args["hero-subtitle"]),
      ],
    );
    await transaction.unsafe(
      `insert into memberships (organization_id, user_id, role) values ($1, $2, 'owner')`,
      [organizationId, ownerId],
    );
  });

  console.log(`Organización creada: ${slug}`);
  console.log(`Owner invitado: ${args["owner-email"]}`);
} catch (error) {
  if (uploadedPaths.length > 0) {
    await supabase.storage.from("organization-assets").remove(uploadedPaths);
  }
  if (ownerId) {
    await supabase.auth.admin.deleteUser(ownerId);
  }
  fail(error instanceof Error ? error.message : "No se pudo completar el alta.");
} finally {
  await sql.end();
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) fail(`Argumento inesperado: ${value}`);
    const name = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) fail(`Falta el valor de --${name}.`);
    result[name] = next;
    index += 1;
  }
  return result;
}

function nullable(value) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizePhone(value) {
  const normalized = nullable(value)?.replace(/[+().\s-]/g, "") ?? null;
  if (normalized && !/^\d{8,15}$/.test(normalized)) fail("El WhatsApp debe tener entre 8 y 15 dígitos.");
  return normalized;
}

function normalizeColor(value) {
  const normalized = nullable(value)?.toLowerCase() ?? null;
  if (normalized && !/^#[0-9a-f]{6}$/.test(normalized)) fail("--primary-color debe tener formato #RRGGBB.");
  return normalized;
}

function imageExtension(filePath) {
  const extension = path.extname(filePath).toLowerCase().replace(".", "");
  return extension === "jpeg" ? "jpg" : ["jpg", "png", "webp"].includes(extension) ? extension : null;
}

function contentType(extension) {
  return extension === "jpg" ? "image/jpeg" : `image/${extension}`;
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}
