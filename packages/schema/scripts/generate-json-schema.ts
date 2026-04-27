/**
 * Generate JSON Schema files from Zod schemas.
 * Output: apps/web/public/schema/*.json
 */

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { TurboStackConfigSchema } from "../src/config";
import { PresetSchema } from "../src/preset";
import { RegistrySchema } from "../src/registry";
import { UserConfigSchema } from "../src/user-config";

const outDir = path.resolve(import.meta.dirname, "../../../apps/web/public/schema");
fs.mkdirSync(outDir, { recursive: true });

function writeSchema(filename: string, title: string, zodSchema: z.ZodType) {
  const schema = z.toJSONSchema(zodSchema);
  const output = {
    title,
    ...schema,
  };
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, `${JSON.stringify(output, null, 2)}\n`, "utf-8");
  console.log(`  ✓ ${filename}`);
}

console.log("Generating JSON schemas...\n");

writeSchema("preset.json", "create-turbo-stack Preset", PresetSchema);
writeSchema("registry.json", "create-turbo-stack Registry", RegistrySchema);
writeSchema("config.json", "create-turbo-stack State", TurboStackConfigSchema);
writeSchema("user-config.json", "create-turbo-stack User Config", UserConfigSchema);

console.log(`\nDone. Output: ${outDir}`);
