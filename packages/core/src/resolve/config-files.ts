import type {
  FileTreeNode,
  PackageManager,
  PackageRegistryItem,
  Preset,
} from "@create-turbo-stack/schema";
import { workspaceGlobs } from "../utils/package-path";
import { computeCatalog } from "../wiring/catalog";
import { computeEnvChain } from "../wiring/env-chain";
import { getLinter } from "../wiring/linters";
import { computeTurboConfig } from "../wiring/turbo-tasks";
import { VERSIONS } from "../wiring/versions";
import type { PackageJson, WorkspacesField } from "./manifest-types";

/**
 * Resolve root-level config files: package.json, turbo.json, biome.json, .gitignore, etc.
 */
export function resolveRootFiles(
  preset: Preset,
  items: ReadonlyArray<PackageRegistryItem> = [],
): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];
  const catalog = computeCatalog(preset, items);
  const envChain = computeEnvChain(preset, items);
  const turboConfig = computeTurboConfig(preset, envChain.globalEnv);

  // Root package.json
  const catalogObj: Record<string, string> = {};
  for (const entry of catalog) {
    catalogObj[entry.name] = entry.version;
  }

  const pm = preset.basics.packageManager;
  const hasCatalog = Object.keys(catalogObj).length > 0;

  // Catalog placement is package-manager specific:
  //   - bun reads `workspaces.catalog` in package.json
  //   - pnpm reads `catalog:` from pnpm-workspace.yaml (emitted below)
  //   - npm / yarn have no catalog protocol; for now they get a plain
  //     workspaces array (the `catalog:` refs in workspace package.json
  //     files won't resolve under npm/yarn — tracked separately).
  // Workspace globs are derived from the actual locations present in the
  // preset — `apps/*` + `packages/*` by default, plus any custom collection
  // a user opted into (`tooling/*`, `infrastructure/*`, `packages/billing/*`).
  const globs = workspaceGlobs(preset);
  const workspacesField: WorkspacesField =
    pm === "bun" && hasCatalog ? { packages: globs, catalog: catalogObj } : globs;

  const linter = getLinter(preset.basics.linter);

  const rootPkg: PackageJson = {
    name: preset.basics.projectName,
    private: true,
    scripts: {
      build: "turbo run build",
      dev: "turbo run dev",
      lint: "turbo run lint",
      "type-check": "turbo run type-check",
      format: linter.formatScript,
    },
    devDependencies: {
      ...linter.rootDevDeps,
      turbo: "^2.8.0",
      typescript: catalogObj.typescript ?? "^5.9.0",
    },
    packageManager: `${pm}@${VERSIONS[pm]}`,
    workspaces: workspacesField,
  };

  nodes.push({
    path: "package.json",
    content: JSON.stringify(rootPkg, null, 2),
    isDirectory: false,
  });

  // bunfig.toml — bun-specific config. Disable hardlinks so packages with
  // Windows-incompatible file names (e.g. @typescript-eslint/*) install
  // correctly on Windows without ENOENT copyfile errors.
  if (pm === "bun") {
    nodes.push({
      path: "bunfig.toml",
      content: "[install]\nhardlinks = false\n",
      isDirectory: false,
    });
  }

  // pnpm keeps its catalog (and workspace globs) in pnpm-workspace.yaml,
  // not package.json.
  if (pm === "pnpm" && hasCatalog) {
    const catalogYaml = Object.entries(catalogObj)
      .map(([name, version]) => `  "${name}": "${version}"`)
      .join("\n");
    const globsYaml = globs.map((g) => `  - "${g}"`).join("\n");
    nodes.push({
      path: "pnpm-workspace.yaml",
      content: `packages:\n${globsYaml}\ncatalog:\n${catalogYaml}\n`,
      isDirectory: false,
    });
  }

  // turbo.json
  nodes.push({
    path: "turbo.json",
    content: JSON.stringify(turboConfig, null, 2),
    isDirectory: false,
  });

  // .gitignore — the env rules are deliberately bulletproof: ignore every
  // `.env*` and re-include only the committed `*.example` templates, so a real
  // `.env.production` / `.env.local` can never slip into a commit.
  nodes.push({
    path: ".gitignore",
    content: `node_modules
.turbo
.next
dist
out
build
.env
.env.*
!.env.example
!.env.*.example
*.tsbuildinfo
next-env.d.ts
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

  // Linter config files (biome.json | .oxlintrc.json + .prettierrc | eslint.config.mjs + .prettierrc)
  nodes.push(...linter.rootConfigFiles(preset));

  // .env.example
  if (envChain.allVars.length > 0) {
    const envLines = envChain.allVars.map((v) => `# ${v.description}\n${v.name}=${v.example}`);
    nodes.push({
      path: ".env.example",
      content: `${envLines.join("\n\n")}\n`,
      isDirectory: false,
    });
  }

  // README.md — quick summary + day-1 commands
  nodes.push({
    path: "README.md",
    content: buildReadme(preset),
    isDirectory: false,
  });

  // GitHub Actions CI workflow
  nodes.push({
    path: ".github/workflows/ci.yml",
    content: buildCiWorkflow(preset.basics.packageManager),
    isDirectory: false,
  });

  // GitHub Actions security workflows — CodeQL code scanning + dependency
  // review on PRs. Both ship hardened (least-privilege token, no persisted
  // credentials). CodeQL/dependency-review are free on public repos; private
  // repos need GitHub Advanced Security, noted inline in each file.
  nodes.push({
    path: ".github/workflows/codeql.yml",
    content: buildCodeqlWorkflow(),
    isDirectory: false,
  });
  nodes.push({
    path: ".github/workflows/dependency-review.yml",
    content: buildDependencyReviewWorkflow(),
    isDirectory: false,
  });

  // Husky pre-commit + lint-staged
  nodes.push({
    path: ".husky/pre-commit",
    content: `#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\n${preset.basics.packageManager} run lint\n`,
    isDirectory: false,
  });

  // Root vitest config — wires every workspace member's vitest project. The
  // glob list mirrors the workspace declaration so custom collections
  // (`tooling/*`, `packages/billing/*`) are auto-discovered.
  const vitestProjects = globs.map((g) => JSON.stringify(g)).join(", ");
  nodes.push({
    path: "vitest.config.ts",
    content: `import { defineConfig } from "vitest/config";\n\nexport default defineConfig({\n  test: {\n    projects: [${vitestProjects}],\n  },\n});\n`,
    isDirectory: false,
  });

  // docker-compose.yml — local DB / cache services if the preset
  // depends on them.
  const composeContent = buildDockerCompose(preset);
  if (composeContent) {
    nodes.push({
      path: "docker-compose.yml",
      content: composeContent,
      isDirectory: false,
    });
  }

  return nodes;
}

