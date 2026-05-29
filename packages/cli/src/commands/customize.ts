/**
 * `cts customize [package]` — edit a package's override (deps, scripts,
 * extra files) without opening the web builder. Interactive picker by
 * default; one-shot flags for scripting:
 *
 *   cts customize env --add-dep zod@^4.0.0
 *   cts customize cache --add-script "bench=vitest bench"
 *   cts customize billing --add-file README.md
 *
 * Writes `.turbo-stack.json`'s `packageOverrides[<name>]` in place — the
 * config file extends the Preset schema flatly, so override slots live at
 * the top level (not under a nested `preset` key). Schema validates the
 * result so a typo can't leave the project broken.
 *
 * Auto-packages (db, env, cache, …) and user packages share the same
 * surface — the engine merges the override on top either way.
 */

import * as p from "@clack/prompts";
import {
  autoPackageNames,
  type PackageOverride,
  PackageOverrideSchema,
} from "@create-turbo-stack/schema";
import pc from "picocolors";
import { readProjectConfig, writeProjectConfig } from "../io/reader";

type Options = {
  addDep?: string[];
  addDevDep?: string[];
  addScript?: string[];
  addFile?: string[];
  removeDep?: string[];
  removeScript?: string[];
  removeFile?: string[];
  list?: boolean;
};

