import { z } from "zod";

/**
 * CTS package registry — shadcn's registry model, adapted from React
 * components to whole Turborepo workspace packages.
 *
 * `cts add <name>` resolves a `PackageRegistryItem` (from the built-in
 * registry or a remote URL) and writes `packages/<name>` into an existing
 * monorepo: files to disk, deps into the catalog, env vars into the env
 * package — all through the diff/apply engine, with a preview first. The
 * code is copied and visible, not hidden behind an npm dependency.
 *
 * Authoring: write real files under `registry/<name>/`, declare the item in
 * `registry/registry.json`, and `bun run build:registry` inlines the file
 * contents into `apps/web/public/r/<name>.json` (+ the `/r/registry.json`
 * index). Same producer/consumer split as `.eta → templates-map`.
 */

export const RegistryFileTypeSchema = z.enum([
  /** Written under `packages/<name>/` (the common case). */
  "registry:source",
  /** Written to an explicit `target` anywhere in the repo. */
  "registry:file",
]);
export type RegistryFileType = z.infer<typeof RegistryFileTypeSchema>;

export const RegistryFileSchema = z.object({
  /** Path relative to the package root, e.g. "src/index.ts". */
  path: z.string().min(1),
  /** File contents. Inlined by the registry build; omitted in source items. */
  content: z.string().optional(),
  /** Explicit write target; defaults to `packages/<name>/<path>`. */
  target: z.string().optional(),
  type: RegistryFileTypeSchema.default("registry:source"),
});
export type RegistryFile = z.infer<typeof RegistryFileSchema>;

export const PackageBuildModeSchema = z.enum([
  /** Internal package: exports `./src` directly, no build step (JIT). */
  "none",
  /** Compiled package: tsup build → `dist`, for publishable packages. */
  "tsup",
]);
export type PackageBuildMode = z.infer<typeof PackageBuildModeSchema>;

/**
 * Runtime the package targets. A hint that tunes the generated tsconfig:
 * `node` adds `@types/node` + `types: ["node"]`; `browser` / `universal`
 * leave types to `lib`. An explicit `lib` always wins. Optional — omit it
 * for plain ECMAScript with no platform globals.
 */
export const PackageEnvironmentSchema = z.enum(["node", "browser", "universal"]);
export type PackageEnvironment = z.infer<typeof PackageEnvironmentSchema>;

/**
 * Slot an item fills inside a preset. Drives the registry-first
 * resolver: when the preset says `database.strategy = "drizzle"` +
 * `driver = "postgres"`, the engine looks for the item with
 * `slot: "db"` and `variant: "drizzle-postgres"`.
 *
 * Items WITHOUT a slot (the default) are "add-ons" — pure `cts add`
 * targets like the existing `crypto` / `security` / `session` packages.
 * Items WITH a slot are "first-party": engine pulls them in based on
 * preset choices, never via `cts add`.
 *
 * `app` covers framework skeletons (Next.js, Expo, SvelteKit, …), one
 * per `App["type"]`. `auth`, `db`, `api`, `env`, and the optional
 * integrations (`email`, `monitoring`, `analytics`, `rate-limit`, `ai`,
 * `cache`) cover their matching preset slots — the variant identifies
 * the specific provider/driver inside the slot. `typescript-config`
 * and `ui` are structural slots not driven by an enum.
 */
export const PackageSlotSchema = z.enum([
  "app",
  "auth",
  "db",
  "api",
  "env",
  "email",
  "monitoring",
  "analytics",
  "rate-limit",
  "ai",
  "cache",
  "typescript-config",
  "ui",
]);
export type PackageSlot = z.infer<typeof PackageSlotSchema>;

