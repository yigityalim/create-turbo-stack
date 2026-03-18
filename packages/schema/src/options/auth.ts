import { z } from "zod";

export const AuthProviderSchema = z.enum([
  "supabase-auth",
  "better-auth",
  "clerk",
  "next-auth",
  "lucia",
  "none",
]);
export type AuthProvider = z.infer<typeof AuthProviderSchema>;

export const AuthSchema = z.object({
  provider: AuthProviderSchema.default("none"),
  rbac: z.boolean().default(false),
  entitlements: z.boolean().default(false),
});
export type Auth = z.infer<typeof AuthSchema>;
