import { z } from "zod";
import { ApiSchema } from "./options/api";
import { AppSchema } from "./options/app";
import { AuthSchema } from "./options/auth";
import { BasicsSchema } from "./options/basics";
import { CssSchema } from "./options/css";
import { DatabaseSchema } from "./options/database";
import { IntegrationsSchema } from "./options/integrations";
import { PackageSchema } from "./options/package";

/** Rejects strings containing Eta/EJS template syntax to prevent template injection. */
const safeString = z
  .string()
  .refine((val) => !val.includes("<%") && !val.includes("%>") && !val.includes("${"), {
    message: "String contains forbidden template syntax (<%, %>, ${)",
  });

/**
 * Preset format version. Bumped when the schema shape changes in a way
 * that older preset JSONs need to be transformed before they validate.
 *
 * The CLI runs registered migrations from the preset's recorded
 * `schemaVersion` up to this current value before validating, so users
 * with old preset files don't see Zod errors after a schema bump.
 */
export const CURRENT_PRESET_SCHEMA_VERSION = "1.0";

export const PresetSchema = z.object({
  $schema: z.string().optional(),
  /**
   * Preset format/schema version. See CURRENT_PRESET_SCHEMA_VERSION.
   * Defaults to "1.0" for backwards-compatible read of pre-versioning presets.
   */
  schemaVersion: z.string().default("1.0"),
  name: safeString.min(1),
  /** Generated project's version (not the preset format's). */
  version: z.string().default("1.0.0"),
  description: safeString.optional(),
  author: safeString.optional(),

  basics: BasicsSchema,
  database: DatabaseSchema,
  api: ApiSchema,
  auth: AuthSchema,
  css: CssSchema,
  integrations: IntegrationsSchema,

  apps: z.array(AppSchema).min(1),
  packages: z.array(PackageSchema).default([]),
});

export type Preset = z.infer<typeof PresetSchema>;

/** Preset with cross-field validation rules applied. */
export const ValidatedPresetSchema = PresetSchema.superRefine((data, ctx) => {
  if (data.auth.provider === "supabase-auth" && data.database.strategy !== "supabase") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "supabase-auth requires database strategy 'supabase'",
      path: ["auth", "provider"],
    });
  }

  if (data.api.strategy === "hono" && data.api.mode === "standalone-app") {
    const hasHonoApp = data.apps.some((a) => a.type === "hono-standalone");
    if (!hasHonoApp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hono standalone API strategy requires at least one hono-standalone app",
        path: ["api"],
      });
    }
  }

  for (const [i, app] of data.apps.entries()) {
    if (app.i18n && !["nextjs", "sveltekit", "astro", "remix"].includes(app.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `i18n is not supported for app type '${app.type}'`,
        path: ["apps", i, "i18n"],
      });
    }
  }

  const appNames = data.apps.map((a) => a.name);
  const dupeApp = appNames.find((n, i) => appNames.indexOf(n) !== i);
  if (dupeApp) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate app name: '${dupeApp}'`,
      path: ["apps"],
    });
  }

  const pkgNames = data.packages.map((p) => p.name);
  const dupePkg = pkgNames.find((n, i) => pkgNames.indexOf(n) !== i);
  if (dupePkg) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate package name: '${dupePkg}'`,
      path: ["packages"],
    });
  }

  const allPackageNames = new Set([
    ...pkgNames,
    ...(data.database.strategy !== "none" ? ["db"] : []),
    ...(data.api.strategy !== "none" ? ["api"] : []),
    ...(data.auth.provider !== "none" ? ["auth"] : []),
    ...(data.integrations.envValidation ? ["env"] : []),
    "typescript-config",
  ]);
  for (const [i, app] of data.apps.entries()) {
    for (const consumed of app.consumes) {
      if (!allPackageNames.has(consumed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `App '${app.name}' consumes unknown package '${consumed}'`,
          path: ["apps", i, "consumes"],
        });
      }
    }
  }

  const ports = data.apps.map((a) => a.port);
  const dupePort = ports.find((p, i) => ports.indexOf(p) !== i);
  if (dupePort) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate port: ${dupePort}`,
      path: ["apps"],
    });
  }

  for (const [i, app] of data.apps.entries()) {
    if (app.cms !== "none" && app.type !== "nextjs") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CMS field is only meaningful for nextjs apps (and is currently unimplemented).",
        path: ["apps", i, "cms"],
      });
    }
  }
});

export type ValidatedPreset = z.infer<typeof ValidatedPresetSchema>;
