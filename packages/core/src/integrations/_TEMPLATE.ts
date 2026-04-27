/**
 * TEMPLATE — copy the entry below to add a new integration provider.
 *
 * This file is NOT imported anywhere. It exists as a typed reference
 * so the pattern can't drift.
 *
 * ─── How to add a provider (e.g. Polar billing, Loops email, Magic Link auth) ──
 *
 *   1. Decide the category: auth | database | api | analytics |
 *      errorTracking | email | rateLimit | ai.
 *
 *   2. Add the provider value to the matching schema enum in
 *      `packages/schema/src/options/<file>.ts`. For example:
 *        EmailSchema = z.enum(["react-email-resend", "nodemailer", "loops", "none"])
 *
 *   3. Open the existing category file in this directory
 *      (e.g. `email.ts`) and append a `defineIntegration({...})` entry
 *      there. Don't create a new file per provider — keeping providers
 *      of the same category co-located makes the catalog readable.
 *
 *   4. Add the new entry to the category's exported array (e.g.
 *      `emailIntegrations`). `integrations/index.ts` registers them in
 *      bulk; you don't need to edit it.
 *
 *   5. Add the npm version to `packages/core/src/wiring/versions.ts`
 *      so `catalogEntries` can reference it.
 *
 * env-chain.ts and catalog.ts pick up new providers automatically —
 * they iterate the registry. The registry-sync test will then require
 * an entry for every non-"none" enum value, so the contract is enforced.
 */

import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

export const templateIntegration = defineIntegration({
  // ── Identity ──────────────────────────────────────────────────────
  category: "email", // ← auth | database | api | analytics | errorTracking | email | rateLimit | ai
  provider: "_example", // ← schema enum value (e.g. "loops", "polar", "magic-link")

  // ── Catalog entries ───────────────────────────────────────────────
  // npm packages this provider contributes to the workspace catalog.
  // Each consumer (apps, packages) writes "<dep>": "catalog:" and the
  // root package.json catalog block resolves the version from here.
  catalogEntries: () => [
    // Add `loops: "^1.2.3"` to VERSIONS first, then:
    // { name: "loops", version: VERSIONS.loops },

    // Reference an existing version so the import isn't flagged unused
    // in this template; replace with the real version when implementing.
    { name: "_example_pkg", version: VERSIONS.zod },
  ],

  // ── Environment variables ─────────────────────────────────────────
  // Optional. Server-only secrets MUST live under `server` so the
  // env package doesn't expose them to client bundles.
  // Public values for the client (Next.js: NEXT_PUBLIC_*) go under `client`.
  envVars: () => ({
    server: [
      {
        name: "EXAMPLE_API_KEY",
        zodType: "z.string().min(1)",
        example: "ex_...",
        description: "Example provider API key",
      },
    ],
    // client: [
    //   {
    //     name: "NEXT_PUBLIC_EXAMPLE_PROJECT_ID",
    //     zodType: "z.string().min(1)",
    //     example: "proj_...",
    //     description: "Example provider project ID (public)",
    //   },
    // ],
  }),
});
