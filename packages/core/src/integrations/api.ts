import type { Preset } from "@create-turbo-stack/schema";
import { renderSourceFiles } from "../render/render-source";
import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

/** Workspace dep on the db package, if the preset has a database. */
function dbDep(preset: Preset, scope: string): Record<string, string> {
  return preset.database.strategy !== "none" ? { [`${scope}/db`]: "workspace:*" } : {};
}

export const trpc = defineIntegration({
  category: "api",
  provider: "trpc",
  catalogEntries: () => [
    { name: "@trpc/server", version: VERSIONS.trpcServer },
    { name: "@trpc/client", version: VERSIONS.trpcClient },
    { name: "@trpc/react-query", version: VERSIONS.trpcReactQuery },
    { name: "@tanstack/react-query", version: VERSIONS.tanstackReactQuery },
    { name: "superjson", version: VERSIONS.superjson },
    { name: "zod", version: VERSIONS.zod },
  ],
  resolvePackageFiles: (preset, ctx) => [
    ...ctx.makeBase({
      deps: {
        "@trpc/server": "catalog:",
        "@trpc/client": "catalog:",
        "@trpc/react-query": "catalog:",
        "@tanstack/react-query": "catalog:",
        superjson: "catalog:",
        zod: "catalog:",
        ...dbDep(preset, ctx.scope),
      },
    }),
    ...renderSourceFiles("api/trpc", ctx.base, { scope: ctx.scope, database: preset.database }),
  ],
});

export const hono = defineIntegration({
  category: "api",
  provider: "hono",
  catalogEntries: () => [{ name: "hono", version: VERSIONS.hono }],
  resolvePackageFiles: (preset, ctx) => [
    ...ctx.makeBase({ deps: { hono: "catalog:", ...dbDep(preset, ctx.scope) } }),
    ...renderSourceFiles("api/hono", ctx.base, {}),
  ],
});

export const restNextjs = defineIntegration({
  category: "api",
  provider: "rest-nextjs",
  catalogEntries: () => [],
  resolvePackageFiles: (preset, ctx) => [
    ...ctx.makeBase({ deps: { ...dbDep(preset, ctx.scope) } }),
    ...renderSourceFiles("api/rest-nextjs", ctx.base, {}),
  ],
});

export const apiIntegrations = [trpc, hono, restNextjs];
