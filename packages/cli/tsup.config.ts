import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

const shared = {
  define: { __CLI_VERSION__: JSON.stringify(version) },
  noExternal: [
    "@create-turbo-stack/core",
    "@create-turbo-stack/schema",
    "@create-turbo-stack/templates",
    "@create-turbo-stack/analyzer",
  ],
} as const;

export default defineConfig([
  {
    entry: { "bin/create-turbo-stack": "bin/create-turbo-stack.ts" },
    format: ["esm"],
    clean: true,
    banner: { js: "#!/usr/bin/env node" },
    ...shared,
  },
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    ...shared,
  },
]);