export const PackageRegistryItemSchema = z.object({
  $schema: z.string().optional(),
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "package name must be kebab-case"),
  type: z.literal("registry:package").default("registry:package"),
  title: z.string().optional(),
  description: z.string(),
  author: z.string().optional(),
  /** npm runtime deps as "name" or "name@version"; merged into the catalog. */
  dependencies: z.array(z.string()).default([]),
  /** npm dev deps as "name" or "name@version"; merged into the catalog. */
  devDependencies: z.array(z.string()).default([]),
  /** Other registry packages required first (name or URL). */
  registryDependencies: z.array(z.string()).default([]),
  /**
   * Extra package.json scripts merged on top of the engine's defaults
   * (`lint`, `type-check`). Lets a package ship its own tooling commands —
   * `prisma generate` on `postinstall`, `drizzle-kit` migration scripts, etc.
   */
  scripts: z.record(z.string(), z.string()).default({}),
  /**
   * Env vars the package needs: name → example value. Names MUST be valid
   * shell identifiers and values single-line — these are interpolated into the
   * generated env package (`createEnv`) and `.env.example`, so an unvalidated
   * key/value would be a code/line-injection vector for third-party registries.
   */
  envVars: z
    .record(
      z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "env var name must be a valid identifier"),
      z.string().regex(/^[^\n\r]*$/, "env var example value must be single-line"),
    )
    .default({}),
  /** Subpath exports the generated package.json declares. */
  exports: z.array(z.string()).default(["."]),
  /**
   * TypeScript `lib` for this package, e.g. ["ES2022", "DOM"] for code that
   * uses Web APIs (fetch/Request/Response). Defaults to the tsconfig base.
   */
  lib: z.array(z.string()).optional(),
  /** Target runtime; tunes generated tsconfig (`node` → @types/node). */
  environment: PackageEnvironmentSchema.optional(),
  /** Internal (source export) by default; "tsup" for publishable packages. */
  build: PackageBuildModeSchema.default("none"),
  /**
   * Preset slot this item fills (first-party items only — leave unset for
   * `cts add` add-ons). See `PackageSlotSchema`.
   */
  slot: PackageSlotSchema.optional(),
  /**
   * Variant within the slot. The engine resolves a preset to an item by
   * matching `(slot, variant)` to the preset's enum value — e.g.
   * `auth.provider = "better-auth"` → look for `slot: "auth", variant:
   * "better-auth"`. For app slots, variant matches `App["type"]`. For
   * `typescript-config` / structural slots that have no enum, omit.
   * Kebab-case.
   */
  variant: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, "variant must be kebab-case")
    .optional(),
  /** Browse-page grouping labels, e.g. ["security", "auth"]. */
  categories: z.array(z.string()).default([]),
  /** Markdown usage note printed after `cts add` and shown on the browse page. */
  docs: z.string().optional(),
  files: z.array(RegistryFileSchema).default([]),
  /** Arbitrary author metadata (version, links, …). */
  meta: z.record(z.string(), z.unknown()).optional(),
  /**
   * `sha256-<hex>` over the item's security-relevant fields, stamped by
   * `build:registry`. `cts add` recomputes and compares — a mismatch aborts.
   */
  checksum: z.string().optional(),
  /**
   * Base64 Ed25519 signature over `checksum`. Verified by `cts add` only when
   * the registry has a `publicKey` configured (private/paid registries).
   */
  signature: z.string().optional(),
});
export type PackageRegistryItem = z.infer<typeof PackageRegistryItemSchema>;

/** The registry index served at `/r/registry.json`. */
export const PackageRegistrySchema = z.object({
  $schema: z.string().optional(),
  name: z.string().min(1),
  homepage: z.string().optional(),
  /**
   * Paths (relative to this file) to other registry or single-item JSON files
   * whose items are merged in at build time. Lets a registry with 100+
   * packages keep one item per file instead of one giant `items` array.
   */
  include: z.array(z.string()).default([]),
  items: z.array(PackageRegistryItemSchema).default([]),
});
export type PackageRegistry = z.infer<typeof PackageRegistrySchema>;
