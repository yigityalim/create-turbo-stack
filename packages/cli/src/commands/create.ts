import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import {
  computeCatalog,
  computeCssSourceMap,
  migratePreset,
  resolveAutoPackages,
  resolveFileTree,
  UnsupportedAppTypeError,
} from "@create-turbo-stack/core";
import type { FileTree, Preset, TurboStackConfig, UserConfig } from "@create-turbo-stack/schema";
import { CURRENT_PRESET_SCHEMA_VERSION, ValidatedPresetSchema } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { initGit } from "../io/git";
import type { PM } from "../io/pm";
import { installDependencies } from "../io/pm";
import { validatePresetAgainstPolicy } from "../io/policy";
import { writeFiles } from "../io/writer";
import { runCreatePrompts } from "../prompts/create-flow";
import { CLI_VERSION } from "../version";

export async function createCommand(
  projectName: string | undefined,
  options: { preset?: string; yes?: boolean; dryRun?: boolean },
  userConfig?: UserConfig,
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
      // Run schema migrations so old preset JSONs are accepted by the
      // current Zod validator instead of producing cryptic shape errors.
      const migrated = migratePreset(parsed, CURRENT_PRESET_SCHEMA_VERSION);
      preset = migrated as unknown as Preset;
    } catch (err) {
      p.log.error(`Invalid preset JSON: ${(err as Error).message}`);
      process.exit(1);
    }
  } else {
    // Interactive prompts
    preset = await runCreatePrompts(projectName, userConfig);
  }

  // Policy enforcement (independent of input source)
  const violations = validatePresetAgainstPolicy(preset, userConfig?.policy);
  if (violations.length > 0) {
    p.log.error("Preset violates policy:");
    for (const v of violations) p.log.error(`  ${v}`);
    process.exit(1);
  }

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

  try {
    await fs.access(outputDir);
    p.log.error(`Directory ${pc.cyan(validated.basics.projectName)} already exists.`);
    process.exit(1);
  } catch {
    // Directory doesn't exist, good
  }

  const s = p.spinner();

  s.start("Generating project files");
  let tree: FileTree;
  try {
    tree = resolveFileTree(validated);
  } catch (err) {
    s.stop("Generation failed");
    if (err instanceof UnsupportedAppTypeError) {
      p.log.error(err.message);
      process.exit(1);
    }
    throw err;
  }
  s.stop(`Generated ${pc.cyan(String(tree.nodes.length))} files`);

  // Dry-run: print what would be written and exit before touching disk.
  if (options.dryRun) {
    p.log.info(`(dry-run) would create ${pc.cyan(validated.basics.projectName)}/ with:`);
    for (const node of tree.nodes) {
      if (node.isDirectory) continue;
      p.log.message(`  ${pc.green("+")} ${node.path}`);
    }
    p.outro(`(dry-run) ${tree.nodes.filter((n) => !n.isDirectory).length} files would be written.`);
    return;
  }

  s.start("Writing files to disk");
  try {
    await writeFiles(outputDir, tree.nodes);

    const catalogEntries = computeCatalog(validated);
    const catalogObj: Record<string, string> = {};
    for (const entry of catalogEntries) {
      catalogObj[entry.name] = entry.version;
    }

    const config: TurboStackConfig = {
      ...validated,
      generatedAt: new Date().toISOString(),
      cliVersion: CLI_VERSION,
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
    await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }

  s.start("Initializing git repository");
  try {
    initGit(outputDir);
    s.stop("Git initialized");
  } catch {
    s.stop("Git init skipped");
  }

  s.start(`Installing dependencies with ${validated.basics.packageManager}`);
  try {
    installDependencies(outputDir, validated.basics.packageManager as PM);
    s.stop("Dependencies installed");
  } catch {
    s.stop("Dependency install failed — run manually");
  }

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
