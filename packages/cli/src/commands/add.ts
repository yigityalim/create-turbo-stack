import * as p from "@clack/prompts";
import { resolveAutoPackages, SUPPORTED_APP_TYPES } from "@create-turbo-stack/core";
import type { App, Package, Preset, UserConfig } from "@create-turbo-stack/schema";
import {
  AiSchema,
  AnalyticsSchema,
  EmailSchema,
  ErrorTrackingSchema,
  PackageTypeSchema,
  RateLimitSchema,
  ValidatedPresetSchema,
} from "@create-turbo-stack/schema";
import pc from "picocolors";
import { applyDiff } from "../io/apply-diff";
import { filterOptions, validatePresetAgainstPolicy } from "../io/policy";
import { readProjectConfig } from "../io/reader";
import { addDependencyCommand } from "./add-dependency";

export async function addCommand(
  type: string,
  userConfig?: UserConfig,
  options: { dryRun?: boolean; to?: string; dev?: boolean; version?: string } = {},
  extra?: string,
) {
  switch (type) {
    case "app":
      return addApp(userConfig, options);
    case "package":
      return addPackage(userConfig, options);
    case "integration":
      return addIntegration(userConfig, options);
    case "dependency":
    case "dep":
      // `extra` carries the npm package name (e.g. `add dependency lodash`).
      if (!extra) {
        p.log.error(
          `Usage: ${pc.cyan("create-turbo-stack add dependency <package> [--to=<workspace>] [--dev]")}`,
        );
        process.exit(1);
      }
      return addDependencyCommand(extra, options);
    default:
      p.log.error(
        `Unknown add type: ${pc.cyan(type)}. Use ${pc.cyan("app")}, ${pc.cyan("package")}, ${pc.cyan("integration")}, or ${pc.cyan("dependency")}.`,
      );
      process.exit(1);
  }
}

function exitIfPolicyViolated(preset: Preset, policy: UserConfig["policy"] | undefined): void {
  const violations = validatePresetAgainstPolicy(preset, policy);
  if (violations.length === 0) return;
  p.log.error("This change violates the project policy:");
  for (const v of violations) p.log.error(`  ${v}`);
  process.exit(1);
}

