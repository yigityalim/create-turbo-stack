import type { FileTreeNode, Package, Preset } from "@create-turbo-stack/schema";
import { activeProvider, getIntegration, type IntegrationCategory } from "../../integrations";
import { buildPackageContext } from "./base";
import {
  resolveEnvPackage,
  resolveGenericPackage,
  resolveTypescriptConfigPackage,
} from "./builtins";

/**
 * Auto-package names map 1:1 to integration categories. When a package
 * has a matching active provider, that provider's `resolvePackageFiles`
 * owns the scaffold — there's no per-package switch here.
 */
const CATEGORY_BY_PACKAGE: Record<string, IntegrationCategory> = {
  db: "database",
  api: "api",
  auth: "auth",
  analytics: "analytics",
  monitoring: "errorTracking",
  email: "email",
  "rate-limit": "rateLimit",
  ai: "ai",
};

/**
 * Resolve files for a single package. Dispatch order:
 *   1. typescript-config / env — structural built-ins, no provider
 *   2. provider-backed auto-packages (db, api, auth, analytics, ...)
 *      delegate to the active integration's resolvePackageFiles
 *   3. everything else is a plain user package
 */
export function resolvePackageFiles(preset: Preset, pkg: Package): FileTreeNode[] {
  const base = `packages/${pkg.name}`;

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
