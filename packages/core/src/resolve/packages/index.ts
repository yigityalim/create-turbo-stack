import type {
  FileTreeNode,
  Package,
  PackageOverride,
  PackageRegistryItem,
  Preset,
} from "@create-turbo-stack/schema";
import { materializeAsAutoPackage } from "../../registry/package-adapter";
import { selectRegistryItems } from "../../registry/select";
import { packageDirOf } from "../../utils/package-path";
import { substitutePm } from "../../wiring/pm";
import { buildEnvIndex } from "../env-package";
import { resolveGenericPackage } from "./generic";

/**
 * Resolve files for a single package via the registry path. The
 * `selectRegistryItems(preset)` request for this package is looked up in
 * `items`; the matching item (if any) is materialized through the
 * `materializeAsAutoPackage` adapter. User-declared packages that don't have
 * a slot request (plain libraries, UI packages, …) fall through to the
 * generic package builder — just package.json + tsconfig, no Eta. Items
 * that selectRegistryItems requests but `items` doesn't contain produce no
 * files; the caller (CLI / web) is responsible for surfacing missing slot
 * coverage.
 *
 * Any `preset.packageOverrides[pkg.name]` is applied as a final pass — see
 * `applyPackageOverride` for the merge rules.
 */
export function resolvePackageFiles(
  preset: Preset,
  pkg: Package,
  items: ReadonlyArray<PackageRegistryItem> = [],
): FileTreeNode[] {
  const base = packageDirOf(pkg);
  const nodes = resolveBaseNodes(preset, pkg, base, items);
  const override = preset.packageOverrides?.[pkg.name];
  return override ? applyPackageOverride(nodes, base, override, preset) : nodes;
}

function resolveBaseNodes(
  preset: Preset,
  pkg: Package,
  base: string,
  items: ReadonlyArray<PackageRegistryItem>,
): FileTreeNode[] {
  // selectRegistryItems emits a request for every auto-package the preset
  // implies (env, db, auth, …). If this package matches one of those
  // requests, route through the registry adapter — that's the only source
  // of auto-package content now that Eta is gone.
  const request = selectRegistryItems(preset).find((r) => r.pkgName === pkg.name);
  if (request) {
    const item = items.find((i) => i.slot === request.slot && i.variant === request.variant);
    if (item) {
      const nodes = materializeAsAutoPackage(preset, pkg, base, item);
      // The env package's source is COMPUTED from every selected item's
      // declared env vars, not copied from the static t3-env file — that's
      // how `env.POSTHOG_API_KEY` etc. become typed for consumers.
      if (request.slot === "env") {
        const indexPath = `${base}/src/index.ts`;
        return nodes.map((n) =>
          n.path === indexPath ? { ...n, content: buildEnvIndex(preset, items) } : n,
        );
      }
      return nodes;
    }
    // Missing item for a slot the preset implies. Return empty so the
    // package directory simply doesn't exist; surfacing this hole is the
    // caller's job (the CLI reports `unmet` via `resolveRegistryItems`).
    return [];
  }

  // No slot request — this is a user-declared package. Engine still emits
  // its package.json + tsconfig boilerplate so the workspace stays
  // consistent; the user fills in `src/` themselves.
  return resolveGenericPackage(preset, pkg, base);
}

/**
 * Layer a user-supplied override on top of the resolver's output. All fields
 * are additive — none of them can remove what the provider emitted:
 *
 *  - `dependencies` / `devDependencies` / `scripts` are merged into the
 *    package.json (the override wins on key collision).
 *  - `extraFiles` are written as new nodes; a path that collides with a
 *    provider file is rejected so an override can't silently mask wiring.
 *
 * `exports` is merged earlier (in `resolveAutoPackages`) so the resolver
 * emits them in package.json directly — no JSON re-parse needed here.
 */
function applyPackageOverride(
  nodes: FileTreeNode[],
  base: string,
  override: PackageOverride,
  preset: Preset,
): FileTreeNode[] {
  const pkgJsonPath = `${base}/package.json`;
  const providerPaths = new Set(nodes.map((n) => n.path));
  const pm = preset.basics.packageManager;

  const merged: FileTreeNode[] = nodes.map((node) => {
    if (node.path !== pkgJsonPath || !node.content) return node;
    const parsed = JSON.parse(node.content);
    if (override.dependencies) {
      parsed.dependencies = { ...(parsed.dependencies ?? {}), ...override.dependencies };
    }
    if (override.devDependencies) {
      parsed.devDependencies = {
        ...(parsed.devDependencies ?? {}),
        ...override.devDependencies,
      };
    }
    if (override.scripts) {
      parsed.scripts = { ...(parsed.scripts ?? {}), ...override.scripts };
    }
    return { ...node, content: `${JSON.stringify(parsed, null, 2)}\n` };
  });

  for (const extra of override.extraFiles ?? []) {
    const path = `${base}/${extra.path}`;
    if (providerPaths.has(path)) {
      // The resolver already produced this file — refuse to overwrite
      // load-bearing wiring (package.json, tsconfig.json, source files).
      // Use a different filename to surface the customization side-by-side.
      throw new Error(
        `packageOverrides extraFiles cannot overwrite a resolver-generated file: ${path}`,
      );
    }
    // Static `{{pm-*}}` placeholders are substituted against the user's
    // package manager so a README written with `{{pm-install}}` renders the
    // right command for bun/pnpm/npm/yarn. No-op if the content has no
    // placeholder — overhead is one `.includes("{{pm")` per file.
    merged.push({ path, content: substitutePm(extra.content, pm), isDirectory: false });
  }

  return merged;
}
