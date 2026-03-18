# packages/cli

CLI entry point. Node.js only. Published to npm as `create-turbo-stack`.

## Key Files

- `bin/create-turbo-stack.ts` — Shebang entry, Commander routing
- `src/commands/create.ts` — `create` command: prompts → resolveFileTree → write to disk
- `src/commands/add.ts` — `add` command (Phase 2, stub)
- `src/prompts/create-flow.ts` — Full interactive prompt flow with @clack/prompts
- `src/io/writer.ts` — Write FileTreeNode[] to disk
- `src/io/git.ts` — git init + initial commit
- `src/io/pm.ts` — Package manager detection and install

## Prompt Flow

project name → package manager → scope → database → API → auth → CSS → linter → apps (loop) → packages (loop) → integrations → summary → confirm → scaffold

## Dependencies

- @clack/prompts 1.x for interactive UI
- Commander 14 for arg parsing
- picocolors for terminal colors
- @create-turbo-stack/core for resolveFileTree()
- @create-turbo-stack/schema for validation
