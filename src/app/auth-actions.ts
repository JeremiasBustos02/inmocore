"use server";

import { redirect } from "next/navigation";
import { isPlatformAdminUser } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/login?error=invalid_credentials");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=invalid_credentials");
  }

  redirect(data.user && isPlatformAdminUser(data.user.id) ? "/control" : "/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
