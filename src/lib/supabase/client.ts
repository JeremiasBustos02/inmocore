import { createBrowserClient } from "@supabase/ssr";

export function createClient(options?: { detectSessionInUrl?: boolean }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required to use Supabase.",
    );
  }

  return options ? createBrowserClient(url, publishableKey, {
    auth: { detectSessionInUrl: options.detectSessionInUrl },
    isSingleton: false,
  }) : createBrowserClient(url, publishableKey);
}
