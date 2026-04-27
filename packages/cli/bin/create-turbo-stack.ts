import * as p from "@clack/prompts";
import type { UserConfig } from "@create-turbo-stack/schema";
import { Command } from "commander";
import pc from "picocolors";
import { addCommand } from "../src/commands/add";
import { analyzeCommand } from "../src/commands/analyze";
import { createCommand } from "../src/commands/create";
import { doctorCommand } from "../src/commands/doctor";
import { infoCommand } from "../src/commands/info";
import { initCommand } from "../src/commands/init";
import { listCommand } from "../src/commands/list";
import { mcpCommand } from "../src/commands/mcp";
import { presetCommand } from "../src/commands/preset";
import { removeCommand } from "../src/commands/remove";
import { switchCommand } from "../src/commands/switch";
import { upgradeCommand } from "../src/commands/upgrade";
import { loadPlugins } from "../src/io/plugins";
import { loadUserConfig } from "../src/io/user-config";
import { CLI_VERSION } from "../src/version";

async function main() {
  const cwd = process.cwd();

  let userConfig: UserConfig | undefined;
  try {
    const loaded = await loadUserConfig(cwd);
    if (loaded) {
      userConfig = loaded.config;
      p.log.info(`Loaded config from ${pc.dim(loaded.filePath)}`);
    }
  } catch (err) {
    p.log.error((err as Error).message);
    process.exit(1);
  }

  if (userConfig?.plugins?.length) {
    const { loaded, failed } = await loadPlugins(userConfig.plugins, cwd);
    if (loaded > 0) p.log.info(`Registered ${loaded} plugin(s)`);
    if (failed.length > 0) {
      // Failures are warnings, not fatal — the user might be running without
      // dev dependencies installed (e.g. cleanroom box).
    }
  }

  const program = new Command()
    .name("create-turbo-stack")
    .description("Scaffold production-ready Turborepo monorepos")
    .version(CLI_VERSION)
    // Global flag — surfaced via `program.opts().verbose`. The
    // unhandled-rejection sink at the bottom of `main()` reads it to
    // decide between "one-line message" and "full stack trace".
    .option("--verbose", "Print stack traces and detailed errors");

  // Default: create
  program
    .argument("[project-name]", "Project name")
    .option("--preset <url>", "Use a preset URL or file path")
    .option("--yes", "Accept all defaults")
    .option("--dry-run", "Print what would be done without writing")
    .action((projectName, options) => createCommand(projectName, options, userConfig));

  program
    .command("add <type> [name]")
    .description(
      "Add app, package, integration, or dependency. " +
        "For `dependency`, [name] is the npm package; pass --to=<workspace>.",
    )
    .option("--dry-run", "Print what would be done without writing")
    .option(
      "--to <workspace>",
      "Target workspace path (apps/web, packages/ui, ...) — for dependency",
    )
    .option("--dev", "Add as a devDependency — for dependency")
    .option("--version <semver>", "Pin a specific version — for dependency (default: latest)")
    .action((type, name, options) => addCommand(type, userConfig, options, name));

  program
    .command("remove <type> [name]")
    .description("Remove app, package, or integration from existing project")
    .option("--dry-run", "Print what would be done without writing")
    .action((type, name, options) => removeCommand(type, name, userConfig, options));

  program
    .command("upgrade")
    .description("Migrate the project's preset to the current schema version")
    .option("--dry-run", "Print what would be done without writing")
    .action((options) => upgradeCommand(options));

  program
    .command("switch <category> [value]")
    .description(
      "Atomically swap a provider. Categories: db | auth | api | analytics | errorTracking | email | rateLimit | ai",
    )
    .option("--dry-run", "Print what would be done without writing")
    .action((category, value, options) => switchCommand(category, value, userConfig, options));

  program
    .command("analyze [path]")
    .description("Analyze an existing Turborepo project and generate a preset")
    .option("-o, --output <file>", "Save preset to file")
    .option("--json", "Output raw JSON to stdout")
    .option("--open-builder", "Open preset in web builder")
    .option("--diff <file>", "Compare analyzed preset with existing file")
    .option("-v, --verbose", "Verbose output")
    .action(analyzeCommand);

  program
    .command("preset <action> [file]")
    .description("Save or validate a preset (actions: save, validate)")
    .action(presetCommand);

  program
    .command("init [path]")
    .description("Adopt an existing Turborepo by analyzing it and writing .turbo-stack.json")
    .option("--force", "Overwrite an existing .turbo-stack.json")
    .action((targetPath, options) => initCommand(targetPath, options));

  program
    .command("info")
    .description("Print a one-screen summary of the current project's stack")
    .option("--json", "Emit machine-readable JSON")
    .action((options) => infoCommand(options));

  program
    .command("list")
    .description("List supported app types and integrations (registries, including plugins)")
    .option("--json", "Emit machine-readable JSON")
    .action((options) => listCommand(options));

  program
    .command("doctor")
    .description("Run environment + project sanity checks")
    .option("--json", "Emit machine-readable JSON")
    .action((options) => doctorCommand(options));

  program
    .command("mcp")
    .description("Start MCP server for AI agent integration")
    .action(mcpCommand);

  program.parse();

  // Verbose mode promotes thrown errors to full stack traces; otherwise
  // the catch handler below renders a one-line message.
  process.on("unhandledRejection", (err) => {
    if (program.opts().verbose) {
      console.error(err);
    } else {
      console.error(`error: ${(err as Error).message ?? err}`);
    }
    process.exit(1);
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
