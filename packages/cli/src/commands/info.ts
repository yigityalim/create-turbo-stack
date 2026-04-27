import * as p from "@clack/prompts";
import { CURRENT_PRESET_SCHEMA_VERSION, type TurboStackConfig } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { readProjectConfig } from "../io/reader";

interface InfoOptions {
  json?: boolean;
}

/**
 * `info` — one-screen summary of the current project's stack.
 *
 * Surfaces what `.turbo-stack.json` says: the resolved preset, schema
 * version (with a warning if behind), counts of apps/packages/auto
 * packages, and the integration matrix. Read-only; safe in CI.
 */
export async function infoCommand(options: InfoOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);

  if (!config) {
    if (options.json) {
      process.stdout.write(JSON.stringify({ error: "No .turbo-stack.json found" }, null, 2));
      process.exit(1);
    }
    p.log.error("No .turbo-stack.json found.");
    process.exit(1);
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(buildSummary(config), null, 2)}\n`);
    return;
  }

  const summary = buildSummary(config);

  p.intro(`${pc.bgCyan(pc.black(" info "))} ${pc.cyan(summary.projectName)}`);

  p.log.message(line("Schema version", schemaVersionLine(summary.schemaVersion)));
  p.log.message(line("CLI version", summary.cliVersion ?? pc.dim("—")));
  p.log.message(line("Generated at", summary.generatedAt ?? pc.dim("—")));

  p.log.message("");
  p.log.message(pc.bold("Basics"));
  p.log.message(line("  Package manager", summary.basics.packageManager));
  p.log.message(line("  Scope", summary.basics.scope));
  p.log.message(line("  Linter", summary.basics.linter));
  p.log.message(line("  TypeScript", summary.basics.typescript));

  p.log.message("");
  p.log.message(pc.bold("Stack"));
  p.log.message(line("  Database", summary.stack.database));
  p.log.message(line("  API", summary.stack.api));
  p.log.message(line("  Auth", summary.stack.auth));
  p.log.message(line("  CSS", summary.stack.css));

  p.log.message("");
  p.log.message(pc.bold(`Apps (${summary.apps.length})`));
  for (const a of summary.apps) p.log.message(`  ${pc.cyan(a.name)} — ${a.type}:${a.port}`);

  p.log.message("");
  p.log.message(pc.bold(`Packages (${summary.packages.length})`));
  for (const pkg of summary.packages) p.log.message(`  ${pc.cyan(pkg.name)} — ${pkg.type}`);

  p.log.message("");
  p.log.message(pc.bold("Integrations"));
  for (const [k, v] of Object.entries(summary.integrations)) {
    p.log.message(line(`  ${k}`, v === "none" ? pc.dim("none") : (v as string)));
  }

  p.outro("");
}

interface InfoSummary {
  projectName: string;
  schemaVersion: string;
  cliVersion?: string;
  generatedAt?: string;
  basics: {
    packageManager: string;
    scope: string;
    linter: string;
    typescript: string;
  };
  stack: { database: string; api: string; auth: string; css: string };
  apps: { name: string; type: string; port: number }[];
  packages: { name: string; type: string }[];
  integrations: Record<string, string | boolean>;
}

function buildSummary(config: TurboStackConfig): InfoSummary {
  return {
    projectName: config.basics.projectName,
    schemaVersion: (config as { schemaVersion?: string }).schemaVersion ?? "1.0",
    cliVersion: config.cliVersion,
    generatedAt: config.generatedAt,
    basics: {
      packageManager: config.basics.packageManager,
      scope: config.basics.scope,
      linter: config.basics.linter,
      typescript: config.basics.typescript,
    },
    stack: {
      database: config.database.strategy,
      api: config.api.strategy,
      auth: config.auth.provider,
      css: `${config.css.framework}${config.css.ui !== "none" ? ` + ${config.css.ui}` : ""}`,
    },
    apps: config.apps.map((a) => ({ name: a.name, type: a.type, port: a.port })),
    packages: config.packages.map((p) => ({ name: p.name, type: p.type })),
    integrations: { ...config.integrations },
  };
}

function line(label: string, value: string): string {
  return `${pc.dim(label.padEnd(18))} ${value}`;
}

function schemaVersionLine(version: string): string {
  if (version === CURRENT_PRESET_SCHEMA_VERSION) return version;
  return `${pc.yellow(version)} ${pc.dim(`(current: ${CURRENT_PRESET_SCHEMA_VERSION} — run \`upgrade\`)`)}`;
}
