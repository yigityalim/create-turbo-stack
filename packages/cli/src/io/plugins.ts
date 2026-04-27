// Resolves npm-named plugins against the project's `node_modules` and
// registers their default export. Failures degrade to warnings so a
// missing dev-only plugin doesn't break the CLI.

import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as p from "@clack/prompts";
import {
  type AppTypeDefinition,
  type IntegrationDefinition,
  registerAppType,
  registerIntegration,
} from "@create-turbo-stack/core";
import pc from "picocolors";

type AnyDefinition = AppTypeDefinition | IntegrationDefinition;

function isAppType(def: unknown): def is AppTypeDefinition {
  return (
    typeof def === "object" &&
    def !== null &&
    "templateCategory" in def &&
    "buildPackageJson" in def
  );
}

function isIntegration(def: unknown): def is IntegrationDefinition {
  return (
    typeof def === "object" &&
    def !== null &&
    "category" in def &&
    "provider" in def &&
    "catalogEntries" in def
  );
}

function registerOne(def: AnyDefinition, source: string): void {
  if (isAppType(def)) {
    registerAppType(def);
  } else if (isIntegration(def)) {
    registerIntegration(def);
  } else {
    p.log.warn(
      `Plugin ${pc.cyan(source)} exported a value that is neither AppTypeDefinition nor IntegrationDefinition; skipping`,
    );
  }
}

/**
 * Resolve a plugin specifier against `cwd/node_modules`. Returns a
 * `file://` URL suitable for dynamic `import()`. Falls back to plain
 * `await import(specifier)` semantics (CLI's own deps) if the specifier
 * isn't installed in the project — warns the user either way.
 */
function resolveFromCwd(specifier: string, cwd: string): string {
  // Anchor `createRequire` to a path that always exists inside `cwd`
  // regardless of whether the user has a package.json yet.
  const projectRequire = createRequire(path.join(cwd, "noop.js"));
  const resolved = projectRequire.resolve(specifier);
  return pathToFileURL(resolved).href;
}

/**
 * Load and register all plugins listed in the user config.
 */
export async function loadPlugins(
  pluginNames: readonly string[] | undefined,
  cwd: string,
): Promise<{ loaded: number; failed: string[] }> {
  if (!pluginNames || pluginNames.length === 0) return { loaded: 0, failed: [] };

  let loaded = 0;
  const failed: string[] = [];

  for (const name of pluginNames) {
    try {
      let modUrl: string;
      try {
        modUrl = resolveFromCwd(name, cwd);
      } catch {
        // Not installed in the project — try a plain import (e.g. plugin
        // co-installed with the CLI itself). Lets users sample plugins
        // without `npm install`-ing them locally.
        modUrl = name;
      }

      const mod = (await import(modUrl)) as { default?: unknown };
      const exported = mod.default;

      if (Array.isArray(exported)) {
        for (const entry of exported) registerOne(entry as AnyDefinition, name);
      } else if (exported) {
        registerOne(exported as AnyDefinition, name);
      } else {
        p.log.warn(`Plugin ${pc.cyan(name)} has no default export; skipping`);
        failed.push(name);
        continue;
      }
      loaded += 1;
    } catch (err) {
      p.log.warn(`Failed to load plugin ${pc.cyan(name)}: ${(err as Error).message}`);
      failed.push(name);
    }
  }

  return { loaded, failed };
}
