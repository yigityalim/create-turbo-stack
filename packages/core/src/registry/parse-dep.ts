/**
 * Parse an npm spec ("name", "name@version", "@scope/name@version") into its
 * bare package name + version (or "latest" when no version is given).
 *
 * Used by the package adapter to fan an item's `dependencies: string[]` into
 * the `Record<string, string>` shape the engine's package.json emitter wants.
 * Mirrors the parser in CLI's registry/resolve.ts — kept here because core
 * shouldn't import from cli (the dependency would invert: cli depends on
 * core, not the other way around).
 */

export interface ParsedDep {
  /** The bare package name, e.g. `"@upstash/redis"` or `"zod"`. */
  name: string;
  /**
   * The version spec, defaulting to `"latest"`. The engine doesn't actually
   * write this to disk — workspace packages use catalog refs instead — but
   * it's preserved for the few call sites (CLI add) that DO emit fixed
   * versions in package.json.
   */
  version: string;
}

export function parseDep(spec: string): ParsedDep {
  // Use the LAST `@` so `@scope/name@version` parses correctly. A leading
  // `@` (scope prefix) lives at position 0; the version separator is always
  // later in the string.
  const at = spec.lastIndexOf("@");
  if (at > 0) {
    return { name: spec.slice(0, at), version: spec.slice(at + 1) };
  }
  return { name: spec, version: "latest" };
}
