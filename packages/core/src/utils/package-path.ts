/**
 * Workspace member directory resolution — single source of truth for "where
 * on disk does this app / package live".
 *
 * Path = `<location>/<name>`. Default location is `apps` for apps and
 * `packages` for packages, but each can be overridden — `tooling`,
 * `infrastructure`, `packages/billing`, etc. Turborepo treats each distinct
 * location as its own workspace glob; the engine emits one glob per location
 * found across the preset.
 *
 * Why this lives in one helper:
 *   - Path strings appear in many wiring layers (file-tree write paths,
 *     tsconfig references, CSS @source globs, workspace globs in root
 *     package.json / pnpm-workspace.yaml). A typo in any one layer silently
 *     breaks resolution in a way users can't easily diagnose.
 *   - Custom locations (`tooling/typescript-config`, `packages/billing/p2`)
 *     are a Turborepo-supported pattern PROVIDED the workspace globs cover
 *     each distinct location and no `package.json` exists at a directory
 *     that's both a workspace glob root and a member. This helper plus
 *     `workspaceGlobs(preset)` enforce the first half; the schema's
 *     superRefine enforces the second.
 *
 * Browser-safe: pure string manipulation; only reads from the preset.
 */

import type { App, Package, Preset } from "@create-turbo-stack/schema";
import { autoPackageNames } from "@create-turbo-stack/schema";

/** Compose a member directory from a location + name. Pure. */
export function memberDir(location: string, name: string): string {
  return `${location}/${name}`;
}

/**
 * Directory for a user-declared package (uses `pkg.location`).
 *
 * `?? "packages"` is defensive: presets that flowed through `PresetSchema`
 * always have `location` set (the Zod default), but hand-typed `Package`
 * literals in tests or external code may omit it. Fall back rather than
 * emit `undefined/<name>`.
 */
export function packageDirOf(pkg: Package): string {
  return memberDir(pkg.location ?? "packages", pkg.name);
}

/** Directory for an app — same fall-back contract as `packageDirOf`. */
export function appDirOf(app: App): string {
  return memberDir(app.location ?? "apps", app.name);
}

/**
 * Directory for an auto-generated package (db, api, auth, env, …). Reads
 * `preset.autoPackageLocations[name]` when set; otherwise default
 * `packages`.
 */
export function autoPackageDir(name: string, preset: Preset): string {
  const location = preset.autoPackageLocations?.[name] ?? "packages";
  return memberDir(location, name);
}

/**
 * Resolve any package by name — checks user packages first, falls back to
 * auto-package location lookup. Use this when a wiring step has only a name
 * (e.g. `consumed` in an app's consume list) and needs to know the path.
 */
export function packageDirByName(name: string, preset: Preset): string {
  const user = preset.packages.find((p) => p.name === name);
  if (user) return packageDirOf(user);
  return autoPackageDir(name, preset);
}

/**
 * Distinct workspace locations across apps + user packages + auto packages.
 * Sorted for deterministic output so generated config files (workspace
 * globs, etc.) stay byte-stable across runs.
 */
export function distinctLocations(preset: Preset): string[] {
  const locs = new Set<string>();
  for (const a of preset.apps) locs.add(a.location ?? "apps");
  for (const p of preset.packages) locs.add(p.location ?? "packages");
  for (const name of autoPackageNames(preset)) {
    locs.add(preset.autoPackageLocations?.[name] ?? "packages");
  }
  return [...locs].sort();
}

/**
 * Workspace globs for the root package manager declaration — one glob per
 * distinct location. A monorepo with apps under `apps/`, packages under
 * `packages/`, plus a billing sub-collection at `packages/billing` emits:
 *   ["apps/*", "packages/*", "packages/billing/*"]
 *
 * Locations are independent globs from Turborepo's perspective —
 * `packages/billing` is NOT nested under `packages/*`. The engine treats
 * them as siblings.
 */
export function workspaceGlobs(preset: Preset): string[] {
  return distinctLocations(preset).map((loc) => `${loc}/*`);
}
