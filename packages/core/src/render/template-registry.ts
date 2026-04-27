// Runtime template registry — plugin-shipped `.eta` strings.
// `renderSourceFiles` checks built-in first, then this map; plugin
// entries override built-in on key collision (intentional).

const runtimeTemplates = new Map<string, Map<string, string>>();

/**
 * Register a map of `{ relativeFilePath: contentString }` under a
 * category key (e.g. `"app/nuxt"`, `"auth/acme-internal"`). Idempotent —
 * re-registering the same category replaces the previous entries.
 */
export function registerTemplates(category: string, files: Record<string, string>): void {
  const map = new Map<string, string>();
  for (const [file, content] of Object.entries(files)) {
    map.set(file, content);
  }
  runtimeTemplates.set(category, map);
}

/** Returns runtime-registered templates for `category`, or empty map. */
export function getRegisteredTemplates(category: string): Record<string, string> {
  const map = runtimeTemplates.get(category);
  if (!map) return {};
  return Object.fromEntries(map.entries());
}

/** All categories with at least one runtime-registered template. */
export function listRegisteredCategories(): readonly string[] {
  return Array.from(runtimeTemplates.keys());
}

export function clearRegisteredTemplates(): void {
  runtimeTemplates.clear();
}
