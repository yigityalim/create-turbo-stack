import { z } from "zod";

export const ApiStrategySchema = z.enum(["trpc", "hono", "rest-nextjs", "none"]);
export type ApiStrategy = z.infer<typeof ApiStrategySchema>;

export const HonoModeSchema = z.enum(["standalone-app", "nextjs-route"]);
export type HonoMode = z.infer<typeof HonoModeSchema>;

export const ApiSchema = z.discriminatedUnion("strategy", [
  z.object({
    strategy: z.literal("trpc"),
    version: z.literal("v11").default("v11"),
  }),
  z.object({
    strategy: z.literal("hono"),
    mode: HonoModeSchema,
  }),
  z.object({ strategy: z.literal("rest-nextjs") }),
  z.object({ strategy: z.literal("none") }),
]);
export type Api = z.infer<typeof ApiSchema>;
