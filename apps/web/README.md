# @create-turbo-stack/web

Public website for create-turbo-stack.

## Pages

- `/` — Landing page
- `/builder` — Interactive stack builder with live file tree preview
- `/presets` — Community preset gallery

## Development

```bash
# From monorepo root
bun run dev --filter=web

# Or directly
cd apps/web && bun run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

## Architecture

The web app imports `@create-turbo-stack/core` and `@create-turbo-stack/schema` directly. The builder uses `resolveFileTree()` from core to generate live file tree previews in the browser — no server-side generation needed.
