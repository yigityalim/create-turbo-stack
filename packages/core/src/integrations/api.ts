import { VERSIONS } from "../wiring/versions";
import { defineIntegration } from "./types";

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
});

export const hono = defineIntegration({
  category: "api",
  provider: "hono",
  catalogEntries: () => [{ name: "hono", version: VERSIONS.hono }],
});

export const restNextjs = defineIntegration({
  category: "api",
  provider: "rest-nextjs",
  catalogEntries: () => [],
});

export const apiIntegrations = [trpc, hono, restNextjs];
