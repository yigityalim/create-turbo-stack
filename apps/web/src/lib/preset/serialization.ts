/**
 * Preset serialization — JSON ↔ compressed URL string.
 *
 * Format: "v<version>:<compressed-payload>"
 *
 * v1: lz-string compressToEncodedURIComponent
 * v2 (future): short IDs backed by DB (/s/<id>)
 *
 * The version prefix lets us migrate old links when schema changes.
 */
import type { Preset } from "@create-turbo-stack/schema";
import { PresetSchema } from "@create-turbo-stack/schema";
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

// ─── Version ──────────────────────────────────────────────────────────────────

const CURRENT_VERSION = 1;
const VERSION_PREFIX = `v${CURRENT_VERSION}:`;

// ─── Codec ────────────────────────────────────────────────────────────────────

/**
 * Compress a preset into a versioned, URL-safe string.
 * Output: "v1:<lz-compressed-json>"
 */
export function compressPreset(preset: Preset): string {
  const json = JSON.stringify(preset);
  const compressed = compressToEncodedURIComponent(json);
  return `${VERSION_PREFIX}${compressed}`;
}

/**
 * Decompress a versioned URL-safe string back into a Preset.
 * Handles version detection for future migration.
 * Returns null if the string is invalid or unparseable.
 */
export function decompressPreset(input: string): Preset | null {
  try {
    const json = decodeVersioned(input);
    if (!json) return null;

    const parsed = JSON.parse(json);
    const result = PresetSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Decode the payload based on version prefix.
 * Returns raw JSON string or null.
 */
function decodeVersioned(input: string): string | null {
  // v1: lz-string
  if (input.startsWith("v1:")) {
    const payload = input.slice(3);
    return decompressFromEncodedURIComponent(payload);
  }

  // No version prefix — try lz-string as fallback (legacy/direct paste)
  const fallback = decompressFromEncodedURIComponent(input);
  if (fallback) return fallback;

  // Last resort: try raw base64 (very old links)
  try {
    if (typeof atob === "function") {
      return decodeURIComponent(atob(input));
    }
  } catch {
    // Not base64 either
  }

  return null;
}

// ─── URL ──────────────────────────────────────────────────────────────────────

const PARAM_KEY = "p";

/**
 * Read preset from current URL search params.
 */
export function readPresetFromURL(): Preset | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const compressed = params.get(PARAM_KEY);
  if (!compressed) return null;
  return decompressPreset(compressed);
}

/**
 * Generate a shareable URL for a preset.
 */
export function generateShareURL(preset: Preset, baseURL?: string): string {
  const base =
    baseURL ?? (typeof window !== "undefined" ? window.location.origin : "");
  const compressed = compressPreset(preset);
  return `${base}/builder?${PARAM_KEY}=${compressed}`;
}

/**
 * Update the browser URL without triggering navigation.
 * Used for "live" URL sync as the user edits.
 */
export function pushPresetToURL(preset: Preset) {
  if (typeof window === "undefined") return;
  const compressed = compressPreset(preset);
  const url = new URL(window.location.href);
  url.searchParams.set(PARAM_KEY, compressed);
  window.history.replaceState(null, "", url.toString());
}

// ─── JSON Export/Import ───────────────────────────────────────────────────────

/**
 * Trigger a browser download of the preset as JSON.
 */
export function downloadPresetJSON(preset: Preset) {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(preset, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${preset.basics.projectName || "preset"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Read a preset from a File object (from file picker).
 * Returns null if the file is not valid JSON or doesn't match the schema.
 */
export async function importPresetFromFile(file: File): Promise<Preset | null> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const result = PresetSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// ─── localStorage ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "create-turbo-stack:builder-preset";

export function savePresetToStorage(preset: Preset) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
  } catch {
    // Storage full or unavailable
  }
}

export function loadPresetFromStorage(): Preset | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = PresetSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function clearPresetStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
