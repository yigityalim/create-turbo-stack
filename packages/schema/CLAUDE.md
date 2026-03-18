# packages/schema

Zod 4 schemas and TypeScript types. Zero logic — only validation.

## Key Files

- `src/preset.ts` — PresetSchema + ValidatedPresetSchema (with cross-field validation)
- `src/config.ts` — TurboStackConfigSchema (.turbo-stack.json format)
- `src/registry.ts` — RegistrySchema (community preset registry)
- `src/file-tree.ts` — FileTree/FileTreeNode interfaces (no Zod, just types)
- `src/options/*.ts` — Sub-schemas: basics, database, api, auth, app, package, css, integrations

## Rules

- Browser-safe: no Node.js APIs
- Zod v4 (not v3)
- All types derived from schemas via `z.infer<>`
- Cross-field validation in ValidatedPresetSchema.superRefine()
- `scripts/generate-json-schema.ts` generates JSON Schema to `apps/web/public/schema/`