/**
 * Day-1 README. Lists the resolved stack and the canonical commands so
 * a fresh contributor doesn't need to dig through preset JSON to know
 * what's wired.
 */
function buildReadme(preset: Preset): string {
  const pm = preset.basics.packageManager;
  const apps = preset.apps.map((a) => `\`${a.name}\` (${a.type}, port ${a.port})`).join(", ");
  const integrationParts: string[] = [];
  if (preset.database.strategy !== "none") integrationParts.push(`db: ${preset.database.strategy}`);
  if (preset.api.strategy !== "none") integrationParts.push(`api: ${preset.api.strategy}`);
  if (preset.auth.provider !== "none") integrationParts.push(`auth: ${preset.auth.provider}`);
  for (const k of ["analytics", "errorTracking", "email", "rateLimit", "ai"] as const) {
    const v = preset.integrations[k];
    if (v && v !== "none") integrationParts.push(`${k}: ${v}`);
  }
  const stackLine = integrationParts.length > 0 ? integrationParts.join(" · ") : "—";

  return `# ${preset.basics.projectName}

> Generated by \`create-turbo-stack\`.

## Stack

- **Apps:** ${apps || "—"}
- **CSS:** ${preset.css.framework}${preset.css.ui !== "none" ? ` + ${preset.css.ui}` : ""}
- **Linter:** ${preset.basics.linter}
- **Integrations:** ${stackLine}

## Setup

\`\`\`bash
${pm} install
cp .env.example .env.local   # then fill in real values
${preset.database.strategy !== "none" ? `${pm} run db:migrate     # apply schema migrations\n` : ""}${pm} run dev
\`\`\`

## Scripts

| Command | What |
|---|---|
| \`${pm} run dev\` | Start every app in watch mode |
| \`${pm} run build\` | Build everything for production |
| \`${pm} run lint\` | Lint via ${preset.basics.linter} |
| \`${pm} run type-check\` | tsc --noEmit per package |
| \`${pm} run test\` | Vitest across the workspace |

## Re-scaffolding

This project is described by \`.turbo-stack.json\`. To add an app, package, or
integration later:

\`\`\`bash
npx create-turbo-stack add app
npx create-turbo-stack add package
npx create-turbo-stack add integration
npx create-turbo-stack remove app <name>
\`\`\`
`;
}

