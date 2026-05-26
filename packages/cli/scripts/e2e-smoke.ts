/**
 * End-to-end smoke harness.
 *
 * For each built-in preset: scaffold into a temp dir, install, type-check,
 * and build — the real `npx create-turbo-stack` path a user walks. Catches
 * the class of bug unit tests can't: missing catalog deps, broken template
 * output, unresolved imports, package-manager protocol mismatches.
 *
 * Run: `bun run e2e` (from repo root) or `bun packages/cli/scripts/e2e-smoke.ts`.
 * Slow (network install + Next build), so it's intentionally out of the
 * default `bun test` path. Exits non-zero if any preset fails any step.
 *
 * Filter to one preset: `bun run e2e minimal`.
 */

import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CLI_BIN = path.join(REPO_ROOT, "packages/cli/bin/create-turbo-stack.ts");

const PRESETS = ["minimal", "saas-starter", "api-only"] as const;

// Every linter must produce a project that installs and lints clean — the
// proof that biome/oxlint/eslint-prettier are real, not schema lies.
const LINTERS = ["biome", "oxlint", "eslint-prettier"] as const;

// App types not exercised by a built-in preset. Each is scaffolded as the
// only app in a minimal preset and proven to install, type-check, and build.
// nextjs / nextjs-api-only / hono-standalone are already covered by presets.
const APP_TYPES = ["vite-react"] as const;

interface StepResult {
  step: string;
  ok: boolean;
  ms: number;
  output?: string;
}

function run(cmd: string, cwd: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { ok: true, output };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, output: `${e.stdout ?? ""}\n${e.stderr ?? ""}\n${e.message ?? ""}` };
  }
}

function timed(label: string, fn: () => { ok: boolean; output: string }): StepResult {
  const start = Date.now();
  const { ok, output } = fn();
  return { step: label, ok, ms: Date.now() - start, output: ok ? undefined : output };
}

async function smokePreset(preset: string): Promise<StepResult[]> {
  const dir = mkdtempSync(path.join(tmpdir(), `cts-e2e-${preset}-`));
  const presetPath = path.join(REPO_ROOT, "presets", `${preset}.json`);
  const results: StepResult[] = [];

  try {
    results.push(
      timed("scaffold", () =>
        run(`bunx tsx ${CLI_BIN} app --preset ${presetPath} --no-install`, dir),
      ),
    );
    if (!results.at(-1)?.ok) return results;

    const appDir = path.join(dir, "app");
    results.push(timed("install", () => run("bun install", appDir)));
    if (!results.at(-1)?.ok) return results;

    results.push(timed("type-check", () => run("bun run type-check", appDir)));
    // No real secrets in CI; the generated env package honors this flag and
    // skips Zod validation at build time (the canonical t3-env pattern).
    results.push(timed("build", () => run("SKIP_ENV_VALIDATION=1 bun run build", appDir)));
    return results;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Scaffold the minimal preset with `linter` swapped in, then install and
 * lint. Proves the generated linter config is valid and the output passes
 * its own linter cleanly.
 */
async function smokeLinter(linter: string): Promise<StepResult[]> {
  const dir = mkdtempSync(path.join(tmpdir(), `cts-e2e-lint-${linter}-`));
  const results: StepResult[] = [];

  try {
    const minimal = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "presets", "minimal.json"), "utf-8"),
    );
    minimal.basics.linter = linter;
    const presetPath = path.join(dir, "preset.json");
    writeFileSync(presetPath, JSON.stringify(minimal));

    results.push(
      timed("scaffold", () =>
        run(`bunx tsx ${CLI_BIN} app --preset ${presetPath} --no-install`, dir),
      ),
    );
    if (!results.at(-1)?.ok) return results;

    const appDir = path.join(dir, "app");
    results.push(timed("install", () => run("bun install", appDir)));
    if (!results.at(-1)?.ok) return results;

    results.push(timed("lint", () => run("bun run lint", appDir)));
    return results;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Scaffold the minimal preset with its single app swapped to `appType`,
 * then install, type-check, and build — proves the app type's templates
 * and wiring produce a project that actually compiles.
 */
async function smokeAppType(appType: string): Promise<StepResult[]> {
  const dir = mkdtempSync(path.join(tmpdir(), `cts-e2e-app-${appType}-`));
  const results: StepResult[] = [];

  try {
    const minimal = JSON.parse(
      readFileSync(path.join(REPO_ROOT, "presets", "minimal.json"), "utf-8"),
    );
    minimal.apps = [{ name: "web", type: appType, port: 3000, i18n: false, consumes: ["ui"] }];
    const presetPath = path.join(dir, "preset.json");
    writeFileSync(presetPath, JSON.stringify(minimal));

    results.push(
      timed("scaffold", () =>
        run(`bunx tsx ${CLI_BIN} app --preset ${presetPath} --no-install`, dir),
      ),
    );
    if (!results.at(-1)?.ok) return results;

    const appDir = path.join(dir, "app");
    results.push(timed("install", () => run("bun install", appDir)));
    if (!results.at(-1)?.ok) return results;

    results.push(timed("type-check", () => run("bun run type-check", appDir)));
    results.push(timed("build", () => run("SKIP_ENV_VALIDATION=1 bun run build", appDir)));
    return results;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function report(label: string, results: StepResult[]): boolean {
  console.log(`\n=== ${label} ===`);
  let failed = false;
  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.step.padEnd(12)} ${(r.ms / 1000).toFixed(1)}s`);
    if (!r.ok) {
      failed = true;
      console.log(`\n--- ${label}:${r.step} output ---`);
      console.log((r.output ?? "").split("\n").slice(-40).join("\n"));
    }
  }
  return failed;
}

async function main() {
  const filter = process.argv[2];
  const presets = filter ? PRESETS.filter((p) => p === filter) : PRESETS;
  const linters = filter ? LINTERS.filter((l) => l === filter) : LINTERS;
  const appTypes = filter ? APP_TYPES.filter((a) => a === filter) : APP_TYPES;
  if (presets.length === 0 && linters.length === 0 && appTypes.length === 0) {
    console.error(
      `Unknown target "${filter}". Presets: ${PRESETS.join(", ")}. ` +
        `Linters: ${LINTERS.join(", ")}. App types: ${APP_TYPES.join(", ")}.`,
    );
    process.exit(1);
  }

  let anyFailed = false;
  for (const preset of presets) {
    anyFailed = report(preset, await smokePreset(preset)) || anyFailed;
  }
  for (const appType of appTypes) {
    anyFailed = report(`app:${appType}`, await smokeAppType(appType)) || anyFailed;
  }
  for (const linter of linters) {
    anyFailed = report(`linter:${linter}`, await smokeLinter(linter)) || anyFailed;
  }

  console.log(anyFailed ? "\nFAIL" : "\nAll presets, app types, and linters verified.");
  process.exit(anyFailed ? 1 : 0);
}

main();
