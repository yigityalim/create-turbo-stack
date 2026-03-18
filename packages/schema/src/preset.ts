import { z } from "zod";
import { BasicsSchema } from "./options/basics";
import { DatabaseSchema } from "./options/database";
import { ApiSchema } from "./options/api";
import { AuthSchema } from "./options/auth";
import { AppSchema } from "./options/app";
import { PackageSchema } from "./options/package";
import { CssSchema } from "./options/css";
import { IntegrationsSchema } from "./options/integrations";

export const PresetSchema = z.object({
  $schema: z.string().optional(),
  name: z.string().min(1),
  version: z.string().default("1.0.0"),
  description: z.string().optional(),
  author: z.string().optional(),

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
  // 1. supabase-auth requires supabase database
  if (data.auth.provider === "supabase-auth" && data.database.strategy !== "supabase") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "supabase-auth requires database strategy 'supabase'",
      path: ["auth", "provider"],
    });
  }

  // 2. Hono standalone requires a hono-standalone app
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

  // 3. i18n only for web-facing apps
  for (const [i, app] of data.apps.entries()) {
    if (app.i18n && !["nextjs", "sveltekit", "astro", "remix"].includes(app.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `i18n is not supported for app type '${app.type}'`,
        path: ["apps", i, "i18n"],
      });
    }
  }

  // 4. Unique app names
  const appNames = data.apps.map((a) => a.name);
  const dupeApp = appNames.find((n, i) => appNames.indexOf(n) !== i);
  if (dupeApp) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate app name: '${dupeApp}'`,
      path: ["apps"],
    });
  }

  // 5. Unique package names
  const pkgNames = data.packages.map((p) => p.name);
  const dupePkg = pkgNames.find((n, i) => pkgNames.indexOf(n) !== i);
  if (dupePkg) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate package name: '${dupePkg}'`,
      path: ["packages"],
    });
  }

  // 6. consumes must reference existing or auto-generated packages
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

  // 7. Unique ports
  const ports = data.apps.map((a) => a.port);
  const dupePort = ports.find((p, i) => ports.indexOf(p) !== i);
  if (dupePort) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate port: ${dupePort}`,
      path: ["apps"],
    });
  }

  // 8. CMS only for nextjs
  for (const [i, app] of data.apps.entries()) {
    if (app.cms !== "none" && app.type !== "nextjs") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CMS integration only supported for nextjs apps",
        path: ["apps", i, "cms"],
      });
    }
  }
});

export type ValidatedPreset = z.infer<typeof ValidatedPresetSchema>;
