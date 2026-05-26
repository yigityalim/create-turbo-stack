# create-turbo-stack registry — authoring guide

This directory is the **source** of the CTS package registry: ready-made
Turborepo workspace packages that `cts add <name>` copies into a user's
monorepo. It's shadcn's registry model, but for whole packages instead of
React components — the code is **copied in and owned**, not hidden behind an
npm dependency.

If you are an agent asked to write a package, read this whole file first, then
follow the **Checklist** at the bottom.

---

## Mental model

```
registry/<name>/registry-item.json   the manifest (metadata + which files)
registry/<name>/src/*.ts             the real, working source you author
        │
        ▼  bun run build:registry   (inlines file contents, stamps checksum)
apps/web/public/r/<name>.json        the served artifact cts add fetches
        │
        ▼  cts add <name>
packages/<name>/ in the user's repo  (package.json, tsconfig, your src/*)
```

You write the left side. The build and `cts add` do the rest. This is the same
producer/consumer split as `.eta → templates-map` elsewhere in the repo.

## Directory convention — one folder per package

```
registry/
  my-package/
    registry-item.json     ← the manifest
    src/
      index.ts             ← your code (real, compiles, tested in your head)
      ...
```

The root `registry/registry.json` auto-discovers every package via
`"include": ["*/registry-item.json"]` — **you do not edit it** when adding a
package. Just drop a new folder with a `registry-item.json` and it's in.

## The manifest (`registry-item.json`)

```jsonc
{
  "$schema": "https://create-turbo-stack.dev/schema/package-registry.json",
  "name": "my-package",            // kebab-case, unique across the registry
  "type": "registry:package",
  "title": "My Package",           // shown on the web browse page
  "description": "One sentence on what it does and why.",
  "dependencies": ["zod@^4"],      // npm runtime deps → merged into the catalog
  "devDependencies": [],           // npm dev deps → merged into the catalog
  "registryDependencies": [],      // OTHER registry packages this one composes
  "exports": [".", "./sub"],       // subpath exports the package.json declares
  "environment": "universal",      // "node" | "browser" | "universal" (optional)
  "lib": ["ES2022", "DOM"],        // TS lib, only if you use Web/DOM types
  "build": "none",                 // "none" (source export) | "tsup" (compiled)
  "categories": ["security"],      // browse-page grouping tags
  "envVars": { "MY_KEY": "example-value" }, // appended to .env.example on add
  "docs": "Short usage note printed after `cts add`.",
  "files": [
    { "path": "src/index.ts", "type": "registry:source", "target": "src/index.ts" }
  ]
}
```

### Fields that matter most

| Field | Why it matters |
|-------|----------------|
| `name` | kebab-case, unique. Becomes `packages/<name>` and `@scope/<name>`. |
| `dependencies` / `devDependencies` | npm specs `name` or `name@version`. Merged into the **root catalog** (`catalog:`), never written as fixed versions in the package. |
| `registryDependencies` | Names of other registry packages. Pulled in first (see below). |
| `exports` | `"."` → `./src/index.ts`. `"./hash"` → `./src/hash.ts`. With `build: "tsup"`, points at `./dist/*` instead. So a file per export. |
| `environment` | `"node"` adds `@types/node` + tsconfig `types: ["node"]`. Use it whenever you import `node:*` or touch `process`. `"browser"`/`"universal"` add nothing — rely on `lib`. |
| `lib` | Only when you use Web APIs (`fetch`, `crypto`, `Request`, `TextEncoder`, DOM). Then `["ES2022", "DOM"]`. Omit otherwise. |
| `build` | `"none"` (default): exports `./src` directly, no build step — the right choice for almost everything. `"tsup"`: compiled to `dist`, for packages meant to be published to npm. |
| `envVars` | Vars the package reads. Appended to the user's `.env.example` (existing keys are never clobbered). |
| `docs` | Markdown, printed after install and shown on the browse page. Keep it to the one thing a user must know. |

### Composing packages (`registryDependencies`)

A package can build on another. Declare the dependency and import siblings
through the **`@scope/` placeholder** — `cts add` rewrites it to the user's
real scope (`@their-project/`) on write and wires `workspace:*` automatically.

```jsonc
// registry/session/registry-item.json
{ "name": "session", "registryDependencies": ["crypto"], ... }
```

```ts
// registry/session/src/index.ts
import { randomToken, sha256 } from "@scope/crypto"; // ← @scope/, not a real pkg
```

`cts add session` pulls `crypto` first, writes both packages, and the session
package.json gets `"@their-project/crypto": "workspace:*"`.

**Runtime sharing rule:** if your package consumes a Web-API source package
(e.g. one with `lib: ["ES2022","DOM"]`), declare the same `lib` so the shared
types resolve. (Or that dependency uses `build: "tsup"` and ships its `.d.ts`.)

## Build & verify

```bash
bun run build:registry     # inlines files, stamps a sha256 checksum per item
```

Every built item gets a `checksum` over its code + dependency graph. `cts add`
recomputes it after download and **refuses to install on a mismatch** — so
authoring carelessly can't ship corrupted content. Private/paid registries
(see `apps/store`) additionally **sign** the checksum; consumers verify with a
configured public key.

To sanity-check your package actually compiles in a real project:

```bash
# in a scaffolded test project
cts add my-package --registry /path/to/create-turbo-stack/apps/web/public/r
bun install && bun run type-check
```

## Rules

- **Real, working code.** The source must compile and do what the description
  says. A user reads and owns it.
- **kebab-case names**, unique across the registry.
- **No secrets** in source or `envVars` values — only example placeholders.
- **No fixed dependency versions in the package** — list them in
  `dependencies`/`devDependencies`; they flow through the catalog.
- **Minimal surface.** Prefer `build: "none"`. Add `environment`/`lib` only
  when the code actually needs those types.
- **One concern per package.** Compose with `registryDependencies` instead of
  bundling unrelated helpers.

## Checklist for a new package

1. `registry/<name>/src/*.ts` — write the working source. Use `@scope/<dep>`
   for any sibling registry import.
2. `registry/<name>/registry-item.json` — manifest: `name`, `description`,
   `exports` (one per file you expose), `dependencies`, and `environment`/`lib`
   only if needed. Add `docs` and `categories`.
3. `bun run build:registry` — confirm your package appears with a `checksum`.
4. `cts add <name> --registry apps/web/public/r` into a scratch project;
   `bun install && bun run type-check` — confirm it compiles.

## Reference packages

- `security/` — Web-API (`lib: DOM`), multiple exports, no deps.
- `crypto/` — Web Crypto helpers, multiple exports.
- `session/` — composes `crypto` via `registryDependencies` + `@scope/` import.
- `apps/store/registry/feature-flags/` — `environment: "node"`, signed/private.
