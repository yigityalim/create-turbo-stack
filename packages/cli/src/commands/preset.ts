import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import type { Preset } from "@create-turbo-stack/schema";
import { ValidatedPresetSchema } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { readProjectConfig } from "../io/reader";

export async function presetCommand(action: string, file?: string) {
  switch (action) {
    case "save":
      return presetSave(file);
    case "validate":
      return presetValidate(file);
    default:
      p.log.error(
        `Unknown preset action: ${pc.cyan(action)}. Use ${pc.cyan("save")} or ${pc.cyan("validate")}.`,
      );
      process.exit(1);
  }
}

async function presetSave(file?: string) {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);

  if (!config) {
    p.log.error("No .turbo-stack.json found.");
    process.exit(1);
  }

  const outputPath = file ?? `${config.basics.projectName}.preset.json`;

  const preset: Preset = {
    schemaVersion: "1.0",
    name: config.name ?? config.basics.projectName,
    version: "1.0.0",
    description: config.description ?? "",
    basics: config.basics,
    database: config.database,
    api: config.api,
    auth: config.auth,
    css: config.css,
    integrations: config.integrations,
    apps: config.apps,
    packages: config.packages,
  };

  const result = ValidatedPresetSchema.safeParse(preset);
  if (!result.success) {
    p.log.error("Current config has validation issues:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  await fs.writeFile(path.resolve(cwd, outputPath), JSON.stringify(result.data, null, 2), "utf-8");

  p.log.success(`Preset saved to ${pc.cyan(outputPath)}`);
}

async function presetValidate(file?: string) {
  let data: unknown;

  if (file) {
    const content = await fs.readFile(path.resolve(process.cwd(), file), "utf-8");
    data = JSON.parse(content);
  } else {
    const config = await readProjectConfig(process.cwd());
    if (!config) {
      p.log.error("No .turbo-stack.json found and no file specified.");
      process.exit(1);
    }
    data = config;
  }

  const result = ValidatedPresetSchema.safeParse(data);

  if (result.success) {
    p.log.success(`${pc.green("Valid!")} Preset passes all validation checks.`);
    p.log.info(`  Name: ${pc.cyan(result.data.basics.projectName)}`);
    p.log.info(`  Apps: ${result.data.apps.map((a) => a.name).join(", ")}`);
    p.log.info(`  Packages: ${result.data.packages.map((pkg) => pkg.name).join(", ") || "(none)"}`);
  } else {
    p.log.error(`${pc.red("Invalid!")} ${result.error.issues.length} issue(s):`);
    for (const issue of result.error.issues) {
      p.log.error(`  ${pc.dim(issue.path.join("."))} — ${issue.message}`);
    }
    process.exit(1);
  }
}
