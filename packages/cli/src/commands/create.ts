import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import {
  computeCatalog,
  computeCssSourceMap,
  resolveAutoPackages,
  resolveFileTree,
} from "@create-turbo-stack/core";
import type { Preset, TurboStackConfig } from "@create-turbo-stack/schema";
import { ValidatedPresetSchema } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { initGit } from "../io/git";
import type { PM } from "../io/pm";
import { installDependencies } from "../io/pm";
import { writeFiles } from "../io/writer";
import { runCreatePrompts } from "../prompts/create-flow";

export async function createCommand(
  projectName: string | undefined,
  options: { preset?: string; yes?: boolean },
) {
  let preset: Preset;

  if (options.preset) {
    // Load preset from file or URL
    let raw: string;
    if (options.preset.startsWith("http://") || options.preset.startsWith("https://")) {
      const res = await fetch(options.preset);
      if (!res.ok) {
        p.log.error(`Failed to fetch preset: ${res.status} ${res.statusText}`);
        process.exit(1);
      }
      raw = await res.text();
    } else {
      raw = await fs.readFile(path.resolve(options.preset), "utf-8");
    }

    try {
      const parsed = JSON.parse(raw);
      if (projectName) parsed.basics = { ...parsed.basics, projectName };
      // Ensure required fields have fallbacks
      if (!parsed.name) parsed.name = parsed.basics?.projectName ?? "my-project";
      if (!parsed.version) parsed.version = "1.0.0";
      preset = parsed;
    } catch {
      p.log.error("Invalid preset JSON.");
      process.exit(1);
    }
  } else {
    // Interactive prompts
    preset = await runCreatePrompts(projectName);
  }

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
    const catalogEntries = computeCatalog(validated);
    const catalogObj: Record<string, string> = {};
    for (const entry of catalogEntries) {
      catalogObj[entry.name] = entry.version;
    }

    const config: TurboStackConfig = {
      ...validated,
      generatedAt: new Date().toISOString(),
      cliVersion: "0.1.0",
      catalog: catalogObj,
      cssSourceMap: computeCssSourceMap(validated),
      autoPackages: resolveAutoPackages(validated).map((p) => p.name),
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
