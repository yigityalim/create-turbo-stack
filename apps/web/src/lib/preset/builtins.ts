/**
 * Built-in presets, imported as JSON at build-time. Lets the sidebar tell
 * "this preset is still saas-starter" from "this preset has diverged" without
 * a network round-trip, and lets the CLI command degrade gracefully:
 *
 *   exact match      → `npx create-turbo-stack@latest saas-starter`
 *   except name      → `npx create-turbo-stack@latest <your-name> --preset saas-starter`
 *   no match         → `npx create-turbo-stack@latest <your-name> --preset <share-url>`
 *
 * Source-of-truth lives in /presets/*.json at the repo root — the same files
 * served at /s/*.json. Schema-validated lazily; if a fixture drifts we report
 * `null` from `matchBuiltin` rather than throwing.
 */

import { type Preset, PresetSchema } from "@create-turbo-stack/schema";
import apiOnlyJson from "../../../../../presets/api-only.json";
import minimalJson from "../../../../../presets/minimal.json";
import saasStarterJson from "../../../../../presets/saas-starter.json";

export type BuiltinPreset = {
  /** CLI argument name (matches the file basename and the `name` field). */
  name: string;
  preset: Preset;
};

/**
 * Parse a JSON fixture into a typed Preset; returns `null` if the fixture
 * drifts from the schema. We don't want a bad fixture to crash the sidebar.
 */
function load(raw: unknown): Preset | null {
  const parsed = PresetSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

const loaded = [
  { name: "minimal", preset: load(minimalJson) },
  { name: "saas-starter", preset: load(saasStarterJson) },
  { name: "api-only", preset: load(apiOnlyJson) },
] satisfies { name: string; preset: Preset | null }[];

export const BUILTIN_PRESETS: BuiltinPreset[] = loaded.flatMap((b) =>
  b.preset ? [{ name: b.name, preset: b.preset }] : [],
);

/**
 * Compare a Preset to the built-ins. Returns:
 *   { name, identical: true }  — match including projectName / preset name
 *   { name, identical: false } — match except for projectName / preset name
 *   null                       — no match
 *
 * "Identical" determines whether the CLI command can be the bare
 * `<preset-name>` shortcut or needs a `<your-name> --preset <preset-name>`
 * pair.
 */
export function matchBuiltin(
  preset: Preset,
): { name: string; identical: boolean } | null {
  const key = canonicalKey(preset);
  const keyAnon = canonicalKey(stripIdentity(preset));

  for (const { name, preset: bp } of BUILTIN_PRESETS) {
    if (key === canonicalKey(bp)) return { name, identical: true };
  }
  for (const { name, preset: bp } of BUILTIN_PRESETS) {
    if (keyAnon === canonicalKey(stripIdentity(bp))) {
      return { name, identical: false };
    }
  }
  return null;
}

/**
 * Project-identity fields that don't affect "is this still the same preset?"
 * semantically. Stripping them lets us detect "saas-starter but renamed".
 */
function stripIdentity(preset: Preset): Preset {
  return {
    ...preset,
    name: "",
    basics: { ...preset.basics, projectName: "" },
  };
}

/**
 * Deep canonical key — recursive key-sorted JSON. Captures structural
 * equality without caring about object key order, which JSON deserialisation
 * can sometimes scramble.
 */
function canonicalKey(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as object).sort()) {
      sorted[k] = canonicalize((value as Record<string, unknown>)[k]);
    }
    return sorted;
  }
  return value;
}
