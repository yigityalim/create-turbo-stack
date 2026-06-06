import * as p from "@clack/prompts";
import { resolveAutoPackages, SUPPORTED_APP_TYPES } from "@create-turbo-stack/core";
import type {
  App,
  Package,
  Preset,
  TurboStackConfig,
  UserConfig,
} from "@create-turbo-stack/schema";
import {
  INTEGRATION_OPTION_CATEGORIES,
  INTEGRATION_PROVIDER_VALUES,
  integrationPackageName,
  PackageTypeSchema,
  ValidatedPresetSchema,
} from "@create-turbo-stack/schema";
import pc from "picocolors";
import { applyDiff, resolveOnConflict } from "../io/apply-diff";
import { filterOptions, validatePresetAgainstPolicy } from "../io/policy";
import { readProjectConfig } from "../io/reader";
import { addDependencyCommand } from "./add-dependency";
import { addRegistryCommand } from "./add-registry";

interface AddOptions {
  dryRun?: boolean;
  to?: string;
  dev?: boolean;
  version?: string;
  registry?: string;
  app?: string;
  yes?: boolean;
  // Non-interactive inputs for add app / package / integration.
  type?: string;
  port?: string;
  i18n?: boolean;
  consumes?: string;
  css?: boolean;
  exports?: string;
  value?: string;
}

export async function addCommand(
  type: string,
  userConfig?: UserConfig,
  options: AddOptions = {},
  extra?: string,
) {
  switch (type) {
    case "app":
      return addApp(userConfig, options, extra);
    case "package":
      return addPackage(userConfig, options, extra);
    case "integration":
      return addIntegration(userConfig, options, extra);
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
      // Not a reserved keyword → treat as a registry package name
      // (shadcn-style `cts add <name>`).
      return addRegistryCommand(type, {
        registry: options.registry,
        registries: userConfig?.registries,
        dryRun: options.dryRun,
        yes: options.yes,
        app: options.app,
      });
  }
}

function exitIfPolicyViolated(preset: Preset, policy: UserConfig["policy"] | undefined): void {
  const violations = validatePresetAgainstPolicy(preset, policy);
  if (violations.length === 0) return;
  p.log.error("This change violates the project policy:");
  for (const v of violations) p.log.error(`  ${v}`);
  process.exit(1);
}

/** Pretty labels for the integration category picker (presentation only;
 *  unknown categories fall back to a humanized id, so a new category needs no
 *  edit here). */
const CATEGORY_LABELS: Record<string, string> = {
  analytics: "Analytics",
  errorTracking: "Error Tracking",
  email: "Email",
  rateLimit: "Rate Limiting",
  ai: "AI",
};
export const categoryLabel = (c: string): string =>
  CATEGORY_LABELS[c] ??
  c.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, (m) => m.toUpperCase());

/** Add `pkg` to the `consumes` of the named apps (skips apps already consuming it). */
export function wireConsumes(apps: App[], pkg: string, appNames: ReadonlySet<string>): App[] {
  return apps.map((a) =>
    appNames.has(a.name) && !a.consumes.includes(pkg)
      ? { ...a, consumes: [...a.consumes, pkg] }
      : a,
  );
}

/**
 * Which apps should consume a newly-added package/integration — answering A1
 * ("which apps get it?"). `--app` targets one (validated); interactive offers a
 * multi-select; non-interactive falls back (`all` for integrations so they're
 * actually used, `none` for a bare package).
 */
async function pickConsumerApps(
  config: TurboStackConfig,
  options: AddOptions,
  interactive: boolean,
  fallback: "all" | "none",
): Promise<string[]> {
  const appNames = config.apps.map((a) => a.name);
  if (options.app) {
    if (!appNames.includes(options.app)) {
      p.log.error(`Unknown app "${options.app}". Known apps: ${appNames.join(", ") || "(none)"}.`);
      process.exit(1);
    }
    return [options.app];
  }
  if (!interactive) return fallback === "all" ? appNames : [];
  if (appNames.length === 0) return [];
  const picked = await p.multiselect({
    message: "Which apps should use it?",
    options: appNames.map((n) => ({ value: n, label: `apps/${n}` })),
    required: false,
    initialValues: fallback === "all" ? appNames : [],
  });
  if (p.isCancel(picked)) return process.exit(0);
  return picked as string[];
}

