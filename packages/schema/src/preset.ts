import { z } from "zod";
import { ApiSchema } from "./options/api";
import { AppSchema } from "./options/app";
import { AuthSchema } from "./options/auth";
import { BasicsSchema } from "./options/basics";
import { CssSchema } from "./options/css";
import { DatabaseSchema } from "./options/database";
import { IntegrationsSchema, integrationPackageName } from "./options/integrations";
import { PackageSchema, WorkspaceLocationSchema } from "./options/package";
import { PackageOverridesSchema } from "./options/package-override";

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
  /**
   * Registry packages to `cts add` after scaffolding (names or `@ns/name`
   * refs). Selected in the web builder or written by hand; the create flow
   * materializes them into `packages/<name>` once the project exists. Optional
   * so existing presets (and Preset literals) need no change.
   */
  registryPackages: z.array(z.string()).optional(),
  /**
   * Per-package customization — keyed by workspace package name (`"cache"`,
   * `"db"`, `"ui"`, …). Lets the user *add* deps, scripts, exports, and extra
   * files on top of what the resolver emits. Auto-package identity stays
   * provider-owned; everything in this record is additive. See
   * `PackageOverrideSchema`. Keys are validated against the set of packages
   * the resolver would emit (auto + user) in `ValidatedPresetSchema`.
   */
  packageOverrides: PackageOverridesSchema.optional(),
  /**
   * Locations for auto-packages — `db`, `api`, `auth`, `analytics`,
   * `monitoring`, `email`, `rate-limit`, `ai`, `cache`, `env`,
   * `typescript-config`. Default is `"packages"` for every auto-package.
   *
   * Set this to relocate engine-generated packages into a different workspace
   * glob:
   *   `{ db: "packages/data", api: "packages/data", auth: "packages/auth" }`
   *   → `packages/data/db`, `packages/data/api`, `packages/auth/auth`.
   *   `{ "typescript-config": "tooling" }`
   *   → `tooling/typescript-config`.
   *
   * User packages carry their own `location` field; this record covers only
   * the engine-generated ones. Same `WorkspaceLocationSchema` rules apply.
   */
  autoPackageLocations: z.record(z.string(), WorkspaceLocationSchema).optional(),
});

export type Preset = z.infer<typeof PresetSchema>;

/**
 * Enumerate the package names the engine auto-creates for a given preset.
 *
 * Mirrors what core's `resolveAutoPackages` produces, but as plain strings
 * — no rendering, no Eta — so it's safe to call from the browser. Used by:
 *   - the cross-field validator below (to verify `app.consumes` references)
 *   - the web builder's "Consumes" chip list (so the UI can't drift from
 *     what actually appears under `packages/` in the preview)
 *
 * Drift contract: every shipped provider in a non-"none" slot scaffolds a
 * package, so "enum value !== 'none'" is the authoritative signal. If a
 * future integration is added to the enum without a package, the resolver
 * — not this helper — owns the decision; keep them in sync there.
 */
export function autoPackageNames(preset: Preset): string[] {
  const names = ["typescript-config"];
  if (preset.integrations.envValidation !== "none") names.push("env");
  if (preset.database.strategy !== "none") names.push(integrationPackageName("database"));
  if (preset.api.strategy !== "none") names.push(integrationPackageName("api"));
  if (preset.auth.provider !== "none") names.push(integrationPackageName("auth"));
  for (const [category, value] of Object.entries(preset.integrations)) {
    if (category === "envValidation") continue;
    if (typeof value === "string" && value !== "none") {
      names.push(integrationPackageName(category));
    }
  }
  return names;
}

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
    if (app.i18n && !["nextjs", "sveltekit", "astro"].includes(app.type)) {
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

  // Verify each `app.consumes` references an actual package — auto-generated
  // (mirrored by `autoPackageNames` above) or user-declared.
  const allPackageNames = new Set([...pkgNames, ...autoPackageNames(data)]);
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

  // Location collision check. If app A lives at `packages/billing` and
  // package P also has location `packages/billing`, A's manifest sits where
  // Turborepo expects a workspace directory — discovery breaks. More subtly,
  // if package P1 has full path `packages/billing` and another package's
  // location is `packages/billing/...`, the parent has a manifest while
  // being a workspace glob root — also broken.
  const memberPaths = new Map<string, string>(); // path → "app|package:name"
  for (const a of data.apps) {
    memberPaths.set(`${a.location}/${a.name}`, `app:${a.name}`);
  }
  for (const p of data.packages) {
    memberPaths.set(`${p.location}/${p.name}`, `package:${p.name}`);
  }
  for (const name of autoPackageNames(data)) {
    const loc = data.autoPackageLocations?.[name] ?? "packages";
    memberPaths.set(`${loc}/${name}`, `auto:${name}`);
  }
  const allLocations = new Set<string>();
  for (const a of data.apps) allLocations.add(a.location);
  for (const p of data.packages) allLocations.add(p.location);
  for (const loc of Object.values(data.autoPackageLocations ?? {})) {
    allLocations.add(loc);
  }
  for (const loc of allLocations) {
    for (const [memberPath, owner] of memberPaths) {
      if (loc === memberPath || loc.startsWith(`${memberPath}/`)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Workspace location '${loc}' collides with ${owner} at '${memberPath}' — a workspace directory can't also be a member`,
          path: ["packages"],
        });
      }
    }
  }

  // autoPackageLocations keys must reference packages the resolver actually
  // emits. Typoing `"data"` instead of `"db"` silently does nothing.
  for (const autoName of Object.keys(data.autoPackageLocations ?? {})) {
    if (!autoPackageNames(data).includes(autoName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `autoPackageLocations targets unknown auto-package: '${autoName}'`,
        path: ["autoPackageLocations", autoName],
      });
    }
  }

  // Package overrides must target a package the resolver actually emits —
  // typo-detection lives here so the user finds out at validate time, not
  // when a generated project silently lacks their tweak.
  for (const overrideName of Object.keys(data.packageOverrides ?? {})) {
    if (!allPackageNames.has(overrideName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `packageOverrides targets unknown package: '${overrideName}'`,
        path: ["packageOverrides", overrideName],
      });
    }
  }
});

export type ValidatedPreset = z.infer<typeof ValidatedPresetSchema>;
