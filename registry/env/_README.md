# Slot: `env`

Type-safe environment validation package. The single import path the rest
of the workspace reads env from — never `process.env` directly.

| Variant id | Notes |
|------------|-------|
| `t3-env` | `@t3-oss/env-nextjs`-based validation. The reference item. |

This slot is special: it has exactly **one** mainstream variant today
(`t3-env`). New variants are valid additions (e.g. `envalid`, `dotenvx`)
but should follow the same shape — expose `import { env } from "..."` with
a typed object as the surface.

The generated env package's `createEnv` schema is **augmented** at resolve
time by every other slot item's `envVars` declarations — see
`registry/env/t3-env/README.md` for the contract. You do not edit
`src/index.ts` to add e.g. `RESEND_API_KEY`; the resolver picks that up
from the `email/resend` item.

This is also the **reference example** for the entire slot system. If
you're an agent writing a new item, copy the shape of `t3-env/` and adapt.
