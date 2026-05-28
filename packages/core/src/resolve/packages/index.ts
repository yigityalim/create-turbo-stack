import type { FileTreeNode, Package, PackageOverride, Preset } from "@create-turbo-stack/schema";
import { integrationPackageName } from "@create-turbo-stack/schema";
import {
  activeProvider,
  getIntegration,
  INTEGRATION_CATEGORIES,
  type IntegrationCategory,
} from "../../integrations";
import { substitutePm } from "../../wiring/pm";
import { buildPackageContext } from "./base";
import {
  resolveEnvPackage,
  resolveGenericPackage,
  resolveTypescriptConfigPackage,
} from "./builtins";

/**
 * Package name → integration category. Inverts the shared package-name map
 * (so monitoring→errorTracking, rate-limit→rateLimit, db→database) — when a
 * package has a matching active provider, that provider's `resolvePackageFiles`
 * owns the scaffold, with no per-package switch to maintain.
 */
const CATEGORY_BY_PACKAGE: Record<string, IntegrationCategory> = Object.fromEntries(
  INTEGRATION_CATEGORIES.map((category) => [integrationPackageName(category), category]),
);

/**
 * Resolve files for a single package. Dispatch order:
 *   1. typescript-config / env — structural built-ins, no provider
 *   2. provider-backed auto-packages (db, api, auth, analytics, ...)
 *      delegate to the active integration's resolvePackageFiles
 *   3. everything else is a plain user package
 *
 * Any `preset.packageOverrides[pkg.name]` is applied as a final pass — see
 * `applyPackageOverride` for the merge rules.
 */
export function resolvePackageFiles(preset: Preset, pkg: Package): FileTreeNode[] {
  const base = `packages/${pkg.name}`;
  const nodes = resolveBaseNodes(preset, pkg, base);
  const override = preset.packageOverrides?.[pkg.name];
  return override ? applyPackageOverride(nodes, base, override, preset) : nodes;
}

function resolveBaseNodes(preset: Preset, pkg: Package, base: string): FileTreeNode[] {
  if (pkg.name === "typescript-config") return resolveTypescriptConfigPackage(preset, base);
  if (pkg.name === "env") return resolveEnvPackage(preset, pkg, base);

  const category = CATEGORY_BY_PACKAGE[pkg.name];
  if (category) {
    const provider = activeProvider(preset, category);
    if (provider) {
      const integration = getIntegration(category, provider);
      if (integration?.resolvePackageFiles) {
        return integration.resolvePackageFiles(preset, buildPackageContext(preset, pkg, base));
      }
    }
  }

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
