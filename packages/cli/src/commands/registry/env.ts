import fs from "node:fs/promises";
import path from "node:path";

/**
 * `${VAR}` resolution for registry config (tokens, headers). Placeholders
 * resolve against the project's `.env` / `.env.local` merged under the real
 * environment (shell wins) — so a registry token can live in `.env.local`
 * instead of being exported in the shell. `loadEnvSource` must run first.
 */
let envSource: Record<string, string | undefined> = process.env;

function parseDotenv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return out;
}

export async function loadEnvSource(cwd: string): Promise<void> {
  const read = async (f: string) =>
    parseDotenv(await fs.readFile(path.join(cwd, f), "utf-8").catch(() => ""));
  envSource = { ...(await read(".env")), ...(await read(".env.local")), ...process.env };
}

/** Expand `${VAR}` from `envSource` (so tokens never live in config). */
export function expandEnv(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => envSource[name] ?? "");
}
