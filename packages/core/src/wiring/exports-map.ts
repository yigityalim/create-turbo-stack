import type { Package } from "@create-turbo-stack/schema";

/**
 * Compute the `exports` field for a package's package.json.
 * Maps subpath exports to their source files. Every entry is a
 * conditions object; callers that also emit bare-string targets (e.g.
 * "./globals.css") widen to PackageExports at the assignment site.
 */
export function computeExportsMap(
  pkg: Package,
): Record<string, { types: string; default: string } | string> {
  const map: Record<string, { types: string; default: string } | string> = {};

  for (const exp of pkg.exports) {
    // JSON / non-TypeScript exports map directly to themselves (e.g. ./base.json).
    if (exp.endsWith(".json") || exp.endsWith(".css")) {
      map[exp] = exp;
      continue;
    }
    if (exp === ".") {
      map["."] = {
        types: "./src/index.ts",
        default: "./src/index.ts",
      };
    } else {
      // "./client" → src/client.ts
      const name = exp.replace(/^\.\//, "");
      map[exp] = {
        types: `./src/${name}.ts`,
        default: `./src/${name}.ts`,
      };
    }
  }

  return map;
}