async function addApp(userConfig?: UserConfig, options: AddOptions = {}, name?: string) {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);

  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }

  const existingNames = new Set(config.apps.map((a) => a.name));
  const allowedTypes = filterOptions(SUPPORTED_APP_TYPES, userConfig?.policy, "appType");
  if (allowedTypes.length === 0) {
    p.log.error("Project policy forbids every supported app type — nothing to add.");
    process.exit(1);
  }
  const DEFAULT_START_PORT = 3000;
  const maxPort =
    config.apps.length > 0 ? Math.max(...config.apps.map((a) => a.port)) : DEFAULT_START_PORT - 1;

  // Non-interactive: positional name provided → build from flags + defaults.
  if (name) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      p.log.error("App name must be lowercase letters, numbers, hyphens.");
      process.exit(1);
    }
    if (existingNames.has(name)) {
      p.log.error(`App "${name}" already exists.`);
      process.exit(1);
    }
    const appType = (options.type ?? "nextjs") as App["type"];
    if (!allowedTypes.includes(appType)) {
      p.log.error(`App type "${appType}" not allowed. One of: ${allowedTypes.join(", ")}.`);
      process.exit(1);
    }
    const port = options.port ? Number(options.port) : maxPort + 1;
    if (
      Number.isNaN(port) ||
      port < 1024 ||
      port > 65535 ||
      config.apps.some((a) => a.port === port)
    ) {
      p.log.error(`Invalid or already-used port: ${options.port ?? port}.`);
      process.exit(1);
    }
    const consumes = options.consumes
      ? options.consumes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    p.intro(`${pc.bgCyan(pc.black(" add app "))} to ${pc.cyan(config.basics.projectName)}`);
    return finalizeApp(
      cwd,
      config,
      {
        name,
        type: appType,
        location: "apps",
        port,
        i18n: !!options.i18n,
        consumes,
      },
      userConfig,
      options,
    );
  }

  p.intro(`${pc.bgCyan(pc.black(" add app "))} to ${pc.cyan(config.basics.projectName)}`);

  const appName = (await p.text({
    message: "App name",
    placeholder: "admin",
    validate(value) {
      if (!value) return "Name is required";
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "Lowercase letters, numbers, hyphens only";
      if (existingNames.has(value)) return `App "${value}" already exists`;
    },
  })) as string;
  if (p.isCancel(appName)) return process.exit(0);

  const appType = (await p.select({
    message: "App type",
    options: allowedTypes.map((t) => ({ value: t, label: t })),
  })) as App["type"];
  if (p.isCancel(appType)) return process.exit(0);

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
  if (["nextjs", "sveltekit", "astro"].includes(appType)) {
    i18n = ((await p.confirm({
      message: "Enable i18n?",
      initialValue: false,
    })) ?? false) as boolean;
    if (p.isCancel(i18n)) return process.exit(0);
  }

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

  return finalizeApp(
    cwd,
    config,
    {
      name: appName,
      type: appType,
      location: "apps",
      port: Number(port),
      i18n,
      consumes,
    },
    userConfig,
    options,
  );
}

