import { env } from "{{scope}}/env";
import { type CookieMethodsServer, createBrowserClient, createServerClient } from "@supabase/ssr";

/** Browser Supabase client — use in client components. */
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Cookie-bound server client. Pass your framework's cookie adapter
 * (`getAll` + `setAll`) — e.g. built from Next.js `cookies()` in a Server
 * Component, Route Handler, or middleware.
 */
export function createServerSupabaseClient(cookies: CookieMethodsServer) {
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies,
  });
}
