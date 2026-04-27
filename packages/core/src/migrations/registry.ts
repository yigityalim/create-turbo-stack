import type { PresetMigration } from "./types";

const migrations: PresetMigration[] = [];

export function registerPresetMigration(m: PresetMigration): void {
  migrations.push(m);
}

export function listPresetMigrations(): readonly PresetMigration[] {
  return [...migrations];
}

/**
 * Walk migrations from the preset's recorded `schemaVersion` up to
 * `target`. Throws if no chain of registered migrations gets us there
 * — better to fail loudly than silently scaffold against a half-known
 * shape.
 */
export function migratePreset(
  preset: Record<string, unknown>,
  target: string,
): Record<string, unknown> {
  let current = (preset.schemaVersion as string | undefined) ?? "1.0";
  let result = preset;

  // Bound the loop to migration count + 1 so a misconfigured registry
  // (cycle, missing step) errors out instead of looping forever.
  const maxSteps = migrations.length + 1;

  for (let step = 0; step <= maxSteps; step += 1) {
    if (current === target) {
      return { ...result, schemaVersion: target };
    }
    const next = migrations.find((m) => m.from === current);
    if (!next) {
      throw new Error(
        `No migration registered from preset schema "${current}" toward "${target}". ` +
          `The preset is too new for this CLI, or a migration is missing.`,
      );
    }
    result = next.apply(result);
    current = next.to;
  }

  throw new Error(
    `Preset migration loop did not converge on target "${target}" within ${maxSteps} steps.`,
  );
}