async function addApp(userConfig?: UserConfig, options: { dryRun?: boolean } = {}) {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);

  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }

  p.intro(`${pc.bgCyan(pc.black(" add app "))} to ${pc.cyan(config.basics.projectName)}`);

  const existingNames = new Set(config.apps.map((a) => a.name));

  const name = (await p.text({
    message: "App name",
    placeholder: "admin",
    validate(value) {
      if (!value) return "Name is required";
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "Lowercase letters, numbers, hyphens only";
      if (existingNames.has(value)) return `App "${value}" already exists`;
    },
  })) as string;
  if (p.isCancel(name)) return process.exit(0);

  const allowedTypes = filterOptions(SUPPORTED_APP_TYPES, userConfig?.policy, "appType");
  if (allowedTypes.length === 0) {
    p.log.error("Project policy forbids every supported app type — nothing to add.");
    process.exit(1);
  }
  const appType = (await p.select({
    message: "App type",
    options: allowedTypes.map((t) => ({ value: t, label: t })),
  })) as App["type"];
  if (p.isCancel(appType)) return process.exit(0);

  const DEFAULT_START_PORT = 3000;
  const maxPort =
    config.apps.length > 0 ? Math.max(...config.apps.map((a) => a.port)) : DEFAULT_START_PORT - 1;
  const port = (await p.text({
    message: "Port",
    initialValue: String(maxPort + 1),
    validate(value) {
      const n = Number(value);
      if (Number.isNaN(n) || n < 1024 || n > 65535) return "Port must be between 1024 and 65535";
      if (config.apps.some((a) => a.port === n)) return `Port ${n} is already used`;
    },
  })) as string;
  if (p.isCancel(port)) return process.exit(0);

  let i18n = false;
  if (["nextjs", "sveltekit", "astro", "remix"].includes(appType)) {
    i18n = ((await p.confirm({
      message: "Enable i18n?",
      initialValue: false,
    })) ?? false) as boolean;
    if (p.isCancel(i18n)) return process.exit(0);
  }

  // CMS field is deprecated; default to "none" without prompting.
  const cms: App["cms"] = "none";

  const allPackages = [
    ...config.packages.map((p) => p.name),
    ...resolveAutoPackages(config as Preset).map((p) => p.name),
  ];
  const uniquePackages = [...new Set(allPackages)];

  let consumes: string[] = [];
  if (uniquePackages.length > 0) {
    consumes = ((await p.multiselect({
      message: "Consume packages",
      options: uniquePackages.map((name) => ({ value: name, label: name })),
      required: false,
    })) ?? []) as string[];
    if (p.isCancel(consumes)) return process.exit(0);
  }

  const newApp: App = {
    name,
    type: appType,
    port: Number(port),
    i18n,
    cms,
    consumes,
  };

  const updatedPreset: Preset = {
    ...config,
    apps: [...config.apps, newApp],
  };

  const result = ValidatedPresetSchema.safeParse(updatedPreset);
  if (!result.success) {
    p.log.error("Validation failed:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  exitIfPolicyViolated(result.data, userConfig?.policy);

  await applyDiff(cwd, config as Preset, result.data, { dryRun: options.dryRun });

  p.outro(`${pc.green("Done!")} App ${pc.cyan(name)} added.`);
}

async function addPackage(userConfig?: UserConfig, options: { dryRun?: boolean } = {}) {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);

  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }

  p.intro(`${pc.bgCyan(pc.black(" add package "))} to ${pc.cyan(config.basics.projectName)}`);

  const existingNames = new Set(config.packages.map((p) => p.name));

  const name = (await p.text({
    message: "Package name",
    placeholder: "billing",
    validate(value) {
      if (!value) return "Name is required";
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "Lowercase letters, numbers, hyphens only";
      if (existingNames.has(value)) return `Package "${value}" already exists`;
    },
  })) as string;
  if (p.isCancel(name)) return process.exit(0);

  const pkgType = (await p.select({
    message: "Package type",
    options: PackageTypeSchema.options.map((t) => ({ value: t, label: t })),
  })) as Package["type"];
  if (p.isCancel(pkgType)) return process.exit(0);

  const producesCSS = ((await p.confirm({
    message: "Contains TSX with Tailwind classes?",
    initialValue: pkgType === "ui" || pkgType === "react-library",
  })) ?? false) as boolean;
  if (p.isCancel(producesCSS)) return process.exit(0);

  const exportsInput = (await p.text({
    message: "Export subpaths (comma-separated, or empty for single export)",
    placeholder: "./client, ./server, ./types",
    initialValue: ".",
  })) as string;
  if (p.isCancel(exportsInput)) return process.exit(0);

  const exports = exportsInput
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => (e.startsWith("./") || e === "." ? e : `./${e}`));

  const newPkg: Package = {
    name,
    type: pkgType,
    producesCSS,
    exports: exports.length > 0 ? exports : ["."],
  };

  const updatedPreset: Preset = {
    ...config,
    packages: [...config.packages, newPkg],
  };

  const result = ValidatedPresetSchema.safeParse(updatedPreset);
  if (!result.success) {
    p.log.error("Validation failed:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  exitIfPolicyViolated(result.data, userConfig?.policy);

  await applyDiff(cwd, config as Preset, result.data, { dryRun: options.dryRun });

  const scope = config.basics.scope;
  p.outro(`${pc.green("Done!")} Package ${pc.cyan(`${scope}/${name}`)} created.`);
}

async function addIntegration(userConfig?: UserConfig, options: { dryRun?: boolean } = {}) {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);

  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }

  p.intro(`${pc.bgCyan(pc.black(" add integration "))} to ${pc.cyan(config.basics.projectName)}`);

  const category = (await p.select({
    message: "Integration category",
    options: [
      {
        value: "analytics",
        label: "Analytics",
        hint: `current: ${config.integrations.analytics}`,
      },
      {
        value: "errorTracking",
        label: "Error Tracking",
        hint: `current: ${config.integrations.errorTracking}`,
      },
      {
        value: "email",
        label: "Email",
        hint: `current: ${config.integrations.email}`,
      },
      {
        value: "rateLimit",
        label: "Rate Limiting",
        hint: `current: ${config.integrations.rateLimit}`,
      },
      { value: "ai", label: "AI", hint: `current: ${config.integrations.ai}` },
    ],
  })) as string;
  if (p.isCancel(category)) return process.exit(0);

  type IntegrationValue = string;
  let value: IntegrationValue;
  const policy = userConfig?.policy;

  // Policy filter applied per category
  const filterFor = (
    schemaOptions: readonly string[],
    cat: Parameters<typeof filterOptions>[2],
  ) => {
    const allowed = filterOptions(schemaOptions, policy, cat);
    return allowed.length > 0 ? allowed : [...schemaOptions];
  };

  switch (category) {
    case "analytics": {
      value = (await p.select({
        message: "Analytics provider",
        options: filterFor(AnalyticsSchema.options, "analytics").map((v) => ({
          value: v,
          label: v,
        })),
        initialValue: config.integrations.analytics,
      })) as string;
      break;
    }
    case "errorTracking": {
      value = (await p.select({
        message: "Error tracking provider",
        options: filterFor(ErrorTrackingSchema.options, "errorTracking").map((v) => ({
          value: v,
          label: v,
        })),
        initialValue: config.integrations.errorTracking,
      })) as string;
      break;
    }
    case "email": {
      value = (await p.select({
        message: "Email provider",
        options: filterFor(EmailSchema.options, "email").map((v) => ({
          value: v,
          label: v,
        })),
        initialValue: config.integrations.email,
      })) as string;
      break;
    }
    case "rateLimit": {
      value = (await p.select({
        message: "Rate limiting provider",
        options: filterFor(RateLimitSchema.options, "rateLimit").map((v) => ({
          value: v,
          label: v,
        })),
        initialValue: config.integrations.rateLimit,
      })) as string;
      break;
    }
    case "ai": {
      value = (await p.select({
        message: "AI provider",
        options: filterFor(AiSchema.options, "ai").map((v) => ({
          value: v,
          label: v,
        })),
        initialValue: config.integrations.ai,
      })) as string;
      break;
    }
    default:
      return;
  }

  if (p.isCancel(value)) return process.exit(0);

  const updatedPreset: Preset = {
    ...config,
    integrations: {
      ...config.integrations,
      [category]: value,
    },
  };

  const result = ValidatedPresetSchema.safeParse(updatedPreset);
  if (!result.success) {
    p.log.error("Validation failed:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  exitIfPolicyViolated(result.data, userConfig?.policy);

  await applyDiff(cwd, config as Preset, result.data, { dryRun: options.dryRun });

  p.outro(`${pc.green("Done!")} Integration ${pc.cyan(category)} set to ${pc.cyan(value)}.`);
}
