import { z } from "zod";

export const PackageManagerSchema = z.enum(["bun", "pnpm", "npm", "yarn"]);
export type PackageManager = z.infer<typeof PackageManagerSchema>;

export const TypeScriptStrictnessSchema = z.enum(["strict", "relaxed"]);
export type TypeScriptStrictness = z.infer<typeof TypeScriptStrictnessSchema>;

export const LinterSchema = z.enum(["biome", "eslint-prettier"]);
export type Linter = z.infer<typeof LinterSchema>;

export const BasicsSchema = z.object({
  projectName: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  packageManager: PackageManagerSchema.default("bun"),
  scope: z.string().regex(/^@[a-z0-9-]+$/),
  typescript: TypeScriptStrictnessSchema.default("strict"),
  linter: LinterSchema.default("biome"),
  gitInit: z.boolean().default(true),
});
export type Basics = z.infer<typeof BasicsSchema>;
