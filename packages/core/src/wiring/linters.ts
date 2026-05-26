import type { FileTreeNode, Linter, Preset } from "@create-turbo-stack/schema";
import { VERSIONS } from "./versions";

/**
 * Linter registry — one source of truth for how each linter is wired, so
 * the choice lives here instead of as a `linter === "biome" ? … : …`
 * branch scattered across every app type, package builder, and the root
 * config. Adding a linter = one entry here.
 *
 * Three real, working setups (no schema lies):
 *  - biome:          lint + format via Biome, one biome.json.
 *  - oxlint:         lint via oxlint (Rust), format via Prettier.
 *  - eslint-prettier: lint via ESLint flat config + typescript-eslint,
 *                     format via Prettier; eslint-config-prettier turns
 *                     off rules Prettier owns.
 */
export interface LinterDef {
  id: Linter;
  /** A workspace package's `lint` script. */
  lintScript: string;
  /** The root `format` script. */
  formatScript: string;
  /** Catalog entries the linter needs (so `catalog:` refs resolve). */
  catalogEntries: readonly { name: string; version: string }[];
  /** devDeps added to the ROOT package.json (literal versions). */
  rootDevDeps: Record<string, string>;
  /** devDeps each workspace package/app adds (catalog refs). */
  packageDevDeps: Record<string, string>;
  /** Root-level config files (biome.json, .oxlintrc.json, eslint.config.mjs, …). */
  rootConfigFiles(preset: Preset): FileTreeNode[];
  /**
   * Per-package config files. ESLint flat config is resolved from the
   * package's cwd, so each package re-exports the root config; Biome and
   * oxlint find their root config on their own and need nothing here.
   */
  packageConfigFiles(base: string): FileTreeNode[];
}

const PRETTIER_FORMAT = 'prettier --write "**/*.{ts,tsx,md,json}"';

const file = (path: string, content: string): FileTreeNode => ({
  path,
  content,
  isDirectory: false,
});

const PRETTIERRC = `${JSON.stringify(
  { semi: true, singleQuote: false, trailingComma: "all", printWidth: 100 },
  null,
  2,
)}\n`;

const BIOME_JSON = `${JSON.stringify(
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
)}\n`;

const OXLINTRC = `${JSON.stringify(
  {
    $schema:
      "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json",
    plugins: ["typescript", "react"],
    categories: { correctness: "error", suspicious: "warn" },
    ignorePatterns: ["**/dist/**", "**/.next/**", "**/.turbo/**", "**/node_modules/**"],
  },
  null,
  2,
)}\n`;

const ESLINT_CONFIG = `import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.next/**", "**/.turbo/**", "**/node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
);
`;

// Packages and apps both live two levels under the root (packages/<name>,
// apps/<name>), so the re-export path is the same for either.
const ESLINT_PACKAGE_CONFIG = `import config from "../../eslint.config.mjs";

export default config;
`;

const LINTERS: Record<Linter, LinterDef> = {
  biome: {
    id: "biome",
    lintScript: "biome check",
    formatScript: "biome format --write .",
    catalogEntries: [{ name: "@biomejs/biome", version: VERSIONS.biome }],
    rootDevDeps: { "@biomejs/biome": VERSIONS.biome },
    packageDevDeps: { "@biomejs/biome": "catalog:" },
    rootConfigFiles: () => [file("biome.json", BIOME_JSON)],
    packageConfigFiles: () => [],
  },
  oxlint: {
    id: "oxlint",
    lintScript: "oxlint",
    formatScript: PRETTIER_FORMAT,
    catalogEntries: [
      { name: "oxlint", version: VERSIONS.oxlint },
      { name: "prettier", version: VERSIONS.prettier },
    ],
    rootDevDeps: { oxlint: VERSIONS.oxlint, prettier: VERSIONS.prettier },
    packageDevDeps: { oxlint: "catalog:" },
    rootConfigFiles: () => [file(".oxlintrc.json", OXLINTRC), file(".prettierrc", PRETTIERRC)],
    packageConfigFiles: () => [],
  },
  "eslint-prettier": {
    id: "eslint-prettier",
    lintScript: "eslint .",
    formatScript: PRETTIER_FORMAT,
    catalogEntries: [
      { name: "eslint", version: VERSIONS.eslint },
      { name: "@eslint/js", version: VERSIONS.eslintJs },
      { name: "typescript-eslint", version: VERSIONS.typescriptEslint },
      { name: "eslint-config-prettier", version: VERSIONS.eslintConfigPrettier },
      { name: "prettier", version: VERSIONS.prettier },
    ],
    rootDevDeps: {
      eslint: VERSIONS.eslint,
      "@eslint/js": VERSIONS.eslintJs,
      "typescript-eslint": VERSIONS.typescriptEslint,
      "eslint-config-prettier": VERSIONS.eslintConfigPrettier,
      prettier: VERSIONS.prettier,
    },
    packageDevDeps: { eslint: "catalog:" },
    rootConfigFiles: () => [
      file("eslint.config.mjs", ESLINT_CONFIG),
      file(".prettierrc", PRETTIERRC),
    ],
    packageConfigFiles: (base) => [file(`${base}/eslint.config.mjs`, ESLINT_PACKAGE_CONFIG)],
  },
};

export function getLinter(id: Linter): LinterDef {
  return LINTERS[id];
}
