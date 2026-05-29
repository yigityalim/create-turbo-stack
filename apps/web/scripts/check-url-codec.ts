/**
 * One-off smoke test for `lib/preset/serialization.ts` — round-trip + size
 * benchmark on the built-in presets. Run with `bun apps/web/scripts/check-url-codec.ts`.
 *
 * Not part of CI; the file lives here so a contributor can re-run it after
 * editing the key map or default-stripping logic and see the impact at a
 * glance.
 */

import { BUILTIN_PRESETS, DEFAULT_PRESET } from "../src/lib/preset/defaults";
import {
  compressPreset,
  decompressPreset,
} from "../src/lib/preset/serialization";

function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEquals(x, b[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => deepEquals(ao[k], bo[k]));
}

async function check(label: string, preset: unknown) {
  const url = await compressPreset(
    preset as Parameters<typeof compressPreset>[0],
  );
  const restored = await decompressPreset(url);
  const ok = restored && deepEquals(restored, preset);
  const status = ok ? "✓" : "✗";
  console.log(
    `${status} ${label.padEnd(20)}  payload=${url.length} chars  url-safe=${/^v2:[A-Za-z0-9_-]+$/.test(url)}`,
  );
  if (!ok) {
    console.log("  EXPECTED:", JSON.stringify(preset).slice(0, 200));
    console.log("  GOT:     ", JSON.stringify(restored).slice(0, 200));
  }
  return { url, ok };
}

const targets: Array<readonly [string, unknown]> = [
  ["default", DEFAULT_PRESET],
  ...BUILTIN_PRESETS.map((t) => [t.id, t.preset] as const),
];

let allOk = true;
for (const [id, preset] of targets) {
  const { ok } = await check(id, preset);
  if (!ok) allOk = false;
}

process.exit(allOk ? 0 : 1);
