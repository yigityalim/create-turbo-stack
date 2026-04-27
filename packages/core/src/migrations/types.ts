/**
 * Preset schema migration plugin.
 *
 * When the preset schema shape changes (a field is renamed, a default
 * shifts, an enum is restructured), drop a migration here. The runner
 * picks them up by `from` version and chains them in order until the
 * preset reaches the current schema version.
 *
 * Migrations operate on `unknown` because the input is, by definition,
 * shaped like an *older* schema. Validate AFTER migrating.
 */

export interface PresetMigration {
  /** Schema version this migration accepts as input. */
  from: string;
  /** Schema version this migration produces. */
  to: string;
  /**
   * Pure transform from the old shape to the new shape. Should not
   * read from disk or perform side effects.
   */
  apply(preset: Record<string, unknown>): Record<string, unknown>;
}

export function definePresetMigration(m: PresetMigration): PresetMigration {
  return m;
}
