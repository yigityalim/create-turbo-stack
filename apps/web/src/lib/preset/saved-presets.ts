/**
 * Named presets the user saves to localStorage from the builder.
 *
 * Separate from the single auto-restore draft in `serialization.ts`
 * (`savePresetToStorage`/`loadPresetFromStorage`). This stores a *collection*
 * of named presets under one key.
 *
 * Security: localStorage is untrusted input (another script, a synced
 * profile, or a hand-edited value could put anything there). Every entry's
 * `preset` is re-validated through `PresetSchema` on read and anything that
 * doesn't parse is dropped — the rest of the app never sees an unvalidated
 * preset.
 */
import type { Preset } from "@create-turbo-stack/schema";
import { PresetSchema } from "@create-turbo-stack/schema";

const KEY = "create-turbo-stack:saved-presets";
const MAX_PRESETS = 50;
const MAX_NAME = 60;

export type SavedPreset = {
  id: string;
  name: string;
  createdAt: number;
  preset: Preset;
};

function parseEntry(value: unknown): SavedPreset | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.name !== "string" ||
    typeof o.createdAt !== "number"
  ) {
    return null;
  }
  const parsed = PresetSchema.safeParse(o.preset);
  if (!parsed.success) return null;
  return {
    id: o.id,
    name: o.name.slice(0, MAX_NAME),
    createdAt: o.createdAt,
    preset: parsed.data,
  };
}

export function listSavedPresets(): SavedPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map(parseEntry)
      .filter((e): e is SavedPreset => e !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function persist(list: SavedPreset[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or unavailable — fail silently.
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Save the current preset under `name`. Returns the updated list. */
export function saveNamedPreset(name: string, preset: Preset): SavedPreset[] {
  const clean = name.trim().slice(0, MAX_NAME) || "Untitled preset";
  const entry: SavedPreset = {
    id: newId(),
    name: clean,
    createdAt: Date.now(),
    preset,
  };
  const next = [entry, ...listSavedPresets()].slice(0, MAX_PRESETS);
  persist(next);
  return next;
}

/** Delete a saved preset by id. Returns the updated list. */
export function deleteSavedPreset(id: string): SavedPreset[] {
  const next = listSavedPresets().filter((p) => p.id !== id);
  persist(next);
  return next;
}
