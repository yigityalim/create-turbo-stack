import * as p from "@clack/prompts";
import type { Preset, UserConfig } from "@create-turbo-stack/schema";
import {
  AiSchema,
  AnalyticsSchema,
  ApiStrategySchema,
  AuthProviderSchema,
  DatabaseStrategySchema,
  EmailSchema,
  ErrorTrackingSchema,
  RateLimitSchema,
  ValidatedPresetSchema,
} from "@create-turbo-stack/schema";
import pc from "picocolors";
import { applyDiff } from "../io/apply-diff";
import { filterOptions, validatePresetAgainstPolicy } from "../io/policy";
import { readProjectConfig } from "../io/reader";

interface SwitchOptions {
  dryRun?: boolean;
}

// Categories: db | auth | api | analytics | errorTracking | email | rateLimit | ai
export async function switchCommand(
  category: string,
  value: string | undefined,
  userConfig?: UserConfig,
  options: SwitchOptions = {},
): Promise<void> {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);
  if (!config) {
    p.log.error("No .turbo-stack.json found.");
    process.exit(1);
  }

  p.intro(`${pc.bgYellow(pc.black(" switch "))} ${pc.cyan(category)}`);

  const policy = userConfig?.policy;
  const newProvider = value ?? (await pickNewProvider(category, policy));
  if (!newProvider) {
    p.log.info("Cancelled.");
    return;
  }

  const updatedPreset = applySwitch(config as Preset, category, newProvider);
  if (!updatedPreset) {
    p.log.error(`Unknown switch category: ${pc.cyan(category)}.`);
    process.exit(1);
  }

  const result = ValidatedPresetSchema.safeParse(updatedPreset);
  if (!result.success) {
    p.log.error(`The new value "${newProvider}" doesn't validate against the schema:`);
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const violations = validatePresetAgainstPolicy(result.data, policy);
  if (violations.length > 0) {
    p.log.error("Resulting preset violates policy:");
    for (const v of violations) p.log.error(`  ${v}`);
    process.exit(1);
  }

  await applyDiff(cwd, config as Preset, result.data, { dryRun: options.dryRun });
  p.outro(`${pc.green("Done!")} ${pc.cyan(category)} switched to ${pc.cyan(newProvider)}.`);
}

/**
 * Map a `category` argument to (a) its prompt-time enum options and
 * (b) the policy filter slot used to narrow them. Returns null for
 * unknown categories.
 */
function categoryMeta(category: string): {
  enum: readonly string[];
  policy: Parameters<typeof filterOptions>[2];
  currentLabel: string;
} | null {
  switch (category) {
    case "db":
    case "database":
      return { enum: DatabaseStrategySchema.options, policy: "database", currentLabel: "database" };
    case "auth":
      return { enum: AuthProviderSchema.options, policy: "auth", currentLabel: "auth" };
    case "api":
      return { enum: ApiStrategySchema.options, policy: "api", currentLabel: "api" };
    case "analytics":
      return { enum: AnalyticsSchema.options, policy: "analytics", currentLabel: "analytics" };
    case "errorTracking":
      return {
        enum: ErrorTrackingSchema.options,
        policy: "errorTracking",
        currentLabel: "errorTracking",
      };
    case "email":
      return { enum: EmailSchema.options, policy: "email", currentLabel: "email" };
    case "rateLimit":
      return { enum: RateLimitSchema.options, policy: "rateLimit", currentLabel: "rateLimit" };
    case "ai":
      return { enum: AiSchema.options, policy: "ai", currentLabel: "ai" };
    default:
      return null;
  }
}

async function pickNewProvider(
  category: string,
  policy: UserConfig["policy"] | undefined,
): Promise<string | null> {
  const meta = categoryMeta(category);
  if (!meta) {
    p.log.error(`Unknown switch category: ${pc.cyan(category)}.`);
    return null;
  }
  const allowed = filterOptions(meta.enum, policy, meta.policy);
  if (allowed.length === 0) {
    p.log.error("Project policy forbids every value for this category.");
    return null;
  }
  const choice = (await p.select({
    message: `New ${meta.currentLabel}`,
    options: allowed.map((v) => ({ value: v, label: v })),
  })) as string | symbol;
  return p.isCancel(choice) ? null : (choice as string);
}

/**
 * Produce a new preset with the chosen category set to `value`.
 * Returns null if `category` doesn't map to a known slot.
 *
 * For `db` / `auth` / `api` we reset the discriminated union to its
 * minimal shape (just the strategy/provider) — the diff engine then
 * computes the file-level transition. For integrations we only flip the
 * single field.
 */
function applySwitch(preset: Preset, category: string, value: string): Preset | null {
  switch (category) {
    case "db":
    case "database":
      return {
        ...preset,
        database: { strategy: value as Preset["database"]["strategy"] } as Preset["database"],
      };
    case "auth":
      return {
        ...preset,
        auth: {
          provider: value as Preset["auth"]["provider"],
          rbac: preset.auth.rbac,
          entitlements: preset.auth.entitlements,
        },
      };
    case "api":
      return {
        ...preset,
        api: { strategy: value as Preset["api"]["strategy"] } as Preset["api"],
      };
    case "analytics":
    case "errorTracking":
    case "email":
    case "rateLimit":
    case "ai":
      return {
        ...preset,
        integrations: { ...preset.integrations, [category]: value },
      };
    default:
      return null;
  }
}
