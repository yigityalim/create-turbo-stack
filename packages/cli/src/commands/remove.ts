import * as p from "@clack/prompts";
import type { Preset, UserConfig } from "@create-turbo-stack/schema";
import { ValidatedPresetSchema } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { applyDiff } from "../io/apply-diff";
import { validatePresetAgainstPolicy } from "../io/policy";
import { readProjectConfig } from "../io/reader";

export async function removeCommand(
  type: string,
  name?: string,
  userConfig?: UserConfig,
  options: { dryRun?: boolean } = {},
) {
  switch (type) {
    case "app":
      return removeApp(name, userConfig, options);
    case "package":
      return removePackage(name, userConfig, options);
    case "integration":
      return removeIntegration(name, userConfig, options);
    default:
      p.log.error(
        `Unknown remove type: ${pc.cyan(type)}. Use ${pc.cyan("app")}, ${pc.cyan("package")}, or ${pc.cyan("integration")}.`,
      );
      process.exit(1);
  }
}

async function removeApp(
  name: string | undefined,
  userConfig?: UserConfig,
  options: { dryRun?: boolean } = {},
) {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);
  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }

  if (config.apps.length === 0) {
    p.log.info("No apps to remove.");
    return;
  }

  p.intro(`${pc.bgRed(pc.black(" remove app "))} from ${pc.cyan(config.basics.projectName)}`);

  const target =
    name ??
    ((await p.select({
      message: "Which app to remove?",
      options: config.apps.map((a) => ({
        value: a.name,
        label: `${a.name} (${a.type})`,
      })),
    })) as string);
  if (p.isCancel(target)) return process.exit(0);

  if (!config.apps.some((a) => a.name === target)) {
    p.log.error(`App "${target}" not found.`);
    process.exit(1);
  }

  const confirm = (await p.confirm({
    message: `Remove app ${pc.cyan(target)} and all its files?`,
    initialValue: false,
  })) as boolean;
  if (p.isCancel(confirm) || !confirm) return process.exit(0);

  const updatedPreset: Preset = {
    ...config,
    apps: config.apps.filter((a) => a.name !== target),
  };

  const result = ValidatedPresetSchema.safeParse(updatedPreset);
  if (!result.success) {
    p.log.error("Validation failed after removal:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  enforcePolicy(result.data, userConfig);
  await applyDiff(cwd, config as Preset, result.data, { dryRun: options.dryRun });
  p.outro(`${pc.green("Done!")} App ${pc.cyan(target)} removed.`);
}

async function removePackage(
  name: string | undefined,
  userConfig?: UserConfig,
  options: { dryRun?: boolean } = {},
) {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);
  if (!config) {
    p.log.error("No .turbo-stack.json found.");
    process.exit(1);
  }

  if (config.packages.length === 0) {
    p.log.info("No user-defined packages to remove.");
    return;
  }

  p.intro(`${pc.bgRed(pc.black(" remove package "))} from ${pc.cyan(config.basics.projectName)}`);

  const target =
    name ??
    ((await p.select({
      message: "Which package to remove?",
      options: config.packages.map((pkg) => ({
        value: pkg.name,
        label: `${pkg.name} (${pkg.type})`,
      })),
    })) as string);
  if (p.isCancel(target)) return process.exit(0);

  if (!config.packages.some((pkg) => pkg.name === target)) {
    p.log.error(`Package "${target}" not found.`);
    process.exit(1);
  }

  const consumers = config.apps.filter((a) => a.consumes.includes(target));
  if (consumers.length > 0) {
    p.log.warn(
      `Apps consuming this package will lose their import: ${consumers.map((a) => a.name).join(", ")}`,
    );
  }

  const confirm = (await p.confirm({
    message: `Remove package ${pc.cyan(target)} and all its files?`,
    initialValue: false,
  })) as boolean;
  if (p.isCancel(confirm) || !confirm) return process.exit(0);

  const updatedPreset: Preset = {
    ...config,
    packages: config.packages.filter((pkg) => pkg.name !== target),
    apps: config.apps.map((a) => ({
      ...a,
      consumes: a.consumes.filter((c) => c !== target),
    })),
  };

  const result = ValidatedPresetSchema.safeParse(updatedPreset);
  if (!result.success) {
    p.log.error("Validation failed after removal:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  enforcePolicy(result.data, userConfig);
  await applyDiff(cwd, config as Preset, result.data, { dryRun: options.dryRun });
  p.outro(`${pc.green("Done!")} Package ${pc.cyan(target)} removed.`);
}

const INTEGRATION_CATEGORIES = ["analytics", "errorTracking", "email", "rateLimit", "ai"] as const;
type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

async function removeIntegration(
  category: string | undefined,
  userConfig?: UserConfig,
  options: { dryRun?: boolean } = {},
) {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);
  if (!config) {
    p.log.error("No .turbo-stack.json found.");
    process.exit(1);
  }

  p.intro(
    `${pc.bgRed(pc.black(" remove integration "))} from ${pc.cyan(config.basics.projectName)}`,
  );

  const cat = (category ??
    ((await p.select({
      message: "Which integration to remove?",
      options: INTEGRATION_CATEGORIES.filter(
        (c) => config.integrations[c] && config.integrations[c] !== "none",
      ).map((c) => ({ value: c, label: `${c} (${config.integrations[c]})` })),
    })) as IntegrationCategory)) as IntegrationCategory;
  if (p.isCancel(cat)) return process.exit(0);

  if (!INTEGRATION_CATEGORIES.includes(cat)) {
    p.log.error(`Unknown integration category: ${cat}.`);
    process.exit(1);
  }

  const updatedPreset: Preset = {
    ...config,
    integrations: { ...config.integrations, [cat]: "none" },
  };

  const result = ValidatedPresetSchema.safeParse(updatedPreset);
  if (!result.success) {
    p.log.error("Validation failed after removal:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  enforcePolicy(result.data, userConfig);
  await applyDiff(cwd, config as Preset, result.data, { dryRun: options.dryRun });
  p.outro(`${pc.green("Done!")} Integration ${pc.cyan(cat)} removed.`);
}

function enforcePolicy(preset: Preset, userConfig: UserConfig | undefined): void {
  const violations = validatePresetAgainstPolicy(preset, userConfig?.policy);
  if (violations.length === 0) return;
  p.log.error("Resulting preset violates policy:");
  for (const v of violations) p.log.error(`  ${v}`);
  process.exit(1);
}
