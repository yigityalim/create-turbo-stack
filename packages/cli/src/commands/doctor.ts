import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import { CURRENT_PRESET_SCHEMA_VERSION, ValidatedPresetSchema } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { readProjectConfig } from "../io/reader";

interface DoctorOptions {
  json?: boolean;
}

interface Check {
  name: string;
  status: "ok" | "warn" | "fail";
  detail?: string;
}

/**
 * `doctor` — environment + project sanity checks.
 *
 * Catches the common "why isn't this working?" classes of issue:
 * missing/old Node, missing package manager binary, stale schema
 * version, malformed `.turbo-stack.json`, missing workspace
 * directories. Exits non-zero on any `fail`-level finding so it can
 * be wired into `bun run prepush` or CI.
 */
export async function doctorCommand(options: DoctorOptions = {}): Promise<void> {
  const checks: Check[] = [];

  // Node version
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  checks.push({
    name: "Node version",
    status: major >= 20 ? "ok" : "fail",
    detail: process.versions.node,
  });

  for (const pm of ["bun", "pnpm", "npm", "yarn"] as const) {
    const found = which(pm);
    checks.push({
      name: `${pm} binary`,
      status: found ? "ok" : "warn",
      detail: found ?? "not on PATH",
    });
  }

  // .turbo-stack.json
  const cwd = process.cwd();
  const config = await readProjectConfig(cwd).catch(() => null);
  if (!config) {
    checks.push({
      name: ".turbo-stack.json",
      status: "warn",
      detail: "not found — run `init` to adopt this directory",
    });
  } else {
    checks.push({ name: ".turbo-stack.json", status: "ok", detail: "found" });

    const version = (config as { schemaVersion?: string }).schemaVersion ?? "1.0";
    checks.push({
      name: "Schema version",
      status: version === CURRENT_PRESET_SCHEMA_VERSION ? "ok" : "warn",
      detail:
        version === CURRENT_PRESET_SCHEMA_VERSION
          ? version
          : `${version} → ${CURRENT_PRESET_SCHEMA_VERSION} (run \`upgrade\`)`,
    });

    const result = ValidatedPresetSchema.safeParse(config);
    checks.push({
      name: "Schema validation",
      status: result.success ? "ok" : "fail",
      detail: result.success
        ? "valid"
        : result.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
    });

    // Workspace directories — apps/<name>, packages/<name>
    for (const app of config.apps) {
      const exists = await dirExists(path.join(cwd, "apps", app.name));
      checks.push({
        name: `apps/${app.name}`,
        status: exists ? "ok" : "warn",
        detail: exists ? "present" : "missing on disk",
      });
    }
    for (const pkg of config.packages) {
      const exists = await dirExists(path.join(cwd, "packages", pkg.name));
      checks.push({
        name: `packages/${pkg.name}`,
        status: exists ? "ok" : "warn",
        detail: exists ? "present" : "missing on disk",
      });
    }
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ checks }, null, 2)}\n`);
  } else {
    p.intro(`${pc.bgCyan(pc.black(" doctor "))} ${pc.dim(cwd)}`);
    for (const c of checks) {
      const icon =
        c.status === "ok" ? pc.green("✓") : c.status === "warn" ? pc.yellow("!") : pc.red("✗");
      p.log.message(`${icon} ${c.name.padEnd(22)} ${c.detail ? pc.dim(c.detail) : ""}`);
    }
    p.outro("");
  }

  if (checks.some((c) => c.status === "fail")) process.exit(1);
}

function which(bin: string): string | null {
  try {
    const out = execSync(`command -v ${bin}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return out || null;
  } catch {
    return null;
  }
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
