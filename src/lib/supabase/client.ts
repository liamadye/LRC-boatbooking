import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
    {
      auth: {
        // Callback pages in this app handle code/hash exchange explicitly.
        // Leaving auto-detection on causes a double PKCE exchange race.
        detectSessionInUrl: false,
      },
    }
  );
}
