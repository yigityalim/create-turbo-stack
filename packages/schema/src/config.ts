import { z } from "zod";
import { PresetSchema } from "./preset";
import { UserConfigSchema } from "./user-config";

/** Schema for .turbo-stack.json in generated projects. */
export const TurboStackConfigSchema = PresetSchema.extend({
  generatedAt: z.string().datetime(),
  cliVersion: z.string(),
  catalog: z.record(z.string(), z.string()).default({}),
  cssSourceMap: z.record(z.string(), z.array(z.string())).default({}),
  autoPackages: z.array(z.string()).default([]),
  /**
   * Project-local CLI config — registries, policy, plugins. Lives here so a
   * project needs ONE file: `.turbo-stack.json` is both the resolved state and
   * the config. An out-of-project `create-turbo-stack.json` (or the global
   * `~/.create-turbo-stack/config.json`) is optional and for org/team defaults;
   * this block wins on overlap.
   */
  config: UserConfigSchema.optional(),
});

export type TurboStackConfig = z.infer<typeof TurboStackConfigSchema>;
