import type { PackageManager } from "@create-turbo-stack/schema";

/**
 * Package-manager command surface. Lets templates / overrides emit the right
 * CLI snippets for the user's selected PM without hardcoding `bun install` or
 * `npm run` everywhere.
 */
export interface PmCommands {
  /** The PM identifier: `"bun" | "pnpm" | "npm" | "yarn"`. */
  name: PackageManager;
  /** `bun install` / `pnpm install` / `npm install` / `yarn install`. */
  install: string;
  /** Add a runtime dependency. */
  add(pkg: string): string;
  /** Add a devDependency. */
  addDev(pkg: string): string;
  /** Run a package.json script. (npm needs `run`; pnpm/yarn don't.) */
  run(script: string): string;
  /** One-shot exec — `bunx`/`pnpm dlx`/`npx`/`yarn dlx`. */
  exec(cmd: string): string;
}

export function getPmCommands(pm: PackageManager): PmCommands {
  switch (pm) {
    case "bun":
      return {
        name: "bun",
        install: "bun install",
        add: (p) => `bun add ${p}`,
        addDev: (p) => `bun add -d ${p}`,
        run: (s) => `bun run ${s}`,
        exec: (c) => `bunx ${c}`,
      };
    case "pnpm":
      return {
        name: "pnpm",
        install: "pnpm install",
        add: (p) => `pnpm add ${p}`,
        addDev: (p) => `pnpm add -D ${p}`,
        run: (s) => `pnpm ${s}`,
        exec: (c) => `pnpm dlx ${c}`,
      };
    case "npm":
      return {
        name: "npm",
        install: "npm install",
        add: (p) => `npm install ${p}`,
        addDev: (p) => `npm install -D ${p}`,
        run: (s) => `npm run ${s}`,
        exec: (c) => `npx ${c}`,
      };
    case "yarn":
      return {
        name: "yarn",
        install: "yarn install",
        add: (p) => `yarn add ${p}`,
        addDev: (p) => `yarn add -D ${p}`,
        run: (s) => `yarn ${s}`,
        exec: (c) => `yarn dlx ${c}`,
      };
  }
}

/**
 * Substitute `{{pm-*}}` placeholders in arbitrary text against the user's
 * package manager. Designed for `packageOverrides.extraFiles` (READMEs, docs)
 * so the user writes `{{pm-install}}` once and it renders correctly for
 * bun/pnpm/npm/yarn.
 *
 * Recognised placeholders:
 *   `{{pm}}`               → "bun" | "pnpm" | "npm" | "yarn"
 *   `{{pm-install}}`       → install command
 *   `{{pm-add <pkg>}}`     → `<pm> add <pkg>` (handles -D for dev)
 *   `{{pm-add-dev <pkg>}}` → add devDependency
 *   `{{pm-run <script>}}`  → run a package.json script
 *   `{{pm-exec <cmd>}}`    → bunx / npx / pnpm dlx / yarn dlx
 *
 * Static and safe — no code execution, no Eta. If the text has no
 * placeholders it's returned untouched.
 */
export function substitutePm(text: string, pm: PackageManager): string {
  if (!text.includes("{{pm")) return text;
  const c = getPmCommands(pm);
  return text
    .replace(/\{\{pm-install\}\}/g, c.install)
    .replace(/\{\{pm-add-dev\s+([^}]+)\}\}/g, (_, p) => c.addDev(p.trim()))
    .replace(/\{\{pm-add\s+([^}]+)\}\}/g, (_, p) => c.add(p.trim()))
    .replace(/\{\{pm-run\s+([^}]+)\}\}/g, (_, s) => c.run(s.trim()))
    .replace(/\{\{pm-exec\s+([^}]+)\}\}/g, (_, e) => c.exec(e.trim()))
    .replace(/\{\{pm\}\}/g, c.name);
}
