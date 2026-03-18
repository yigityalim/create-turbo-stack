import type { Package } from "@create-turbo-stack/schema";

/**
 * Compute the `exports` field for a package's package.json.
 * Maps subpath exports to their source files.
 */
export function computeExportsMap(
  pkg: Package,
): Record<string, { types: string; default: string }> {
  const map: Record<string, { types: string; default: string }> = {};

  for (const exp of pkg.exports) {
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