/** Shared tail for `add app`: validate the new preset, check policy, apply. */
async function finalizeApp(
  cwd: string,
  config: TurboStackConfig,
  newApp: App,
  userConfig: UserConfig | undefined,
  options: AddOptions,
): Promise<void> {
  const updatedPreset: Preset = { ...config, apps: [...config.apps, newApp] };

  const result = ValidatedPresetSchema.safeParse(updatedPreset);
  if (!result.success) {
    p.log.error("Validation failed:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  exitIfPolicyViolated(result.data, userConfig?.policy);

  await applyDiff(cwd, config as Preset, result.data, {
    dryRun: options.dryRun,
    onConflict: resolveOnConflict(config, userConfig),
  });

  p.outro(`${pc.green("Done!")} App ${pc.cyan(newApp.name)} added.`);
}

async function addPackage(userConfig?: UserConfig, options: AddOptions = {}, name?: string) {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);

  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }

  const existingNames = new Set(config.packages.map((p) => p.name));
  const parseExports = (input: string): string[] =>
    input
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .map((e) => (e.startsWith("./") || e === "." ? e : `./${e}`));

  // Non-interactive: positional name provided → build from flags + defaults.
  if (name) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      p.log.error("Package name must be lowercase letters, numbers, hyphens.");
      process.exit(1);
    }
    if (existingNames.has(name)) {
      p.log.error(`Package "${name}" already exists.`);
      process.exit(1);
    }
    const pkgType = (options.type ?? "library") as Package["type"];
    if (!PackageTypeSchema.options.includes(pkgType)) {
      p.log.error(`Package type "${pkgType}". One of: ${PackageTypeSchema.options.join(", ")}.`);
      process.exit(1);
    }
    const exports = options.exports ? parseExports(options.exports) : ["."];
    p.intro(`${pc.bgCyan(pc.black(" add package "))} to ${pc.cyan(config.basics.projectName)}`);
    const targetApps = await pickConsumerApps(config, options, false, "none");
    return finalizePackage(
      cwd,
      config,
      {
        name,
        type: pkgType,
        location: "packages",
        producesCSS: options.css ?? (pkgType === "ui" || pkgType === "react-library"),
        exports: exports.length > 0 ? exports : ["."],
      },
      targetApps,
      userConfig,
      options,
    );
  }

  p.intro(`${pc.bgCyan(pc.black(" add package "))} to ${pc.cyan(config.basics.projectName)}`);

  const pkgName = (await p.text({
    message: "Package name",
    placeholder: "billing",
    validate(value) {
      if (!value) return "Name is required";
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "Lowercase letters, numbers, hyphens only";
      if (existingNames.has(value)) return `Package "${value}" already exists`;
    },
  })) as string;
  if (p.isCancel(pkgName)) return process.exit(0);

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

  const exports = parseExports(exportsInput);
  const targetApps = await pickConsumerApps(config, options, true, "none");

  return finalizePackage(
    cwd,
    config,
    {
      name: pkgName,
      type: pkgType,
      location: "packages",
      producesCSS,
      exports: exports.length > 0 ? exports : ["."],
    },
    targetApps,
    userConfig,
    options,
  );
}

/**
 * Shared tail for `add package`: append the package, wire it into the target
 * apps' `consumes` (P3 incremental refs), validate, check policy, apply.
 */
