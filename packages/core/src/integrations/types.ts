import type { Preset } from "@create-turbo-stack/schema";

/**
 * Integration plugin contract — uniform shape for any provider that
 * contributes catalog deps and/or env vars to the generated project.
 *
 * Adding a new provider (Polar billing, Loops email, Magic Link auth, ...)
 * means writing one entry in the matching category file. env-chain and
 * catalog query the registry — no hardcoded if-cascades to maintain.
 */
export interface IntegrationDefinition {
  category: IntegrationCategory;

  /** Schema discriminant value: "posthog", "clerk", "drizzle", etc. */
  provider: string;

  /** npm packages contributed to the workspace catalog. */
  catalogEntries(preset: Preset): readonly CatalogEntrySpec[];

  /** Environment variables this provider needs (optional). */
  envVars?(preset: Preset): { server?: readonly EnvVarSpec[]; client?: readonly EnvVarSpec[] };

  /**
   * Optional inline Eta templates for this provider. The category key
   * used to register them is `"<integration-category>/<provider>"`
   * (e.g. `"auth/clerk"`, `"email/resend"`). Built-in integrations
   * leave this empty — their templates live in
   * `packages/templates/src/integration/...`.
   *
   * Use this when shipping a provider as a third-party plugin that
   * shouldn't require forking the templates package.
   */
  templates?: Record<string, string>;
}

/**
 * The categories below are the integration "slots" on a Preset.
 * `auth`, `database`, `api` live as top-level discriminated unions on the
 * Preset; the rest live under `integrations.*`.
 */
export type IntegrationCategory =
  | "auth"
  | "database"
  | "api"
  | "analytics"
  | "errorTracking"
  | "email"
  | "rateLimit"
  | "ai";

export interface CatalogEntrySpec {
  name: string;
  version: string;
}

export interface EnvVarSpec {
  name: string;
  zodType: string;
  example: string;
  description: string;
}

export function defineIntegration(def: IntegrationDefinition): IntegrationDefinition {
  return def;
}
