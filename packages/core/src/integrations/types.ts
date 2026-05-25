import type { FileTreeNode, Package, Preset } from "@create-turbo-stack/schema";

/**
 * Integration plugin contract — a provider owns everything about itself
 * in one place: the catalog deps it adds, the env vars it needs, the
 * inline templates it ships, and the workspace package it scaffolds.
 *
 * Adding a provider (Polar billing, Loops email, Magic Link auth, ...)
 * means writing one entry in the matching category file. catalog,
 * env-chain, and the package resolver all query the registry — there is
 * no parallel switch to keep in sync.
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

  /**
   * Scaffold the workspace package for this provider (e.g.
   * `packages/auth`, `packages/db`). The dispatcher calls this when the
   * provider is the active selection for its category. Use
   * `ctx.makeBase()` for the package.json + tsconfig boilerplate, then
   * push templated source on top. Leave undefined for providers that
   * contribute only deps/env and no package of their own.
   */
  resolvePackageFiles?(preset: Preset, ctx: PackageResolveContext): FileTreeNode[];
}

/**
 * Shared helpers handed to `resolvePackageFiles`. Keeps the package.json
 * + tsconfig boilerplate in one place (base.ts) so providers only
 * describe what's different about them.
 */
export interface PackageResolveContext {
  pkg: Package;
  /** Output directory, e.g. "packages/db". */
  base: string;
  /** Preset scope, e.g. "@acme". */
  scope: string;
  /**
   * Emit package.json + tsconfig.json for this package. `react: true`
   * swaps in the JSX-capable tsconfig and adds React type deps for
   * providers that ship .tsx (PostHog provider, React Email).
   */
  makeBase(opts?: {
    deps?: Record<string, string>;
    devDeps?: Record<string, string>;
    react?: boolean;
  }): FileTreeNode[];
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
