# Slot: `ui`

UI starter components. Opt-in — only landed when the preset declares a user
package with `producesCSS: true`.

| Variant id | Notes |
|------------|-------|
| `shadcn-starter` | shadcn/ui's first ~5–6 components (Button, Card, Input, Dialog, Form), wired with `class-variance-authority`, `clsx`, `tailwind-merge`. |

Item ships:

- `src/components/<component>.tsx` per component.
- `src/lib/cn.ts` — the `cn` helper.
- A `globals.css` snippet (Tailwind v4 `@theme`, CSS variables) consumed by
  whichever app imports the package.

- `dependencies` includes `class-variance-authority`, `clsx`,
  `tailwind-merge`, the relevant Radix primitives, `lucide-react`.
- `devDependencies` includes `tailwindcss`, `@tailwindcss/postcss`.
- `environment: "browser"` — components are client-only.
- `lib: ["ES2022", "DOM"]` — Radix touches `document`/`window`.

For the manifest contract see `registry/README.md`. For a fully-worked
example see `registry/env/t3-env/`.
