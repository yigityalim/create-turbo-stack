import type { FileTreeNode, Preset } from "@create-turbo-stack/schema";
import { computeCatalog } from "../wiring/catalog";
import { computeEnvChain } from "../wiring/env-chain";
import { computeTurboConfig } from "../wiring/turbo-tasks";
import { VERSIONS } from "../wiring/versions";

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
    packageManager: `${preset.basics.packageManager}@${VERSIONS[preset.basics.packageManager as keyof typeof VERSIONS] ?? "latest"}`,
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

  // Husky pre-commit + lint-staged
  nodes.push({
    path: ".husky/pre-commit",
    content: `#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\n${preset.basics.packageManager} run lint\n`,
    isDirectory: false,
  });

  // Root vitest config — wires every package's vitest project automatically
  nodes.push({
    path: "vitest.config.ts",
    content: `import { defineConfig } from "vitest/config";\n\nexport default defineConfig({\n  test: {\n    projects: ["packages/*", "apps/*"],\n  },\n});\n`,
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
function buildCiWorkflow(pm: string): string {
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

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
${setup}
      - run: ${pm} run lint
      - run: ${pm} run type-check
      - run: ${pm} run test
      - run: ${pm} run build
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
