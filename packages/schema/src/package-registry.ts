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
  /** Env vars the package needs: name → example value. */
  envVars: z.record(z.string(), z.string()).default({}),
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
  /** Browse-page grouping labels, e.g. ["security", "auth"]. */
  categories: z.array(z.string()).default([]),
  /** Markdown usage note printed after `cts add` and shown on the browse page. */
  docs: z.string().optional(),
  files: z.array(RegistryFileSchema).default([]),
  /** Arbitrary author metadata (version, links, …). */
  meta: z.record(z.string(), z.unknown()).optional(),
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
