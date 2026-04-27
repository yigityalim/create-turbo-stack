import path from "node:path";
import * as p from "@clack/prompts";
import { analyze } from "@create-turbo-stack/analyzer";
import { computeCatalog, computeCssSourceMap, resolveAutoPackages } from "@create-turbo-stack/core";
import type { Preset, TurboStackConfig } from "@create-turbo-stack/schema";
import { CURRENT_PRESET_SCHEMA_VERSION, ValidatedPresetSchema } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { readProjectConfig, writeProjectConfig } from "../io/reader";
import { CLI_VERSION } from "../version";

interface InitOptions {
  force?: boolean;
}

// `init [path]` — analyze + persist `.turbo-stack.json` so the rest
// of the toolchain becomes available on a pre-existing Turborepo.
export async function initCommand(targetPath?: string, options: InitOptions = {}): Promise<void> {
  const cwd = targetPath ? path.resolve(targetPath) : process.cwd();
  const existing = await readProjectConfig(cwd);
  if (existing && !options.force) {
    p.log.error(
      `${cwd}/.turbo-stack.json already exists. Re-run with --force to overwrite, or use \`analyze\` to inspect without persisting.`,
    );
    process.exit(1);
  }

  p.intro(`${pc.bgGreen(pc.black(" init "))} ${pc.cyan(cwd)}`);

  const s = p.spinner();
  s.start("Analyzing workspace");
  const result = await analyze(cwd);
  s.stop("Analysis complete");

  // analyze() doesn't stamp schemaVersion — fill it in here so the
  // resulting state file matches the live schema.
  const preset: Preset = {
    ...result.preset,
    schemaVersion: CURRENT_PRESET_SCHEMA_VERSION,
  };

  const validated = ValidatedPresetSchema.safeParse(preset);
  if (!validated.success) {
    p.log.error("The analyzed preset doesn't validate. This usually means an unsupported stack:");
    for (const issue of validated.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  // tools have a complete picture without recomputing every time.
  const catalogEntries = computeCatalog(validated.data);
  const catalog: Record<string, string> = {};
  for (const entry of catalogEntries) catalog[entry.name] = entry.version;

  const config: TurboStackConfig = {
    ...validated.data,
    generatedAt: new Date().toISOString(),
    cliVersion: CLI_VERSION,
    catalog,
    cssSourceMap: computeCssSourceMap(validated.data),
    autoPackages: resolveAutoPackages(validated.data).map((pkg) => pkg.name),
  };

  await writeProjectConfig(cwd, config);

  p.log.info(`Wrote ${pc.cyan(`${path.relative(process.cwd(), cwd) || "."}/.turbo-stack.json`)}`);
  p.outro(
    `${pc.green("Done!")} Try ${pc.cyan("create-turbo-stack info")} or ${pc.cyan("create-turbo-stack add app")}.`,
  );
}
