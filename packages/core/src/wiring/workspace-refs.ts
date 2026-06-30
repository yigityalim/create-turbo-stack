import type { Preset } from "@create-turbo-stack/schema";
import { selectRegistryItems } from "../registry/select";

/**
 * For each app/package, compute which workspace packages it should depend on.
 * Returns: targetName → { "@scope/depName": "workspace:*" }
 *
 * Auto-consumed refs (env/api/auth/db) are only emitted for packages the
 * preset actually produces (from `selectRegistryItems`, minus app slots) — so
 * a Hono standalone-app, which has no separate `api` package, never gets a
 * dangling `@scope/api`. A target never references itself (an app named `api`
 * won't depend on `@scope/api`).
 */
export function computeWorkspaceRefs(preset: Preset): Record<string, Record<string, string>> {
  const refs: Record<string, Record<string, string>> = {};
  const scope = preset.basics.scope;

  // Auto-package short names this preset emits (env, db, auth, api, …).
  const autoPkgs = new Set(
    selectRegistryItems(preset)
      .filter((r) => r.slot !== "app")
      .map((r) => r.pkgName),
  );

  const add = (target: string, dep: string) => {
    if (dep === target || !autoPkgs.has(dep)) return;
    refs[target] = { ...refs[target], [`${scope}/${dep}`]: "workspace:*" };
  };

  for (const app of preset.apps) {
    refs[app.name] = {};
    // Explicitly consumed packages (may be user packages, so no existence gate).
    for (const consumed of app.consumes) {
      if (consumed !== app.name) {
        refs[app.name][`${scope}/${consumed}`] = "workspace:*";
      }
    }
    // Auto-consumed foundation packages, when they exist.
    add(app.name, "env");
    add(app.name, "api");
    add(app.name, "auth");
  }

  // Package cross-references — only between packages that both exist.
  if (autoPkgs.has("auth")) add("auth", "db");
  if (autoPkgs.has("api")) add("api", "db");

  return refs;
}
