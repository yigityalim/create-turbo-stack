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
  "remix",
  "tauri",
]);
export type AppType = z.infer<typeof AppTypeSchema>;

/**
 * @deprecated CMS scaffolding is not implemented. The field is kept on
 * `AppSchema` for backwards compatibility with older preset JSONs and
 * the web builder, but no resolver reads it. Remove from new presets.
 */
export const CmsSchema = z.enum(["sanity", "keystatic", "none"]);
export type Cms = z.infer<typeof CmsSchema>;

export const AppSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  type: AppTypeSchema,
  port: z.number().int().min(1000).max(65535),
  i18n: z.boolean().default(false),
  cms: CmsSchema.default("none"),
  consumes: z.array(z.string()).default([]),
});
export type App = z.infer<typeof AppSchema>;