async function finalizePackage(
  cwd: string,
  config: TurboStackConfig,
  newPkg: Package,
  targetApps: string[],
  userConfig: UserConfig | undefined,
  options: AddOptions,
): Promise<void> {
  const apps = wireConsumes(config.apps, newPkg.name, new Set(targetApps));
  const updatedPreset: Preset = { ...config, apps, packages: [...config.packages, newPkg] };

  const result = ValidatedPresetSchema.safeParse(updatedPreset);
  if (!result.success) {
    p.log.error("Validation failed:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  exitIfPolicyViolated(result.data, userConfig?.policy);

  await applyDiff(cwd, config as Preset, result.data, {
    dryRun: options.dryRun,
    onConflict: resolveOnConflict(config, userConfig),
  });

  const wired = config.apps
    .filter((a, i) => apps[i].consumes.length !== a.consumes.length)
    .map((a) => a.name);
  const suffix = wired.length > 0 ? ` — consumed by ${wired.join(", ")}` : "";
  p.outro(
    `${pc.green("Done!")} Package ${pc.cyan(`${config.basics.scope}/${newPkg.name}`)} created${suffix}.`,
  );
}

async function addIntegration(userConfig?: UserConfig, options: AddOptions = {}, name?: string) {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);

  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }

  // Non-interactive: `add integration <category> --value <provider>`.
  if (name) {
    const opts = INTEGRATION_PROVIDER_VALUES[name as keyof typeof INTEGRATION_PROVIDER_VALUES] as
      | readonly string[]
      | undefined;
    if (!opts) {
      p.log.error(
        `Unknown integration category "${name}". One of: ${Object.keys(INTEGRATION_PROVIDER_VALUES).join(", ")}.`,
      );
      process.exit(1);
    }
    if (!options.value || !opts.includes(options.value)) {
      p.log.error(`--value for ${name} must be one of: ${opts.join(", ")}.`);
      process.exit(1);
    }
    p.intro(`${pc.bgCyan(pc.black(" add integration "))} to ${pc.cyan(config.basics.projectName)}`);
    const targetApps = await pickConsumerApps(config, options, false, "all");
    return finalizeIntegration(cwd, config, name, options.value, targetApps, userConfig, options);
  }

  p.intro(`${pc.bgCyan(pc.black(" add integration "))} to ${pc.cyan(config.basics.projectName)}`);

  const category = (await p.select({
    message: "Integration category",
    options: INTEGRATION_OPTION_CATEGORIES.map((c) => ({
      value: c,
      label: categoryLabel(c),
      hint: `current: ${config.integrations[c]}`,
    })),
  })) as string;
  if (p.isCancel(category)) return process.exit(0);

  const policy = userConfig?.policy;

  // Provider options are derived from the schema's per-category enum, then
  // policy-filtered. A new category/provider flows through with no switch.
  const providerValues =
    INTEGRATION_PROVIDER_VALUES[category as keyof typeof INTEGRATION_PROVIDER_VALUES];
  if (!providerValues) return;
  const allowed = filterOptions(
    [...providerValues],
    policy,
    category as Parameters<typeof filterOptions>[2],
  );
  const optionValues = allowed.length > 0 ? allowed : [...providerValues];

  const value = (await p.select({
    message: `${categoryLabel(category)} provider`,
    options: optionValues.map((v) => ({ value: v, label: v })),
    initialValue: config.integrations[category as keyof typeof config.integrations] as string,
  })) as string;
  if (p.isCancel(value)) return process.exit(0);

  const targetApps = await pickConsumerApps(config, options, true, "all");
  return finalizeIntegration(cwd, config, category, value, targetApps, userConfig, options);
}

/**
 * Shared tail for `add integration`: set the category, wire its package into the
 * target apps' `consumes` (A1), validate, apply. Idempotent (P3): if the value
 * is unchanged and every target app already consumes it, there's nothing to do.
 */
async function finalizeIntegration(
  cwd: string,
  config: TurboStackConfig,
  category: string,
  value: string,
  targetApps: string[],
  userConfig: UserConfig | undefined,
  options: AddOptions,
): Promise<void> {
  const pkg = integrationPackageName(category);
  const valueChanged = (config.integrations as Record<string, unknown>)[category] !== value;
  const apps =
    pkg && value !== "none" ? wireConsumes(config.apps, pkg, new Set(targetApps)) : config.apps;
  const consumesChanged = apps.some((a, i) => a.consumes.length !== config.apps[i].consumes.length);

  if (!valueChanged && !consumesChanged) {
    p.outro(`${pc.dim("No change —")} ${category} is already ${pc.cyan(value)}.`);
    return;
  }

  const updatedPreset: Preset = {
    ...config,
    apps,
    integrations: { ...config.integrations, [category]: value },
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

  await applyDiff(cwd, config as Preset, result.data, {
    dryRun: options.dryRun,
    onConflict: resolveOnConflict(config, userConfig),
  });

  const wired = config.apps
    .filter((a, i) => apps[i].consumes.length !== a.consumes.length)
    .map((a) => a.name);
  const suffix = wired.length > 0 ? ` — consumed by ${wired.join(", ")}` : "";
  p.outro(
    `${pc.green("Done!")} Integration ${pc.cyan(category)} set to ${pc.cyan(value)}${suffix}.`,
  );
}
