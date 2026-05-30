/**
 * {{scope}}/env — type-safe, validated environment variables.
 *
 * Authoring notes (delete when adapting for a real provider variant):
 *
 *  • This file is committed as-is to the registry. The resolver does plain
 *    string substitution on `{{scope}}` etc. before writing into the user's
 *    monorepo, so a literal `{{scope}}/env` in a TS string survives until
 *    materialize and lands as `@saas/env` (or whatever the preset scope is).
 *
 *  • Imports across the workspace go through `{{scope}}/<pkg-name>` —
 *    NEVER hard-code `@saas/...` here. The user's scope is unknown at
 *    authoring time.
 *
 *  • Anything you read at runtime via `env.SOMETHING` MUST be declared in
 *    the manifest's `envVars` map (with an example value). That's how the
 *    name + example land in `.env.example` on install. Forgetting this is
 *    the #1 bug-source for slot items.
 *
 *  • No conditionals — if your provider has driver-level variations,
 *    split into multiple variants (`env-t3-nextjs`, `env-t3-vite`, …)
 *    rather than branching here.
 */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Server-side env vars — never sent to the browser. Anything that
   * shouldn't leak (DB URLs, API secrets, signing keys) goes here.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },

  /**
   * Client-side env vars — bundled into the browser build. MUST be prefixed
   * with `NEXT_PUBLIC_` for Next.js to expose them, even when the package
   * isn't strictly Next-only. t3-env enforces that prefix automatically.
   */
  client: {},

  /**
   * Real runtime values. On Vercel / serverless this MUST be the literal
   * `process.env`, NOT a destructured subset — bundlers DCE-prune anything
   * not statically referenced and t3-env then fails on "missing" vars.
   */
  runtimeEnv: process.env,

  /**
   * Treat blank strings as undefined so a `.env` line like `FOO=` triggers
   * the "missing" branch instead of failing a `z.string().min(1)` check.
   */
  emptyStringAsUndefined: true,
});
