import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const args = parseArgs(process.argv.slice(2));
const requiredArgs = ["organization", "email"];
const missingArgs = requiredArgs.filter((name) => !args[name]);

if (missingArgs.length > 0) {
  fail(`Faltan argumentos: ${missingArgs.map((name) => `--${name}`).join(", ")}`);
}

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const role = args.role ?? "agent";
const mode = args.mode ?? "invite";
const email = args.email.trim().toLowerCase();
const slug = args.organization.trim().toLowerCase();

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
  fail("La organización debe ser un slug válido de hasta 80 caracteres.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail("El email no es válido.");
}
if (!["owner", "admin", "agent"].includes(role)) {
  fail("--role debe ser owner, admin o agent.");
}
if (!["invite", "create"].includes(mode)) {
  fail("--mode debe ser invite o create.");
}
if (mode === "create" && !process.env.SUPABASE_MEMBER_PASSWORD) {
  fail("--mode create requiere SUPABASE_MEMBER_PASSWORD sólo en el entorno local del operador.");
}
if (!databaseUrl || !supabaseUrl || !secretKey) {
  fail("Requeridos: DIRECT_DATABASE_URL (o DATABASE_URL), NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY.");
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });
let createdUserId;

try {
  const [organization] = await sql`
    select id, name
    from organizations
    where slug = ${slug}
    limit 1
  `;
  if (!organization) {
    throw new Error(`No existe una organización con slug "${slug}".`);
  }

  const existingUser = await findUserByEmail(supabase, email);
  let userId = existingUser?.id;

  if (userId) {
    const [existingMembership] = await sql`
      select role
      from memberships
      where organization_id = ${organization.id}
        and user_id = ${userId}
      limit 1
    `;
    if (existingMembership) {
      throw new Error(`El usuario ${email} ya tiene membership en "${slug}" con rol ${existingMembership.role}.`);
    }
  } else {
    userId = await createUser(supabase, email, mode, args.name);
    createdUserId = userId;
  }

  await sql.begin(async (transaction) => {
    const inserted = await transaction`
      insert into memberships (organization_id, user_id, role)
      values (${organization.id}, ${userId}, ${role})
      on conflict (organization_id, user_id) do nothing
      returning organization_id
    `;
    if (inserted.length === 0) {
      throw new Error(`El usuario ${email} ya tiene membership en "${slug}".`);
    }
  });

  console.log(`Membership creada: ${email} -> ${slug} (${role})`);
  console.log(mode === "invite" && !existingUser ? "Usuario invitado por email." : "Usuario existente asociado.");
} catch (error) {
  if (createdUserId) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(createdUserId);
    if (deleteError) {
      console.error(`Advertencia: no se pudo compensar el usuario recién creado (${createdUserId}): ${deleteError.message}`);
    } else {
      console.error("Se eliminó el usuario creado por esta ejecución como compensación.");
    }
  }
  fail(error instanceof Error ? error.message : "No se pudo completar el alta del miembro.");
} finally {
  await sql.end();
}

async function findUserByEmail(client, targetEmail) {
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`No se pudo consultar Supabase Auth: ${error.message}`);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === targetEmail);
    if (user) return user;
    if (data.users.length < perPage) return null;
  }
}

async function createUser(client, targetEmail, targetMode, name) {
  const metadata = name?.trim() ? { full_name: name.trim() } : undefined;
  if (targetMode === "create") {
    const { data, error } = await client.auth.admin.createUser({
      email: targetEmail,
      password: process.env.SUPABASE_MEMBER_PASSWORD,
      email_confirm: true,
      ...(metadata ? { user_metadata: metadata } : {}),
    });
    if (error || !data.user) throw new Error(error?.message ?? "No se pudo crear el usuario.");
    return data.user.id;
  }

  const inviteOptions = process.env.SUPABASE_INVITE_REDIRECT_URL
    ? { redirectTo: process.env.SUPABASE_INVITE_REDIRECT_URL, ...(metadata ? { data: metadata } : {}) }
    : metadata
      ? { data: metadata }
      : undefined;
  const { data, error } = await client.auth.admin.inviteUserByEmail(targetEmail, inviteOptions);
  if (error || !data.user) throw new Error(error?.message ?? "No se pudo invitar al usuario.");
  return data.user.id;
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

function fail(message) {
  console.error(`Error: ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}
