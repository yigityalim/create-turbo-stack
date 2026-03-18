# @create-turbo-stack/web

Public website for create-turbo-stack, built with [Fumadocs](https://fumadocs.dev) + Next.js 16.

## Routes

| Route | Description |
|-------|-------------|
| `(home)` | Landing page |
| `/docs` | Documentation (Fumadocs MDX) |
| `/builder` | Interactive stack builder (planned) |
| `/presets` | Community preset gallery (planned) |
| `/schema/*` | JSON Schema files (static) |
| `/s/*` | Preset files + registry index (static) |

## Development

```bash
bun run dev --filter=web
```

## Docs

Add MDX files to `content/docs/`. They auto-appear in sidebar.
