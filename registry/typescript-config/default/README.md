# typescript-config / default

Shared TypeScript configuration for every package in the workspace. One
`base.json` carries the strict, bundler-oriented defaults; the other configs
extend it for a specific target. This is foundational — nearly every other
package's `tsconfig.json` extends one of these.

## The configs

| Config | Extend it when the package is… | Adds on top of base |
|--------|-------------------------------|---------------------|
| `base.json` | (never extended directly by apps) | the shared defaults |
| `library.json` | a source-export package (`build: "none"`) | `lib: ES2022` |
| `node.json` | Node-only (DB drivers, standalone servers, scripts) | `lib: ES2022` + `@types/node` |
| `react-library.json` | a React component package | `DOM` libs + `react-jsx` |
| `nextjs.json` | a Next.js App Router app | `DOM` libs + `next` plugin + `@types/node` |

## Why these defaults

`base.json` uses `module: "preserve"`, which mirrors how modern bundlers
(Next.js, Vite, SvelteKit) treat modules and implies `moduleResolution:
"Bundler"`. That's what lets packages import siblings without file extensions
(`import { env } from "{{scope}}/env"`) — the bundler resolves the path. It
pairs with `verbatimModuleSyntax` so `import type` is used correctly, and turns
on the 2026 strictness baseline: `strict`, `noUncheckedIndexedAccess`,
`noImplicitOverride`, `isolatedModules`, `moduleDetection: "force"`.

`lib` is deliberately **not** set in `base.json` — each target config declares
its own. Source-export packages that touch Web APIs (`fetch`, `crypto`,
`Request`) should set `lib: ["ES2022", "WebWorker"]` in their own
`tsconfig.json` rather than pulling in `DOM`, so a stray `document`/`window`
fails to compile instead of crashing at runtime.

## After install

Each package extends the matching config and adds only its own `include` (and
`outDir` if it compiles):

```jsonc
// packages/cache/tsconfig.json
{
  "extends": "{{scope}}/typescript-config/library.json",
  "compilerOptions": {
    "lib": ["ES2022", "WebWorker"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

```jsonc
// apps/web/tsconfig.json
{
  "extends": "{{scope}}/typescript-config/nextjs.json",
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```
