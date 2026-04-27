import * as p from "@clack/prompts";
import { migratePreset } from "@create-turbo-stack/core";
import type { Preset } from "@create-turbo-stack/schema";
import { CURRENT_PRESET_SCHEMA_VERSION, ValidatedPresetSchema } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { applyDiff } from "../io/apply-diff";
import { readProjectConfig } from "../io/reader";

/**
 * Walk the registered preset migrations to bring `.turbo-stack.json` up
 * to the current schema version. The diff engine then re-applies any
 * shape changes (renamed file paths, new templates, removed deps) on
 * disk, with the same atomic guarantee and conflict prompts as `add`.
 *
 * Idempotent: if the project is already on the current version, the
 * command reports "nothing to do" and exits without touching disk.
 */
export async function upgradeCommand(options: { dryRun?: boolean } = {}) {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);

  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }

  p.intro(`${pc.bgYellow(pc.black(" upgrade "))} ${pc.cyan(config.basics.projectName)}`);

  const currentVersion = (config as { schemaVersion?: string }).schemaVersion ?? "1.0";

  if (currentVersion === CURRENT_PRESET_SCHEMA_VERSION) {
    p.log.info(`Already on schema version ${pc.cyan(currentVersion)}. Nothing to do.`);
    p.outro("✓");
    return;
  }

  p.log.info(`Migrating ${pc.dim(currentVersion)} → ${pc.cyan(CURRENT_PRESET_SCHEMA_VERSION)}`);

  let migrated: Record<string, unknown>;
  try {
    migrated = migratePreset(
      config as unknown as Record<string, unknown>,
      CURRENT_PRESET_SCHEMA_VERSION,
    );
  } catch (err) {
    p.log.error((err as Error).message);
    process.exit(1);
  }

  // This is the moment a botched migration is caught.
  const result = ValidatedPresetSchema.safeParse(migrated);
  if (!result.success) {
    p.log.error("Migrated preset failed validation:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  // surfaces what actually changed file-by-file so the user sees the
  // upgrade's footprint before approving any conflicts.
  await applyDiff(cwd, config as Preset, result.data, { dryRun: options.dryRun });
  p.outro(
    `${pc.green("Done!")} Upgraded to schema version ${pc.cyan(CURRENT_PRESET_SCHEMA_VERSION)}.`,
  );
}
