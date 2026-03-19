import { Command } from "commander";
import { addCommand } from "../src/commands/add";
import { analyzeCommand } from "../src/commands/analyze";
import { createCommand } from "../src/commands/create";
import { mcpCommand } from "../src/commands/mcp";
import { presetCommand } from "../src/commands/preset";

const program = new Command()
  .name("create-turbo-stack")
  .description("Scaffold production-ready Turborepo monorepos")
  .version("1.0.0");

// Default: create
program
  .argument("[project-name]", "Project name")
  .option("--preset <url>", "Use a preset URL or file path")
  .option("--yes", "Accept all defaults")
  .action(createCommand);

// Subcommands
program
  .command("add <type>")
  .description("Add app, package, integration, or dependency to existing project")
  .action(addCommand);

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

program.command("mcp").description("Start MCP server for AI agent integration").action(mcpCommand);

program.parse();
