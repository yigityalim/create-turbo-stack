import { env } from "{{scope}}/env";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true },
  // TODO: add a database adapter bound to your db package, e.g.
  //   import { drizzleAdapter } from "better-auth/adapters/drizzle";
  //   import { db } from "{{scope}}/db";
  //   database: drizzleAdapter(db, { provider: "pg" }),
  // Without one, Better Auth uses in-memory storage (dev only).
});
