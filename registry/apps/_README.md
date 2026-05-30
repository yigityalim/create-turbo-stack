# Slot: `app`

Framework skeletons. One subdirectory per `App["type"]` value in the schema.

| Variant id (= preset `App.type`) | What to scaffold |
|----------------------------------|------------------|
| `nextjs` | App-router Next.js 16+, `app/layout.tsx`, `app/page.tsx`, minimal CSS hook, `next.config.ts`. |
| `nextjs-api-only` | Next.js without `app/page.tsx` (API-route-only project). |
| `expo` | Expo SDK 52+, Expo Router, `app/_layout.tsx`. |
| `hono-standalone` | Hono server with `serve` entry, no frontend. |
| `vite-react` | Vite + React 19, `main.tsx` + `App.tsx`. |
| `vite-vue` | Vite + Vue 3. |
| `sveltekit` | SvelteKit, `routes/+page.svelte`. |
| `astro` | Astro starter, `pages/index.astro`. |
| `tauri` | Tauri + Vite (React shell). |

Each item:

- `slot: "app"`, `variant: "<one of the above>"`.
- `dependencies` includes the framework runtime; `devDependencies` includes
  the framework toolchain (e.g. `next`, `@types/node`, `vite`, …).
- `files` carries the actual TS/TSX/JSON/svelte sources.
- Use `{{scope}}` for workspace imports — these apps consume
  `{{scope}}/env`, `{{scope}}/db`, `{{scope}}/api`, `{{scope}}/auth`, etc.

Apps are NOT placed under `packages/<name>/` like other items. The CLI
materialises an app item into `apps/<projectName>/` (or wherever
`App["location"]` points). The engine knows this via `slot: "app"`.

For the manifest contract see `registry/README.md` ("First-party
(slot-filling) items"). For a fully-worked example see `registry/env/t3-env/`.
