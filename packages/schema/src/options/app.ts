import { z } from "zod";

export const AppTypeSchema = z.enum([
  "nextjs",
  "nextjs-api-only",
  "expo",
  "hono-standalone",
  "vite-react",
  "vite-vue",
  "sveltekit",
  "astro",
  "tauri",
]);
export type AppType = z.infer<typeof AppTypeSchema>;

export const AppSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  type: AppTypeSchema,
  port: z.number().int().min(1000).max(65535),
  i18n: z.boolean().default(false),
  consumes: z.array(z.string()).default([]),
});
export type App = z.infer<typeof AppSchema>;
