// User-authored config (`create-turbo-stack.json`). Distinct from
// `.turbo-stack.json` which is CLI-written state. Three keys:
// `defaults` (pre-fill prompts), `policy` (allow/forbid/require),
// `plugins` (npm packages to dynamic-import).

import { z } from "zod";
import { ApiStrategySchema } from "./options/api";
import { AppTypeSchema } from "./options/app";
import { AuthProviderSchema } from "./options/auth";
import { LinterSchema, PackageManagerSchema, TypeScriptStrictnessSchema } from "./options/basics";
import { CssFrameworkSchema, StylingArchSchema, UiLibrarySchema } from "./options/css";
import { DatabaseStrategySchema } from "./options/database";
import {
  AiSchema,
  AnalyticsSchema,
  EmailSchema,
  ErrorTrackingSchema,
  RateLimitSchema,
} from "./options/integrations";

// Defaults — pre-fill values for the create / add prompts

const ScopeSchema = z.string().regex(/^@[a-z0-9-]+$/);

export const UserConfigDefaultsSchema = z.object({
  basics: z
    .object({
      scope: ScopeSchema.optional(),
      packageManager: PackageManagerSchema.optional(),
      linter: LinterSchema.optional(),
      typescript: TypeScriptStrictnessSchema.optional(),
      gitInit: z.boolean().optional(),
    })
    .optional(),
  auth: z
    .object({
      provider: AuthProviderSchema.optional(),
    })
    .optional(),
  database: z
    .object({
      strategy: DatabaseStrategySchema.optional(),
    })
    .optional(),
  api: z
    .object({
      strategy: ApiStrategySchema.optional(),
    })
    .optional(),
  css: z
    .object({
      framework: CssFrameworkSchema.optional(),
      ui: UiLibrarySchema.optional(),
      styling: StylingArchSchema.optional(),
    })
    .optional(),
  integrations: z
    .object({
      analytics: AnalyticsSchema.optional(),
      errorTracking: ErrorTrackingSchema.optional(),
      email: EmailSchema.optional(),
      rateLimit: RateLimitSchema.optional(),
      ai: AiSchema.optional(),
      envValidation: z.boolean().optional(),
    })
    .optional(),
});
export type UserConfigDefaults = z.infer<typeof UserConfigDefaultsSchema>;

// Policy — allow / forbid / require constraints

/**
 * `allow` whitelists which enum values appear in prompts. If absent for
 * a category, all values are allowed (default behaviour).
 *
 * `forbid` blacklists values. Applied AFTER `allow`, wins on overlap.
 *
 * `require` locks a value: prompt is skipped entirely, the field is
 * forced to the configured value. Useful for compliance ("typescript:
 * strict everywhere", "envValidation: always on").
 */
export const PolicyAllowFieldsSchema = z.object({
  appType: z.array(AppTypeSchema).optional(),
  packageManager: z.array(PackageManagerSchema).optional(),
  linter: z.array(LinterSchema).optional(),
  auth: z.array(AuthProviderSchema).optional(),
  database: z.array(DatabaseStrategySchema).optional(),
  api: z.array(ApiStrategySchema).optional(),
  cssFramework: z.array(CssFrameworkSchema).optional(),
  cssUi: z.array(UiLibrarySchema).optional(),
  analytics: z.array(AnalyticsSchema).optional(),
  errorTracking: z.array(ErrorTrackingSchema).optional(),
  email: z.array(EmailSchema).optional(),
  rateLimit: z.array(RateLimitSchema).optional(),
  ai: z.array(AiSchema).optional(),
});

export const PolicyRequireSchema = z.object({
  typescript: TypeScriptStrictnessSchema.optional(),
  envValidation: z.boolean().optional(),
  packageManager: PackageManagerSchema.optional(),
  linter: LinterSchema.optional(),
  /**
   * Pin the database / auth / api strategy. Useful for shops that
   * standardise on a specific stack ("we use Drizzle, period"). Note
   * these slots are discriminated unions on the Preset, so locking
   * them via require disables the strategy prompt entirely; the user
   * can still pick driver-level details (Drizzle driver, Hono mode).
   */
  database: DatabaseStrategySchema.optional(),
  auth: AuthProviderSchema.optional(),
  api: ApiStrategySchema.optional(),
});

export const UserConfigPolicySchema = z.object({
  allow: PolicyAllowFieldsSchema.optional(),
  forbid: PolicyAllowFieldsSchema.optional(),
  require: PolicyRequireSchema.optional(),
});
export type UserConfigPolicy = z.infer<typeof UserConfigPolicySchema>;

export const UserConfigSchema = z.object({
  $schema: z.string().optional(),
  defaults: UserConfigDefaultsSchema.optional(),
  policy: UserConfigPolicySchema.optional(),
  /**
   * npm package names whose default export contributes plugin entries
   * (AppTypeDefinition or IntegrationDefinition). Imported at CLI
   * startup before any prompts run.
   */
  plugins: z.array(z.string().min(1)).optional(),
});
export type UserConfig = z.infer<typeof UserConfigSchema>;
