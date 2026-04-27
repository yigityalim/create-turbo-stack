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
  UnsupportedAppTypeError,
} from "@create-turbo-stack/core";
import type { FileTree, Preset, TurboStackConfig } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { CLI_VERSION } from "../version";
import { LockHeldError, withLock } from "./lock";
import { readExistingFiles, writeProjectConfig } from "./reader";
import { writeFiles } from "./writer";

const STATE_FILE = ".turbo-stack.json";

/**
 * Per-file backup captured before any disk writes. On any failure during
 * the apply phase, we restore each entry to recreate the pre-apply state:
 *
 *   - existed=false  →  the file did not exist; rollback deletes it
 *   - existed=true   →  rollback writes `content` back
 */
interface FileBackup {
  path: string;
  existed: boolean;
  content: string | null;
}

export interface ApplyDiffOptions {
  /**
   * When true, compute and print the diff but write nothing to disk.
   * Useful for `--dry-run` previews and CI sanity checks.
   * Conflict prompts are skipped (we don't need to decide what to
   * overwrite if we're not writing).
   */
  dryRun?: boolean;
  /**
   * How to handle files the user has hand-edited since the last
   * scaffold (the diff engine's `conflict` bucket).
   *
   *   - "prompt"     (default) ask via @clack/prompts — interactive only
   *   - "skip"       keep the user's edits, never overwrite
   *   - "overwrite"  always replace with the new template
   *   - "abort"      stop and write nothing
   *
   * Non-interactive callers (MCP server, CI, tests) must set this.
   * Calling with "prompt" inside a stdio MCP server will deadlock.
   */
  onConflict?: "prompt" | "skip" | "overwrite" | "abort";
}

/**
 * Apply the difference between `oldPreset` and `newPreset` to disk.
 *
 * The whole apply phase is atomic from the user's perspective: every
 * write is preceded by a snapshot of what's currently there, and any
 * thrown error triggers a rollback that restores the original files
 * (including `.turbo-stack.json`). On rollback we also clean up any
 * directories created during the run.
 */
/**
 * Public entry point — wraps the apply with a cross-process file lock
 * so two CLI invocations against the same project can't race the
 * read-modify-write of `.turbo-stack.json`. The MCP server has its
 * own in-process mutex; this guards the multi-process case.
 *
 * Dry-run skips the lock — it doesn't write, so it can't race.
 */
export async function applyDiff(
  cwd: string,
  oldPreset: Preset,
  newPreset: Preset,
  options: ApplyDiffOptions = {},
): Promise<void> {
  if (options.dryRun) {
    return applyDiffInner(cwd, oldPreset, newPreset, options);
  }
  try {
    await withLock(cwd, () => applyDiffInner(cwd, oldPreset, newPreset, options));
  } catch (err) {
    if (err instanceof LockHeldError) {
      p.log.error(err.message);
      process.exit(1);
    }
    throw err;
  }
}

