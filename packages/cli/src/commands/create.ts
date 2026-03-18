import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import { resolveFileTree } from "@create-turbo-stack/core";
import { ValidatedPresetSchema } from "@create-turbo-stack/schema";
import type { Preset, TurboStackConfig } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { initGit } from "../io/git";
import { installDependencies } from "../io/pm";
import type { PM } from "../io/pm";
import { writeFiles } from "../io/writer";
import { runCreatePrompts } from "../prompts/create-flow";

export async function createCommand(
  projectName: string | undefined,
  options: { preset?: string; yes?: boolean },
) {
  if (options.preset) {
    // TODO: Phase 3 — fetch preset from URL or file
    p.log.error("Preset loading not yet implemented. Use interactive mode.");
    process.exit(1);
  }

  // Interactive prompts
  const preset: Preset = await runCreatePrompts(projectName);

  // Validate
  const result = ValidatedPresetSchema.safeParse(preset);
  if (!result.success) {
    p.log.error("Invalid configuration:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const validated = result.data;
  const outputDir = path.resolve(process.cwd(), validated.basics.projectName);

  // Check if directory exists
  try {
    await fs.access(outputDir);
    p.log.error(`Directory ${pc.cyan(validated.basics.projectName)} already exists.`);
    process.exit(1);
  } catch {
    // Directory doesn't exist, good
  }

  const s = p.spinner();

  // 1. Generate file tree
  s.start("Generating project files");
  const tree = resolveFileTree(validated);
  s.stop(`Generated ${pc.cyan(String(tree.nodes.length))} files`);

  // 2. Write to disk
  s.start("Writing files to disk");
  try {
    await writeFiles(outputDir, tree.nodes);

    // Write .turbo-stack.json
    const config: TurboStackConfig = {
      ...validated,
      generatedAt: new Date().toISOString(),
      cliVersion: "0.0.0",
      catalog: {},
      cssSourceMap: {},
      autoPackages: [],
    };
    await fs.writeFile(
      path.join(outputDir, ".turbo-stack.json"),
      JSON.stringify(config, null, 2),
      "utf-8",
    );
    s.stop("Files written");
  } catch (err) {
    s.stop("Failed to write files");
    // Cleanup on failure
    await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }

  // 3. Git init
  s.start("Initializing git repository");
  try {
    initGit(outputDir);
    s.stop("Git initialized");
  } catch {
    s.stop("Git init skipped");
  }

  // 4. Install dependencies
  s.start(`Installing dependencies with ${validated.basics.packageManager}`);
  try {
    installDependencies(outputDir, validated.basics.packageManager as PM);
    s.stop("Dependencies installed");
  } catch {
    s.stop("Dependency install failed — run manually");
  }

  // 5. Done
  const pm = validated.basics.packageManager;
  p.note(
    [
      `${pc.bold("cd")} ${validated.basics.projectName}`,
      `${pc.bold(pm === "npm" ? "npm run" : pm)} dev`,
    ].join("\n"),
    "Next steps",
  );

  p.outro(`${pc.green("Done!")} Project created at ${pc.cyan(validated.basics.projectName)}`);
}