/**
 * GitHub Actions CI — runs on push/PR, sets up the chosen package
 * manager, installs frozen, then lint + type-check + test + build.
 * Tasks are routed through Turborepo so caching works out of the box.
 */
function buildCiWorkflow(pm: PackageManager): string {
  const setup =
    pm === "bun"
      ? `      - uses: oven-sh/setup-bun@v1\n        with:\n          bun-version: latest\n      - run: bun install --frozen-lockfile`
      : pm === "pnpm"
        ? `      - uses: pnpm/action-setup@v3\n        with:\n          version: 9\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n      - run: pnpm install --frozen-lockfile`
        : pm === "yarn"
          ? `      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: yarn\n      - run: yarn install --frozen-lockfile`
          : `      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: npm\n      - run: npm ci`;
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Least-privilege default token — CI only needs to read the checkout.
permissions:
  contents: read

jobs:
  ci:
    runs-on: ubuntu-latest
    # No secrets in CI: the env package skips Zod validation at build time.
    env:
      SKIP_ENV_VALIDATION: "1"
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
${setup}
      - run: ${pm} run lint
      - run: ${pm} run type-check
      - run: ${pm} run test
      - run: ${pm} run build
`;
}

/**
 * CodeQL code scanning — static analysis for JS/TS on push, PR, and a weekly
 * schedule. Free on public repositories; private repos need GitHub Advanced
 * Security (the init step prints a clear error otherwise). Hardened with a
 * least-privilege token and a non-persisted checkout.
 */
function buildCodeqlWorkflow(): string {
  return `name: CodeQL

# Free on public repos. Private repos require GitHub Advanced Security;
# delete this file if your repo is private and GHAS is not enabled.
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 6 * * 1"

permissions:
  contents: read

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3
`;
}

/**
 * Dependency review — blocks a PR that introduces a vulnerable or
 * disallowed-license dependency. Runs only on pull requests. Free on public
 * repos; private repos need the dependency graph (GitHub Advanced Security).
 */
function buildDependencyReviewWorkflow(): string {
  return `name: Dependency review

# Free on public repos. Private repos require the dependency graph
# (GitHub Advanced Security); delete this file if it is not enabled.
on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: actions/dependency-review-action@v4
`;
}

/**
 * docker-compose service stub — only what the preset's database
 * strategy actually needs. Keeps `docker compose up` as a one-liner
 * for local development; absent for stateless presets.
 */
function buildDockerCompose(preset: Preset): string | null {
  if (preset.database.strategy === "none") return null;

  if (preset.database.strategy === "supabase") {
    return `services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    ports:
      - "54322:5432"
    volumes:
      - supabase-db:/var/lib/postgresql/data

volumes:
  supabase-db:
`;
  }

  // Drizzle / Prisma — pick the service from the driver if known.
  const driver =
    preset.database.strategy === "drizzle" && "driver" in preset.database
      ? preset.database.driver
      : "postgres";

  if (driver === "mysql") {
    return `services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: app
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql

volumes:
  mysql-data:
`;
  }

  return `services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
`;
}
