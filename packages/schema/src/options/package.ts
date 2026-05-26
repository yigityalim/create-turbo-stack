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

export const PackageSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  type: PackageTypeSchema,
  producesCSS: z.boolean().default(false),
  exports: z.array(z.string()).default(["."]),
  registry: PackageRegistrySourceSchema.optional(),
});
export type Package = z.infer<typeof PackageSchema>;
