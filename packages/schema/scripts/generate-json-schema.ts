/**
 * Generate JSON Schema files from Zod schemas.
 * Output: apps/web/public/schema/*.json
 */

import fs from "node:fs";
import path from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { TurboStackConfigSchema } from "../src/config";
import { PresetSchema } from "../src/preset";
import { RegistrySchema } from "../src/registry";

const outDir = path.resolve(import.meta.dirname, "../../../apps/web/public/schema");
fs.mkdirSync(outDir, { recursive: true });

function writeSchema(
  filename: string,
  title: string,
  zodSchema: Parameters<typeof zodToJsonSchema>[0],
) {
  const schema = zodToJsonSchema(zodSchema, { $refStrategy: "none" });
  const output = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title,
    ...schema,
  };
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`  ✓ ${filename}`);
}

console.log("Generating JSON schemas...\n");

writeSchema("preset.json", "create-turbo-stack Preset", PresetSchema);
writeSchema("registry.json", "create-turbo-stack Registry", RegistrySchema);
writeSchema("config.json", "create-turbo-stack Config", TurboStackConfigSchema);

console.log(`\nDone. Output: ${outDir}`);
