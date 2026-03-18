import { z } from "zod";
import { PresetSchema } from "./preset";

/** Schema for .turbo-stack.json in generated projects. */
export const TurboStackConfigSchema = PresetSchema.extend({
  generatedAt: z.string().datetime(),
  cliVersion: z.string(),
  catalog: z.record(z.string(), z.string()).default({}),
  cssSourceMap: z.record(z.string(), z.array(z.string())).default({}),
  autoPackages: z.array(z.string()).default([]),
});

export type TurboStackConfig = z.infer<typeof TurboStackConfigSchema>;
