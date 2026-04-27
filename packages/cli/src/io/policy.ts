/**
 * Policy enforcement helpers.
 *
 * Three operations:
 *   - filterOptions    — narrow a list of choices for a prompt
 *   - isLocked         — true if `policy.require` pins this field
 *   - lockedValue      — fetch the pinned value (and skip the prompt)
 *   - validatePreset   — final check after a preset is fully assembled
 */

import type { Preset, UserConfig } from "@create-turbo-stack/schema";

type PolicyCategory = keyof NonNullable<NonNullable<UserConfig["policy"]>["allow"]>;
type RequireField = keyof NonNullable<NonNullable<UserConfig["policy"]>["require"]>;

/**
 * Filter `options` so only values allowed by the policy survive.
 * - Empty `allow` list = all allowed (no filtering).
 * - `forbid` always removes, even if `allow` is empty.
 *
 * Caller is responsible for checking the result is non-empty before
 * using it as prompt options. An empty result usually means the user's
 * policy is contradictory (e.g. forbid every value).
 */
export function filterOptions<T extends string>(
  options: readonly T[],
  policy: UserConfig["policy"] | undefined,
  category: PolicyCategory,
): T[] {
  if (!policy) return [...options];

  const allow = policy.allow?.[category] as readonly string[] | undefined;
  const forbid = policy.forbid?.[category] as readonly string[] | undefined;

  let result: T[] = [...options];
  if (allow && allow.length > 0) {
    result = result.filter((v) => allow.includes(v));
  }
  if (forbid && forbid.length > 0) {
    result = result.filter((v) => !forbid.includes(v));
  }
  return result;
}

/** True if a `require.<field>` value is set (locked). */
export function isLocked(policy: UserConfig["policy"] | undefined, field: RequireField): boolean {
  return policy?.require?.[field] !== undefined;
}

/** Returns the locked value or undefined. */
export function lockedValue<F extends RequireField>(
  policy: UserConfig["policy"] | undefined,
  field: F,
): NonNullable<NonNullable<UserConfig["policy"]>["require"]>[F] | undefined {
  return policy?.require?.[field];
}

/**
 * After the preset is assembled (interactive or from --preset), check
 * it against the policy. Returns a list of human-readable violations.
 * Empty array = clean.
 *
 * The CLI surfaces these and aborts. Better than silently rewriting
 * the user's preset to match policy.
 */
export function validatePresetAgainstPolicy(
  preset: Preset,
  policy: UserConfig["policy"] | undefined,
): string[] {
  if (!policy) return [];
  const violations: string[] = [];

  // Helper: forbid-list / allow-list check
  const check = (label: string, value: string | undefined, category: PolicyCategory) => {
    if (!value) return;
    const allow = policy.allow?.[category] as readonly string[] | undefined;
    const forbid = policy.forbid?.[category] as readonly string[] | undefined;
    if (forbid?.includes(value)) {
      violations.push(`${label} "${value}" is forbidden by policy`);
    }
    if (allow && allow.length > 0 && !allow.includes(value)) {
      violations.push(`${label} "${value}" is not in policy.allow.${category}`);
    }
  };

  // Basics
  check("packageManager", preset.basics.packageManager, "packageManager");
  check("linter", preset.basics.linter, "linter");
  check("auth.provider", preset.auth.provider, "auth");
  check("database.strategy", preset.database.strategy, "database");
  check("api.strategy", preset.api.strategy, "api");
  check("css.framework", preset.css.framework, "cssFramework");
  check("css.ui", preset.css.ui, "cssUi");
  check("integrations.analytics", preset.integrations.analytics, "analytics");
  check("integrations.errorTracking", preset.integrations.errorTracking, "errorTracking");
  check("integrations.email", preset.integrations.email, "email");
  check("integrations.rateLimit", preset.integrations.rateLimit, "rateLimit");
  check("integrations.ai", preset.integrations.ai, "ai");
  for (const app of preset.apps) {
    check(`apps[${app.name}].type`, app.type, "appType");
  }

  // Required values
  if (policy.require?.typescript && preset.basics.typescript !== policy.require.typescript) {
    violations.push(
      `policy requires typescript "${policy.require.typescript}", got "${preset.basics.typescript}"`,
    );
  }
  if (
    policy.require?.envValidation !== undefined &&
    preset.integrations.envValidation !== policy.require.envValidation
  ) {
    violations.push(
      `policy requires envValidation = ${policy.require.envValidation}, got ${preset.integrations.envValidation}`,
    );
  }
  if (
    policy.require?.packageManager &&
    preset.basics.packageManager !== policy.require.packageManager
  ) {
    violations.push(
      `policy requires packageManager "${policy.require.packageManager}", got "${preset.basics.packageManager}"`,
    );
  }
  if (policy.require?.linter && preset.basics.linter !== policy.require.linter) {
    violations.push(
      `policy requires linter "${policy.require.linter}", got "${preset.basics.linter}"`,
    );
  }
  if (policy.require?.database && preset.database.strategy !== policy.require.database) {
    violations.push(
      `policy requires database "${policy.require.database}", got "${preset.database.strategy}"`,
    );
  }
  if (policy.require?.auth && preset.auth.provider !== policy.require.auth) {
    violations.push(`policy requires auth "${policy.require.auth}", got "${preset.auth.provider}"`);
  }
  if (policy.require?.api && preset.api.strategy !== policy.require.api) {
    violations.push(`policy requires api "${policy.require.api}", got "${preset.api.strategy}"`);
  }

  return violations;
}
