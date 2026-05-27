import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import { resolveAutoPackages, resolveFileTree } from "@create-turbo-stack/core";
import type { Preset } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { readExistingFiles, readProjectConfig } from "../io/reader";

interface ReconcileOptions {
  json?: boolean;
}

interface Drift {
  packagesMissing: string[]; // in `.turbo-stack.json`, dir gone from disk
  packagesUntracked: string[]; // dir on disk, not in state
  appsMissing: string[];
  appsUntracked: string[];
  filesMissing: string[]; // expected by the resolved tree, absent on disk
  inSync: boolean;
}

/**
 * `reconcile` — report how the project on disk diverges from what
 * `.turbo-stack.json` says it should be. Read-only: it never writes. Drift
 * happens via manual edits, deletions, failed applies, or external tooling;
 * once drifted, `add` / `remove` / `switch` diff against stale state. This is
 * `git status` for the scaffold↔state relationship.
 */
export async function reconcileCommand(options: ReconcileOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd);
  if (!config) {
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ error: "No .turbo-stack.json found" }, null, 2)}\n`);
    } else {
      p.log.error("No .turbo-stack.json found.");
    }
    process.exit(1);
  }

  const drift = await computeDrift(cwd, config as Preset);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(drift, null, 2)}\n`);
    return;
  }

  p.intro(`${pc.bgCyan(pc.black(" reconcile "))} ${pc.cyan(config.basics.projectName)}`);

  if (drift.inSync) {
    p.log.success("In sync — disk matches .turbo-stack.json.");
    p.outro("");
    return;
  }

  report("Packages in state but missing on disk", drift.packagesMissing, pc.red);
  report("Packages on disk but not in state", drift.packagesUntracked, pc.yellow);
  report("Apps in state but missing on disk", drift.appsMissing, pc.red);
  report("Apps on disk but not in state", drift.appsUntracked, pc.yellow);
  if (drift.filesMissing.length > 0) {
    const shown = drift.filesMissing.slice(0, 10);
    p.log.warn(
      `${drift.filesMissing.length} expected file(s) missing on disk:\n` +
        shown.map((f) => `  ${pc.red("-")} ${f}`).join("\n") +
        (drift.filesMissing.length > shown.length
          ? `\n  ${pc.dim(`…and ${drift.filesMissing.length - shown.length} more`)}`
          : ""),
    );
  }

  p.outro(
    pc.dim(
      "Read-only. Resolve by re-running the relevant command, restoring files, or editing .turbo-stack.json.",
    ),
  );
}

function report(label: string, items: string[], color: (s: string) => string): void {
  if (items.length === 0) return;
  p.log.warn(`${label}:\n${items.map((i) => `  ${color("•")} ${i}`).join("\n")}`);
}

async function computeDrift(cwd: string, preset: Preset): Promise<Drift> {
  // Expected workspace members: user packages + auto packages + apps.
  const expectedPackages = new Set([
    ...preset.packages.map((pkg) => pkg.name),
    ...resolveAutoPackages(preset).map((pkg) => pkg.name),
  ]);
  const expectedApps = new Set(preset.apps.map((a) => a.name));

  const diskPackages = new Set(await listDirs(path.join(cwd, "packages")));
  const diskApps = new Set(await listDirs(path.join(cwd, "apps")));

  const missing = (expected: Set<string>, disk: Set<string>) =>
    [...expected].filter((n) => !disk.has(n)).sort();
  const untracked = (expected: Set<string>, disk: Set<string>) =>
    [...disk].filter((n) => !expected.has(n)).sort();

  // File-level: which files the resolved tree expects are absent on disk.
  const tree = resolveFileTree(preset);
  const expectedFiles = tree.nodes.filter((n) => !n.isDirectory).map((n) => n.path);
  const present = await readExistingFiles(cwd, expectedFiles);
  const filesMissing = expectedFiles.filter((f) => !present.has(f)).sort();

  const packagesMissing = missing(expectedPackages, diskPackages);
  const packagesUntracked = untracked(expectedPackages, diskPackages);
  const appsMissing = missing(expectedApps, diskApps);
  const appsUntracked = untracked(expectedApps, diskApps);

  return {
    packagesMissing,
    packagesUntracked,
    appsMissing,
    appsUntracked,
    filesMissing,
    inSync:
      packagesMissing.length === 0 &&
      packagesUntracked.length === 0 &&
      appsMissing.length === 0 &&
      appsUntracked.length === 0 &&
      filesMissing.length === 0,
  };
}

async function listDirs(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}
