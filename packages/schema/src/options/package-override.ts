import { z } from "zod";

/**
 * Per-package customization layer. Auto-packages (db, cache, monitoring, …)
 * are derived from preset selections and the active integration's contract —
 * the user can't directly edit their `name`, `type`, or core source. An
 * **override** lets the user *add* on top: extra exports, extra deps, extra
 * scripts, and extra files (a README, a benchmark, a config). The provider
 * still owns the package's identity; the override is purely additive.
 *
 * Applied to both auto-packages and user-declared packages. Keys in
 * `Preset.packageOverrides` must reference a package the resolver would emit
 * (validated in `ValidatedPresetSchema.superRefine`).
 */

/**
 * Extra file emitted into the package directory. `path` is relative to
 * `packages/<name>/` and must stay within it — no parent traversal, no
 * absolute paths.
 */
export const ExtraFileSchema = z.object({
  path: z
    .string()
    .min(1)
    .refine((p) => !p.includes("..") && !p.startsWith("/") && !p.startsWith("\\"), {
      message: "extraFiles path cannot escape the package directory or be absolute",
    }),
  content: z.string(),
});

export type ExtraFile = z.infer<typeof ExtraFileSchema>;

/**
 * Merge-on-top customization. Each field is optional and additive:
 *
 *  - `dependencies` / `devDependencies` — name → version spec (`"catalog:"`,
 *    `"workspace:*"`, `"^1.0.0"`); merged into the synthesized package.json,
 *    overwriting same-name entries the provider emitted.
 *  - `scripts` — merged into `package.json.scripts`, overwriting on collision.
 *  - `exports` — additional subpath exports to add to the package (e.g.
 *    `"./pubsub"`). The provider's defaults stay; duplicates are deduped.
 *  - `extraFiles` — extra files written into `packages/<name>/`. Useful for
 *    READMEs, custom configs, fixtures. Path must be relative.
 */
export const PackageOverrideSchema = z
  .object({
    dependencies: z.record(z.string(), z.string()).optional(),
    devDependencies: z.record(z.string(), z.string()).optional(),
    scripts: z.record(z.string(), z.string()).optional(),
    exports: z.array(z.string()).optional(),
    extraFiles: z.array(ExtraFileSchema).optional(),
  })
  .strict();

export type PackageOverride = z.infer<typeof PackageOverrideSchema>;

export const PackageOverridesSchema = z.record(z.string(), PackageOverrideSchema);
export type PackageOverrides = z.infer<typeof PackageOverridesSchema>;