export async function customizeCommand(packageName: string | undefined, options: Options) {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);
  if (!config) {
    p.log.error("No .turbo-stack.json in the current directory.");
    process.exit(1);
  }

  // All known packages — user-declared + engine-generated. Same surface
  // for both since `packageOverrides` is the additive layer for either.
  // `TurboStackConfig` extends Preset flatly, so `packages` and
  // `packageOverrides` are at the top level (no `preset.` indirection).
  const allNames = [...config.packages.map((pk) => pk.name), ...autoPackageNames(config)];

  // Picker if not specified.
  let name = packageName;
  if (!name) {
    const picked = await p.select({
      message: "Customize which package?",
      options: allNames.sort().map((n) => ({
        value: n,
        label: config.packages.some((u) => u.name === n) ? n : `${n} ${pc.dim("(auto)")}`,
      })),
    });
    if (p.isCancel(picked)) process.exit(0);
    name = picked as string;
  }
  if (!allNames.includes(name)) {
    p.log.error(`No package "${name}" in this project. Known: ${allNames.join(", ")}.`);
    process.exit(1);
  }

  const overrides: Record<string, PackageOverride> = {
    ...(config.packageOverrides ?? {}),
  };
  const current: PackageOverride = { ...(overrides[name] ?? {}) };

  // --list — read-only summary, no prompts.
  if (options.list) {
    p.note(formatOverride(name, current), `${name} override`);
    return;
  }

  // Apply one-shot flags first so scripting works.
  for (const spec of options.addDep ?? []) {
    const { key, value } = splitKV(spec, "addDep");
    current.dependencies = { ...(current.dependencies ?? {}), [key]: value };
  }
  for (const spec of options.addDevDep ?? []) {
    const { key, value } = splitKV(spec, "addDevDep");
    current.devDependencies = {
      ...(current.devDependencies ?? {}),
      [key]: value,
    };
  }
  for (const spec of options.addScript ?? []) {
    const { key, value } = splitKV(spec, "addScript");
    current.scripts = { ...(current.scripts ?? {}), [key]: value };
  }
  for (const path of options.addFile ?? []) {
    const files = [...(current.extraFiles ?? [])];
    if (!files.some((f) => f.path === path)) {
      files.push({ path, content: "" });
    }
    current.extraFiles = files;
  }
  for (const key of options.removeDep ?? []) {
    if (current.dependencies) delete current.dependencies[key];
    if (current.devDependencies) delete current.devDependencies[key];
  }
  for (const key of options.removeScript ?? []) {
    if (current.scripts) delete current.scripts[key];
  }
  for (const path of options.removeFile ?? []) {
    current.extraFiles = (current.extraFiles ?? []).filter((f) => f.path !== path);
  }

  // Interactive — only if no flags were passed.
  const ranNonInteractive =
    (options.addDep ?? []).length > 0 ||
    (options.addDevDep ?? []).length > 0 ||
    (options.addScript ?? []).length > 0 ||
    (options.addFile ?? []).length > 0 ||
    (options.removeDep ?? []).length > 0 ||
    (options.removeScript ?? []).length > 0 ||
    (options.removeFile ?? []).length > 0;
  if (!ranNonInteractive) {
    const action = await p.select({
      message: "What do you want to do?",
      options: [
        { value: "add-dep", label: "Add dependency" },
        { value: "add-dev-dep", label: "Add devDependency" },
        { value: "add-script", label: "Add script" },
        { value: "add-file", label: "Add file" },
        { value: "show", label: "Show current override" },
      ],
    });
    if (p.isCancel(action)) process.exit(0);

    if (action === "show") {
      p.note(formatOverride(name, current), `${name} override`);
      return;
    }
    if (action === "add-dep" || action === "add-dev-dep" || action === "add-script") {
      const k = await p.text({
        message: action === "add-script" ? "Script name (e.g. bench)" : "Package name (e.g. zod)",
      });
      if (p.isCancel(k)) process.exit(0);
      const v = await p.text({
        message:
          action === "add-script"
            ? "Command (e.g. vitest bench)"
            : "Version spec ('catalog:', 'workspace:*', '^4.0.0')",
      });
      if (p.isCancel(v)) process.exit(0);
      if (action === "add-dep") {
        current.dependencies = {
          ...(current.dependencies ?? {}),
          [k as string]: v as string,
        };
      } else if (action === "add-dev-dep") {
        current.devDependencies = {
          ...(current.devDependencies ?? {}),
          [k as string]: v as string,
        };
      } else {
        current.scripts = {
          ...(current.scripts ?? {}),
          [k as string]: v as string,
        };
      }
    } else if (action === "add-file") {
      const path = await p.text({
        message: "Path (relative to the package, e.g. README.md or bench/index.bench.ts)",
      });
      if (p.isCancel(path)) process.exit(0);
      const content = await p.text({
        message: "Initial content (leave blank for empty file)",
        defaultValue: "",
      });
      if (p.isCancel(content)) process.exit(0);
      current.extraFiles = [
        ...(current.extraFiles ?? []),
        { path: path as string, content: (content as string) ?? "" },
      ];
    }
  }

  // Normalize empty inner records so the on-disk shape stays minimal.
  if (current.dependencies && Object.keys(current.dependencies).length === 0)
    delete current.dependencies;
  if (current.devDependencies && Object.keys(current.devDependencies).length === 0)
    delete current.devDependencies;
  if (current.scripts && Object.keys(current.scripts).length === 0) delete current.scripts;
  if (current.extraFiles && current.extraFiles.length === 0) delete current.extraFiles;

  if (Object.keys(current).length === 0) {
    delete overrides[name];
  } else {
    overrides[name] = current;
  }

  // Validate the resulting override so a typo in `--add-dep` can't leave the
  // file in a state the engine refuses. We only validate the override slot we
  // just edited — the rest of the preset hasn't changed, and the broader
  // ValidatedPresetSchema would strip TurboStackConfig-only fields (catalog,
  // cssSourceMap, …) we want to preserve verbatim.
  if (overrides[name]) {
    const result = PackageOverrideSchema.safeParse(overrides[name]);
    if (!result.success) {
      p.log.error("The override would be invalid:");
      for (const issue of result.error.issues) {
        p.log.error(`  ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exit(1);
    }
    overrides[name] = result.data;
  }

  await writeProjectConfig(cwd, {
    ...config,
    packageOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
  });
  p.outro(pc.green(`Customized ${name}.`));
}

function splitKV(spec: string, flag: string): { key: string; value: string } {
  // Accept both `name=value` and `name@value`. Pick `@` first because npm
  // version specs are the common case (`zod@^4.0.0`); fall back to `=`.
  let key: string;
  let value: string;
  if (spec.includes("@") && !spec.startsWith("@")) {
    const at = spec.lastIndexOf("@");
    key = spec.slice(0, at);
    value = spec.slice(at + 1);
  } else if (spec.includes("=")) {
    const eq = spec.indexOf("=");
    key = spec.slice(0, eq);
    value = spec.slice(eq + 1);
  } else {
    p.log.error(`--${flag} expects 'name@version' or 'name=value', got: ${spec}`);
    process.exit(1);
  }
  return { key, value };
}

function formatOverride(name: string, ov: Record<string, unknown>): string {
  if (Object.keys(ov).length === 0) return `(no override yet for ${name})`;
  return JSON.stringify(ov, null, 2);
}
