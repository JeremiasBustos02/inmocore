import { createClient } from "@supabase/supabase-js";

function getPlatformSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    throw new Error("SUPABASE_SECRET_KEY es requerido para las acciones administrativas de Supabase.");
  }

  return createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function findAuthUserByEmail(email: string) {
  const supabase = getPlatformSupabase();
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < perPage) return null;
  }
}

export async function inviteAuthUser(email: string, redirectTo: string) {
  const supabase = getPlatformSupabase();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) throw error;
  if (!data.user) throw new Error("No se pudo invitar al usuario.");
  return data.user;
}

export async function createDemoAuthUser(email: string, password: string) {
  const supabase = getPlatformSupabase();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "No se pudo crear el usuario demo.");
  }
  return data.user;
}

export async function deleteAuthUser(userId: string) {
  const supabase = getPlatformSupabase();
  return supabase.auth.admin.deleteUser(userId);
}
