import type { FileTreeNode, Preset } from "@create-turbo-stack/schema";
import { computeCatalog } from "../wiring/catalog";
import { computeEnvChain } from "../wiring/env-chain";
import { computeTurboConfig } from "../wiring/turbo-tasks";

/**
 * Resolve root-level config files: package.json, turbo.json, biome.json, .gitignore, etc.
 */
export function resolveRootFiles(preset: Preset): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const catalog = computeCatalog(preset);
  const envChain = computeEnvChain(preset);
  const turboConfig = computeTurboConfig(preset, envChain.globalEnv);

  // Root package.json
  const catalogObj: Record<string, string> = {};
  for (const entry of catalog) {
    catalogObj[entry.name] = entry.version;
  }

  const rootPkg = {
    name: preset.basics.projectName,
    private: true,
    scripts: {
      build: "turbo run build",
      dev: "turbo run dev",
      lint: "turbo run lint",
      "type-check": "turbo run type-check",
      format:
        preset.basics.linter === "biome"
          ? "biome format --write ."
          : 'prettier --write "**/*.{ts,tsx,md}"',
    },
    devDependencies: {
      ...(preset.basics.linter === "biome"
        ? { "@biomejs/biome": catalogObj["@biomejs/biome"] ?? "^1.9.0" }
        : {}),
      turbo: "^2.8.0",
      typescript: catalogObj.typescript ?? "^5.9.0",
    },
    packageManager: `${preset.basics.packageManager}@latest`,
    workspaces: ["apps/*", "packages/*"],
    ...(Object.keys(catalogObj).length > 0 ? { catalog: catalogObj } : {}),
  };

  nodes.push({
    path: "package.json",
    content: JSON.stringify(rootPkg, null, 2),
    isDirectory: false,
  });

  // turbo.json
  nodes.push({
    path: "turbo.json",
    content: JSON.stringify(turboConfig, null, 2),
    isDirectory: false,
  });

  // .gitignore
  nodes.push({
    path: ".gitignore",
    content: `node_modules
.turbo
.next
dist
out
build
.env
.env.local
.env.*.local
*.tsbuildinfo
.DS_Store
coverage
`,
    isDirectory: false,
  });

  // .npmrc
  nodes.push({
    path: ".npmrc",
    content: "auto-install-peers=true\n",
    isDirectory: false,
  });

  // Biome config
  if (preset.basics.linter === "biome") {
    nodes.push({
      path: "biome.json",
      content: JSON.stringify(
        {
          $schema: "https://biomejs.dev/schemas/1.9.0/schema.json",
          vcs: { enabled: true, clientKind: "git", useIgnoreFile: true },
          organizeImports: { enabled: true },
          formatter: { enabled: true, indentStyle: "space", indentWidth: 2, lineWidth: 100 },
          linter: { enabled: true, rules: { recommended: true } },
          javascript: {
            formatter: { quoteStyle: "double", semicolons: "always", trailingCommas: "all" },
          },
          files: { ignore: ["node_modules", ".next", ".turbo", "dist", "bun.lock", "*.json"] },
        },
        null,
        2,
      ),
      isDirectory: false,
    });
  }

  // .env.example
  if (envChain.allVars.length > 0) {
    const envLines = envChain.allVars.map((v) => `# ${v.description}\n${v.name}=${v.example}`);
    nodes.push({
      path: ".env.example",
      content: `${envLines.join("\n\n")}\n`,
      isDirectory: false,
    });
  }

  return nodes;
}
