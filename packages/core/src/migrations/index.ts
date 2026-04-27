// Preset migration registry. Add: bump CURRENT_PRESET_SCHEMA_VERSION,
// drop a `v<from>-to-<to>.ts`, append to BUILT_IN_PRESET_MIGRATIONS.

import { registerPresetMigration } from "./registry";
import type { PresetMigration } from "./types";

const BUILT_IN_PRESET_MIGRATIONS: PresetMigration[] = [
  // Example — uncomment when you bump to "1.1":
  //
  // definePresetMigration({
  //   from: "1.0",
  //   to: "1.1",
  //   apply(preset) {
  //     // shape transformation...
  //   },
  // }),
];

for (const m of BUILT_IN_PRESET_MIGRATIONS) registerPresetMigration(m);

export {
  listPresetMigrations,
  migratePreset,
  registerPresetMigration,
} from "./registry";
export { definePresetMigration, type PresetMigration } from "./types";
