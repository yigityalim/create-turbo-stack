import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import {
  applyMutations,
  computeCatalog,
  computeCssSourceMap,
  diffTree,
  resolveAutoPackages,
  resolveFileTree,
} from "@create-turbo-stack/core";
import type { App, Package, Preset, TurboStackConfig } from "@create-turbo-stack/schema";
import {
  AiSchema,
  AnalyticsSchema,
  AppTypeSchema,
  CmsSchema,
  EmailSchema,
  ErrorTrackingSchema,
  PackageTypeSchema,
  RateLimitSchema,
  ValidatedPresetSchema,
} from "@create-turbo-stack/schema";
import pc from "picocolors";
import { readExistingFiles, readProjectConfig, writeProjectConfig } from "../io/reader";
import { writeFiles } from "../io/writer";

export async function addCommand(type: string) {
  switch (type) {
    case "app":
      return addApp();
    case "package":
      return addPackage();
    case "integration":
      return addIntegration();
    default:
      p.log.error(
        `Unknown add type: ${pc.cyan(type)}. Use ${pc.cyan("app")}, ${pc.cyan("package")}, or ${pc.cyan("integration")}.`,
      );
      process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Add App
// ---------------------------------------------------------------------------

async function addApp() {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);

  if (!config) {
    p.log.error("No .turbo-stack.json found. Are you in a create-turbo-stack project?");
    process.exit(1);
  }

  p.intro(`${pc.bgCyan(pc.black(" add app "))} to ${pc.cyan(config.basics.projectName)}`);

  // Existing app names for validation
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

  const appType = (await p.select({
    message: "App type",
    options: AppTypeSchema.options.map((t) => ({ value: t, label: t })),
  })) as App["type"];
  if (p.isCancel(appType)) return process.exit(0);

  // Auto-increment port (start from 3000 if no apps exist)
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
    i18n = ((await p.confirm({ message: "Enable i18n?", initialValue: false })) ??
      false) as boolean;
    if (p.isCancel(i18n)) return process.exit(0);
  }

  let cms: App["cms"] = "none";
  if (appType === "nextjs") {
    cms = (await p.select({
      message: "CMS",
      options: CmsSchema.options.map((c) => ({ value: c, label: c })),
      initialValue: "none",
    })) as App["cms"];
    if (p.isCancel(cms)) return process.exit(0);
  }

  // Available packages to consume
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

  // Update preset
  const updatedPreset: Preset = {
    ...config,
    apps: [...config.apps, newApp],
  };

  // Validate
  const result = ValidatedPresetSchema.safeParse(updatedPreset);
  if (!result.success) {
    p.log.error("Validation failed:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  // Apply diff
  await applyDiff(cwd, config as Preset, result.data);

  p.outro(`${pc.green("Done!")} App ${pc.cyan(name)} added.`);
}

// ---------------------------------------------------------------------------
// Add Package
// ---------------------------------------------------------------------------

async function addPackage() {
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

  // Update preset
  const updatedPreset: Preset = {
    ...config,
    packages: [...config.packages, newPkg],
  };

  // Validate
  const result = ValidatedPresetSchema.safeParse(updatedPreset);
  if (!result.success) {
    p.log.error("Validation failed:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  // Apply diff
  await applyDiff(cwd, config as Preset, result.data);

  const scope = config.basics.scope;
  p.outro(`${pc.green("Done!")} Package ${pc.cyan(`${scope}/${name}`)} created.`);
}

// ---------------------------------------------------------------------------
// Add Integration
// ---------------------------------------------------------------------------

async function addIntegration() {
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
      { value: "analytics", label: "Analytics", hint: `current: ${config.integrations.analytics}` },
      {
        value: "errorTracking",
        label: "Error Tracking",
        hint: `current: ${config.integrations.errorTracking}`,
      },
      { value: "email", label: "Email", hint: `current: ${config.integrations.email}` },
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

  switch (category) {
    case "analytics": {
      value = (await p.select({
        message: "Analytics provider",
        options: AnalyticsSchema.options.map((v) => ({ value: v, label: v })),
        initialValue: config.integrations.analytics,
      })) as string;
      break;
    }
    case "errorTracking": {
      value = (await p.select({
        message: "Error tracking provider",
        options: ErrorTrackingSchema.options.map((v) => ({ value: v, label: v })),
        initialValue: config.integrations.errorTracking,
      })) as string;
      break;
    }
    case "email": {
      value = (await p.select({
        message: "Email provider",
        options: EmailSchema.options.map((v) => ({ value: v, label: v })),
        initialValue: config.integrations.email,
      })) as string;
      break;
    }
    case "rateLimit": {
      value = (await p.select({
        message: "Rate limiting provider",
        options: RateLimitSchema.options.map((v) => ({ value: v, label: v })),
        initialValue: config.integrations.rateLimit,
      })) as string;
      break;
    }
    case "ai": {
      value = (await p.select({
        message: "AI provider",
        options: AiSchema.options.map((v) => ({ value: v, label: v })),
        initialValue: config.integrations.ai,
      })) as string;
      break;
    }
    default:
      return;
  }

  if (p.isCancel(value)) return process.exit(0);

  // Update preset
  const updatedPreset: Preset = {
    ...config,
    integrations: {
      ...config.integrations,
      [category]: value,
    },
  };

  // Validate
  const result = ValidatedPresetSchema.safeParse(updatedPreset);
  if (!result.success) {
    p.log.error("Validation failed:");
    for (const issue of result.error.issues) {
      p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  // Apply diff
  await applyDiff(cwd, config as Preset, result.data);

  p.outro(`${pc.green("Done!")} Integration ${pc.cyan(category)} set to ${pc.cyan(value)}.`);
}

// ---------------------------------------------------------------------------
// Diff & Apply
// ---------------------------------------------------------------------------

async function applyDiff(cwd: string, _oldPreset: Preset, newPreset: Preset) {
  const s = p.spinner();

  // Generate old and new trees
  s.start("Computing changes");
  const newTree = resolveFileTree(newPreset);

  // Read existing files that might be affected
  const existingPaths = newTree.nodes.filter((n) => !n.isDirectory).map((n) => n.path);
  const existingFiles = await readExistingFiles(cwd, existingPaths);

  // Compute diff
  const diff = diffTree(existingFiles, newTree.nodes);
  s.stop(
    `${pc.cyan(String(diff.create.length))} new, ${pc.yellow(String(diff.update.length))} updated, ${pc.dim(String(diff.unchanged.length))} unchanged`,
  );

  if (diff.create.length === 0 && diff.update.length === 0) {
    p.log.info("No changes needed.");
    return;
  }

  // Write new files
  if (diff.create.length > 0) {
    s.start("Creating new files");
    await writeFiles(cwd, diff.create);
    s.stop(`Created ${diff.create.length} files`);

    for (const node of diff.create) {
      p.log.info(`  ${pc.green("+")} ${node.path}`);
    }
  }

  // Apply mutations to existing files
  if (diff.update.length > 0) {
    s.start("Updating existing files");
    for (const update of diff.update) {
      const existing = existingFiles.get(update.path) ?? "";
      const updated = applyMutations(existing, update.mutations);
      const fullPath = path.join(cwd, update.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, updated, "utf-8");
    }
    s.stop(`Updated ${diff.update.length} files`);

    for (const update of diff.update) {
      p.log.info(`  ${pc.yellow("~")} ${update.path}`);
    }
  }

  // Update .turbo-stack.json
  s.start("Updating .turbo-stack.json");
  const catalogEntries = computeCatalog(newPreset);
  const catalogObj: Record<string, string> = {};
  for (const entry of catalogEntries) {
    catalogObj[entry.name] = entry.version;
  }

  const newConfig: TurboStackConfig = {
    ...newPreset,
    generatedAt: new Date().toISOString(),
    cliVersion: "1.0.0",
    catalog: catalogObj,
    cssSourceMap: computeCssSourceMap(newPreset),
    autoPackages: resolveAutoPackages(newPreset).map((p) => p.name),
  };
  await writeProjectConfig(cwd, newConfig);
  s.stop("Config updated");
}
