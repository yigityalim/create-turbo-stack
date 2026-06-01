import type { Package, Preset } from "@create-turbo-stack/schema";
import { selectRegistryItems } from "../registry/select";

/**
 * Auto-packages are the engine-generated workspace packages a preset
 * implies — env, db, auth, api, monitoring, … — separate from the user's
 * explicit `preset.packages`. The registry-first migration unifies the
 * derivation: whichever `(slot, variant)` requests `selectRegistryItems`
 * produces (minus the `app` slot, which is materialized into `apps/`)
 * become the auto-packages.
 *
 * `exports` defaults to `["."]` here; the actual exports map shown in
 * `package.json` comes from the matching item's `exports` field via the
 * package adapter. So this `exports: ["."]` only controls the wiring
 * layer's view (catalog merging, workspace refs) which doesn't care about
 * subpaths.
 */
function locOf(name: string, preset: Preset): string {
  return preset.autoPackageLocations?.[name] ?? "packages";
}

export function resolveAutoPackages(preset: Preset): Package[] {
  const auto: Package[] = [];
  for (const req of selectRegistryItems(preset)) {
    if (req.slot === "app") continue;
    auto.push({
      name: req.pkgName,
      type: req.slot === "typescript-config" ? "config" : "library",
      location: locOf(req.pkgName, preset),
      producesCSS: false,
      exports: ["."],
    });
  }
  return auto;
}
