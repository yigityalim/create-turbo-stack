import { z } from "zod";
import { WorkspaceLocationSchema } from "./package";

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
  /**
   * Directory the app lives under. Default `apps`. Set to anything else to
   * put it in a different workspace glob — `services`, `demos`, etc. Same
   * mechanism as `Package.location`; the engine emits a glob per distinct
   * location across apps + packages.
   */
  location: WorkspaceLocationSchema.default("apps"),
  port: z.number().int().min(1000).max(65535),
  i18n: z.boolean().default(false),
  consumes: z.array(z.string()).default([]),
});
export type App = z.infer<typeof AppSchema>;
