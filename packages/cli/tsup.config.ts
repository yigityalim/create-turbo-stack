import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { "bin/create-turbo-stack": "bin/create-turbo-stack.ts" },
    format: ["esm"],
    clean: true,
    banner: { js: "#!/usr/bin/env node" },
    // Bundle all workspace packages into the CLI binary
    noExternal: [
      "@create-turbo-stack/core",
      "@create-turbo-stack/schema",
      "@create-turbo-stack/templates",
      "@create-turbo-stack/analyzer",
    ],
  },
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    noExternal: [
      "@create-turbo-stack/core",
      "@create-turbo-stack/schema",
      "@create-turbo-stack/templates",
      "@create-turbo-stack/analyzer",
    ],
  },
]);
