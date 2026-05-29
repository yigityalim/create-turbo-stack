import { z } from "zod";

export const PackageTypeSchema = z.enum(["ui", "utils", "config", "library", "react-library"]);
export type PackageType = z.infer<typeof PackageTypeSchema>;

/**
 * Provenance for a package added via `cts add`. `ref` is how it was resolved
 * (bare name, `@ns/name`, or URL); `checksum` pins the verified content so a
 * later re-add / reconcile detects drift (the package changed under you).
 */
export const PackageRegistrySourceSchema = z.object({
  ref: z.string(),
  checksum: z.string(),
});
export type PackageRegistrySource = z.infer<typeof PackageRegistrySourceSchema>;

/**
 * Workspace location — the directory glob this member lives under. A path
 * of one or more kebab-case segments separated by `/`. Examples: `packages`
 * (default), `tooling`, `infrastructure`, `packages/billing`.
 *
 * Turborepo treats every distinct location as its own workspace glob, so
 * `packages/billing` isn't a "nested" form of `packages` — it's an entirely
 * separate glob (`packages/billing/*`) sitting alongside `packages/*`. The
 * engine emits one glob per distinct location.
 *
 * Path-traversal forbidden: no `.`, `..`, leading/trailing slashes, or empty
 * segments. Every segment must be kebab-case (matches the `name` regex).
 */
export const WorkspaceLocationSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/,
    "Location must be kebab-case segments separated by '/' (e.g. 'packages', 'tooling', 'packages/billing')",
  );

export const PackageSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  type: PackageTypeSchema,
  /**
   * Directory the package lives under. Default `packages`. Set to anything
   * else to put it in a different workspace glob — `tooling`, `infrastructure`,
   * `packages/billing`, etc. The engine adds a matching glob to the root
   * workspace declaration automatically.
   */
  location: WorkspaceLocationSchema.default("packages"),
  producesCSS: z.boolean().default(false),
  exports: z.array(z.string()).default(["."]),
  registry: PackageRegistrySourceSchema.optional(),
});
export type Package = z.infer<typeof PackageSchema>;
