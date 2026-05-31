import type { FileTreeNode, Preset } from "@create-turbo-stack/schema";
import { fullPackageName } from "../../utils/naming";
import { makeBasePackageFiles } from "./base";

/**
 * A user-declared package with no slot binding (ui, utils, library, …) —
 * the engine emits the workspace boilerplate (package.json + tsconfig +
 * linter configs + empty source stubs) and the user fills `src/` in their
 * own editor. No Eta, no template rendering, no provider lookup.
 */
export function resolveGenericPackage(
  preset: Preset,
  pkg: Parameters<typeof makeBasePackageFiles>[1],
  base: string,
): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const name = fullPackageName(preset.basics.scope, pkg.name);

  nodes.push(...makeBasePackageFiles(preset, pkg, base));

  nodes.push({
    path: `${base}/src/index.ts`,
    content: `// ${name}\nexport {};\n`,
    isDirectory: false,
  });

  for (const exp of pkg.exports) {
    if (exp !== ".") {
      const fileName = exp.replace(/^\.\//, "");
      nodes.push({
        path: `${base}/src/${fileName}.ts`,
        content: `// ${name}/${fileName}\nexport {};\n`,
        isDirectory: false,
      });
    }
  }

  if (pkg.producesCSS) {
    nodes.push({
      path: `${base}/src/globals.css`,
      content: `/* ${name} global styles */\n`,
      isDirectory: false,
    });
  }

  return nodes;
}
