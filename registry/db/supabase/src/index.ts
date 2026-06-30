import { env } from "{{scope}}/env";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase data client (anon key, RLS-enforced). For auth-aware,
 * cookie-bound clients use {{scope}}/auth.
 */
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export { createClient };
