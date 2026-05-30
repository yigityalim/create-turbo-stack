# Slot: `typescript-config`

Shared tsconfig presets. Foundational — every preset depends on this.

| Variant id | Notes |
|------------|-------|
| `default` | One base + per-target extends (`base.json`, `nextjs.json`, `library.json`, `react-library.json`, `node.json`). |

The item exposes JSON files (no `src/`), each a tsconfig with the relevant
`compilerOptions`. Other packages extend them via:

```jsonc
{ "extends": "@scope/typescript-config/library.json" }
```

- No `dependencies` (consumed at build time, never at runtime).
- `devDependencies: ["typescript"]` so a fresh install has the compiler.
- `exports` declares each tsconfig file as a subpath (`"./base.json"`,
  `"./nextjs.json"`, …).
- `environment` is unset; tsconfig has no runtime.

For the manifest contract see `registry/README.md`. For a fully-worked
example see `registry/env/t3-env/`.