async function applyDiffInner(
  cwd: string,
  oldPreset: Preset,
  newPreset: Preset,
  options: ApplyDiffOptions = {},
): Promise<void> {
  const { dryRun = false, onConflict = "prompt" } = options;
  const s = p.spinner();

  s.start("Computing changes");
  let newTree: FileTree;
  let oldTree: FileTree;
  try {
    newTree = resolveFileTree(newPreset);
    oldTree = resolveFileTree(oldPreset);
  } catch (err) {
    s.stop("Generation failed");
    if (err instanceof UnsupportedAppTypeError) {
      p.log.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  const allPaths = new Set<string>();
  for (const n of newTree.nodes) if (!n.isDirectory) allPaths.add(n.path);
  for (const n of oldTree.nodes) if (!n.isDirectory) allPaths.add(n.path);
  const existingFiles = await readExistingFiles(cwd, Array.from(allPaths));

  const diff = diffTree(existingFiles, newTree.nodes, { previousNodes: oldTree.nodes });
  s.stop(
    `${pc.cyan(String(diff.create.length))} new, ` +
      `${pc.yellow(String(diff.update.length))} updated, ` +
      `${pc.magenta(String(diff.conflict.length))} conflict, ` +
      `${pc.red(String(diff.delete.length))} deleted, ` +
      `${pc.dim(String(diff.unchanged.length))} unchanged`,
  );

  // any prompts or writes. Conflict files are reported but not resolved.
  if (dryRun) {
    if (
      diff.create.length === 0 &&
      diff.update.length === 0 &&
      diff.delete.length === 0 &&
      diff.conflict.length === 0
    ) {
      p.log.info("(dry-run) no changes");
      return;
    }
    p.log.info(pc.bold("(dry-run) would apply:"));
    for (const node of diff.create) p.log.message(`  ${pc.green("+")} ${node.path}`);
    for (const u of diff.update) p.log.message(`  ${pc.yellow("~")} ${u.path}`);
    for (const c of diff.conflict)
      p.log.message(`  ${pc.magenta("?")} ${c.path} (manual edits — would prompt)`);
    for (const d of diff.delete) p.log.message(`  ${pc.red("-")} ${d}`);
    return;
  }

  let conflictsToApply: typeof diff.conflict = [];
  if (diff.conflict.length > 0) {
    p.log.warn(`${diff.conflict.length} file(s) have manual edits since the last scaffold:`);
    for (const c of diff.conflict) p.log.message(`  ${pc.magenta("?")} ${c.path}`);

    let choice: "skip" | "overwrite" | "abort";
    if (onConflict === "prompt") {
      const picked = (await p.select({
        message: "How should I handle these?",
        options: [
          { value: "skip", label: "Keep my edits (recommended)" },
          { value: "overwrite", label: "Overwrite with the new template" },
          { value: "abort", label: "Abort — make no changes" },
        ],
        initialValue: "skip",
      })) as "skip" | "overwrite" | "abort";
      if (p.isCancel(picked)) {
        p.log.info("Aborted. No files written.");
        return;
      }
      choice = picked;
    } else {
      choice = onConflict;
    }
    if (choice === "abort") {
      p.log.info("Aborted. No files written.");
      return;
    }
    if (choice === "overwrite") conflictsToApply = diff.conflict;
  }

  if (
    diff.create.length === 0 &&
    diff.update.length === 0 &&
    diff.delete.length === 0 &&
    conflictsToApply.length === 0
  ) {
    p.log.info("No changes needed.");
    return;
  }

  // ── Snapshot for rollback ────────────────────────────────────────────────
  const backups: FileBackup[] = [];
  for (const node of diff.create) {
    backups.push({ path: node.path, existed: false, content: null });
  }
  for (const u of [...diff.update, ...conflictsToApply]) {
    backups.push({ path: u.path, existed: true, content: existingFiles.get(u.path) ?? "" });
  }
  for (const relPath of diff.delete) {
    const before = existingFiles.get(relPath);
    if (before === undefined) continue; // already gone; nothing to back up
    backups.push({ path: relPath, existed: true, content: before });
  }
  const stateBackup = await fs
    .readFile(path.join(cwd, STATE_FILE), "utf-8")
    .catch(() => null as string | null);

  // ── Apply ────────────────────────────────────────────────────────────────
  try {
    if (diff.create.length > 0) {
      s.start("Creating new files");
      await writeFiles(cwd, diff.create);
      s.stop(`Created ${diff.create.length} files`);
      for (const node of diff.create) p.log.info(`  ${pc.green("+")} ${node.path}`);
    }

    const allUpdates = [...diff.update, ...conflictsToApply];
    if (allUpdates.length > 0) {
      s.start("Updating existing files");
      for (const u of allUpdates) {
        const existing = existingFiles.get(u.path) ?? "";
        const updated = applyMutations(existing, u.mutations);
        const fullPath = path.join(cwd, u.path);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, updated, "utf-8");
      }
      s.stop(`Updated ${allUpdates.length} files`);
      for (const u of diff.update) p.log.info(`  ${pc.yellow("~")} ${u.path}`);
      for (const u of conflictsToApply) p.log.info(`  ${pc.magenta("!")} ${u.path} (overwritten)`);
    }

    if (diff.delete.length > 0) {
      s.start("Removing stale files");
      for (const relPath of diff.delete) {
        const fullPath = path.join(cwd, relPath);
        await fs.rm(fullPath, { force: true });
      }
      const dirsToCheck = new Set(diff.delete.map((rel) => path.dirname(rel)));
      for (const dir of dirsToCheck) await pruneEmptyDirs(cwd, dir);
      s.stop(`Removed ${diff.delete.length} files`);
      for (const relPath of diff.delete) p.log.info(`  ${pc.red("-")} ${relPath}`);
    }

    s.start("Updating .turbo-stack.json");
    const catalogEntries = computeCatalog(newPreset);
    const catalogObj: Record<string, string> = {};
    for (const entry of catalogEntries) catalogObj[entry.name] = entry.version;

    const newConfig: TurboStackConfig = {
      ...newPreset,
      generatedAt: new Date().toISOString(),
      cliVersion: CLI_VERSION,
      catalog: catalogObj,
      cssSourceMap: computeCssSourceMap(newPreset),
      autoPackages: resolveAutoPackages(newPreset).map((pkg) => pkg.name),
    };
    await writeProjectConfig(cwd, newConfig);
    s.stop("Config updated");
  } catch (err) {
    s.stop("Apply failed — rolling back");
    await rollback(cwd, backups, stateBackup);
    p.log.error(
      `Failed to apply changes: ${(err as Error).message}\nRolled back to previous state.`,
    );
    process.exit(1);
  }
}

/**
 * Restore every backed-up file. Best-effort: each restore swallows its
 * own error so a single broken file doesn't strand the rest.
 *
 * Order: data files first, then `.turbo-stack.json`. The state file is
 * the last to be repaired so that, even on a flaky FS, we don't end up
 * with new state pointing at non-existent files.
 */
async function rollback(
  cwd: string,
  backups: FileBackup[],
  stateBackup: string | null,
): Promise<void> {
  for (const b of backups) {
    const full = path.join(cwd, b.path);
    try {
      if (b.existed && b.content !== null) {
        await fs.mkdir(path.dirname(full), { recursive: true });
        await fs.writeFile(full, b.content, "utf-8");
      } else {
        await fs.rm(full, { force: true });
      }
    } catch {
      // continue rolling back the rest
    }
  }
  // Prune any directories we created that are now empty after rollback.
  const newlyCreatedDirs = new Set(
    backups.filter((b) => !b.existed).map((b) => path.dirname(b.path)),
  );
  for (const dir of newlyCreatedDirs) await pruneEmptyDirs(cwd, dir);

  const stateFile = path.join(cwd, STATE_FILE);
  try {
    if (stateBackup !== null) {
      await fs.writeFile(stateFile, stateBackup, "utf-8");
    } else {
      await fs.rm(stateFile, { force: true });
    }
  } catch {
    // Last-ditch: nothing else to do.
  }
}

/**
 * Walk up from `relDir` removing it if empty. Stops at cwd or any
 * non-empty directory. Keeps `apps/` / `packages/` clean after removals.
 */
async function pruneEmptyDirs(cwd: string, relDir: string): Promise<void> {
  let current = relDir;
  while (current && current !== "." && current !== "/") {
    const fullPath = path.join(cwd, current);
    try {
      const entries = await fs.readdir(fullPath);
      if (entries.length > 0) return;
      await fs.rmdir(fullPath);
    } catch {
      return;
    }
    current = path.dirname(current);
  }
}
