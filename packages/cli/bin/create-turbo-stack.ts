#!/usr/bin/env node

import { Command } from "commander";
import { addCommand } from "../src/commands/add";
import { createCommand } from "../src/commands/create";

const program = new Command()
  .name("create-turbo-stack")
  .description("Scaffold production-ready Turborepo monorepos")
  .version("0.0.0");

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

program.parse();
