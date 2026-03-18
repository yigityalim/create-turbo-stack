# Contributing to create-turbo-stack

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Bun](https://bun.sh/) >= 1.1
- [Git](https://git-scm.com/)

### Getting Started

1. Fork and clone the repository:

```bash
git clone https://github.com/mehmetyigityalim/create-turbo-stack.git
cd create-turbo-stack
```

2. Install dependencies:

```bash
bun install
```

3. Build all packages:

```bash
bun run build
```

4. Run in development mode:

```bash
bun run dev
```

## Project Structure

```
create-turbo-stack/
├── apps/web/          # Landing page + builder
├── packages/schema/   # Zod schemas (preset, config, registry)
├── packages/core/     # Business logic (platform-agnostic)
├── packages/templates/ # EJS template files
├── packages/cli/      # CLI entry point
└── presets/           # Built-in presets
```

## Development Workflow

### Branching

| Branch | Purpose |
|--------|---------|
| `main` | Stable, release-ready. Every commit is deployable. |
| `dev` | Integration branch. Features merge here first. |
| `feat/*` | New features: `feat/resolve-file-tree` |
| `fix/*` | Bug fixes: `fix/css-source-path` |
| `docs/*` | Documentation: `docs/update-sdd` |
| `chore/*` | Infrastructure: `chore/biome-config` |

- `feat/*`, `fix/*` branch from `dev` and merge back to `dev` via PR
- `dev → main` merges happen with version bumps only

### Making Changes

1. Create a branch from `dev`:

```bash
git checkout -b feat/my-feature dev
```

2. Make your changes. Follow these guidelines:
   - Write TypeScript, not JavaScript
   - Core package must have **zero Node.js dependencies** (runs in browser)
   - Templates use Eta (EJS-compatible) syntax
   - All schemas defined in the `schema` package

3. Add tests for new functionality:

```bash
bun run test
```

4. Ensure linting passes:

```bash
bun run lint
```

5. Commit following our convention (see below)

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) with scopes:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

| Type | When |
|------|------|
| `feat` | New feature, new API |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Build, CI, deps, tooling |
| `refactor` | Code change that doesn't change behavior |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |

**Scopes:** `schema`, `core`, `templates`, `cli`, `web`, or omit for root/general changes.

**Rules:**
- English, lowercase, imperative mood ("add", not "added" or "adds")
- Max 72 characters for the title line
- One logical change per commit
- If breaking change: add `BREAKING CHANGE:` footer

**Examples:**

```
feat(core): implement resolveFileTree for nextjs apps
fix(wiring): correct relative path calculation for CSS @source
docs: update SDD with registry schema design
chore(cli): add tsup build configuration
test(schema): add cross-field validation tests
refactor(core): extract auto-package resolution into separate module
```

### Versioning

We use [SemVer](https://semver.org/):

```
0.x.y — Pre-release (v0.1.0 through v0.5.0)
1.0.0 — First stable release
```

- All packages in the monorepo share the same version
- Patch bump (`0.0.x`): bugfix, small improvements
- Minor bump (`0.x.0`): new phase completed, new features
- Major bump (`1.0.0`): all phases done, stable API

### Releases & Tags

Every release gets a git tag: `v0.1.0`, `v0.2.0`, etc.

### Pull Requests

1. Push your branch and open a PR against `dev`
2. Fill in the PR template
3. Ensure CI passes (lint, type-check, test, build)
4. Request a review
5. Squash merge or regular merge (maintainer's choice)

## Adding a New App Type

To add support for a new app type (e.g., Solid.js):

1. Add the type to `packages/schema/src/options/app.ts` (`AppTypeSchema`)
2. Create templates in `packages/templates/src/app/solidjs/`
3. Add file resolution logic in `packages/core/src/resolve/app-files.ts`
4. Add catalog dependencies in `packages/core/src/wiring/catalog.ts`
5. Add tests

## Adding a New Integration

To add a new integration (e.g., Stripe):

1. Add to `packages/schema/src/options/integrations.ts`
2. Create templates in `packages/templates/src/integration/stripe/`
3. Add file resolution in `packages/core/src/resolve/integration-files.ts`
4. Add env vars in `packages/core/src/wiring/env-chain.ts`
5. Add catalog deps in `packages/core/src/wiring/catalog.ts`
6. Add tests

## Creating a Community Preset

See the [Registry documentation](./docs/registry.md) for how to create and publish presets.

## Reporting Issues

- Use [GitHub Issues](https://github.com/mehmetyigityalim/create-turbo-stack/issues)
- Include reproduction steps
- Include your environment (OS, Node version, package manager)

## Code of Conduct

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
