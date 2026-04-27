# cts-plugin-vite-vue

Reference plugin for [`create-turbo-stack`](https://github.com/yigityalim/create-turbo-stack).
Adds a working **Vite + Vue 3** app type.

## What it does

`AppTypeSchema` already lists `"vite-vue"`, but the CLI ships no
implementation for it — selecting it would otherwise produce an
explicit `UnsupportedAppTypeError`. Loading this plugin registers the
missing definition (package.json shape, tsconfig extends, inline
`.eta` source templates), turning `vite-vue` into a real scaffold
target.

## Install

```bash
npm install --save-dev cts-plugin-vite-vue
```

## Wire it up

Add a `create-turbo-stack.json` at the root of the project (or any
parent directory the CLI walks up to) containing:

```json
{
  "$schema": "https://create-turbo-stack.dev/schema/user-config.json",
  "plugins": ["cts-plugin-vite-vue"]
}
```

The CLI imports declared plugins on startup and merges their
`AppTypeDefinition` / `IntegrationDefinition` exports into the
in-process registries. From that moment, `vite-vue` shows up in the
prompt for `add app` and is accepted by `create --preset`.

## Why this exists

It's the smallest concrete proof that the plugin architecture works
end-to-end: a separate npm package contributes a whole app framework
without touching the create-turbo-stack repo. Use it as a copy-paste
starting point for new frameworks (Nuxt, SolidStart, Qwik City, …).

## How to write your own

1. `defineAppType({...})` from `@create-turbo-stack/core`
2. Implement `buildPackageJson`, `buildTsconfig`, `buildTemplateContext`
3. Inline templates in the `templates: { "<path>.eta": "..." }` field
4. `export default` the result
5. Publish to npm; reference by name in `create-turbo-stack.json.plugins`

That's the whole contract. No PRs against this repo required.
