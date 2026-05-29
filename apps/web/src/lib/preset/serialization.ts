import type { Preset } from "@create-turbo-stack/schema";
import { PresetSchema } from "@create-turbo-stack/schema";

const VERSION_PREFIX = "v1:";
const PARAM_KEY = "p";
const SECTION_PARAM_KEY = "s";
/** `?f=` carries the workspace-relative path of the file open in the preview
 *  pane. Plain URI-encoded — paths are non-secret and short enough that
 *  compression would just add overhead. Refresh restores the same file. */
const FILE_PARAM_KEY = "f";
const STORAGE_KEY = "create-turbo-stack:builder-preset";

const KEY_MAP: Record<string, string> = {
  schemaVersion: "sv",
  name: "n",
  version: "v",
  description: "d",
  author: "ao",
  basics: "b",
  database: "db",
  api: "a",
  auth: "au",
  css: "c",
  integrations: "i",
  apps: "ap",
  packages: "pk",
  registryPackages: "rp",
  packageOverrides: "ov",
  autoPackageLocations: "al",
  projectName: "pn",
  packageManager: "pm",
  scope: "sc",
  typescript: "ts",
  linter: "l",
  gitInit: "g",
  strategy: "st",
  driver: "dv",
  mode: "md",
  provider: "pr",
  rbac: "rb",
  entitlements: "en",
  framework: "fw",
  ui: "u",
  styling: "sy",
  analytics: "an",
  errorTracking: "et",
  email: "em",
  rateLimit: "rl",
  ai: "ai",
  cache: "ca",
  envValidation: "ev",
  type: "t",
  location: "lo",
  port: "p",
  i18n: "il",
  consumes: "co",
  producesCSS: "pc",
  exports: "ex",
  registry: "rg",
  ref: "rf",
  checksum: "ck",
  dependencies: "dp",
  devDependencies: "dd",
  scripts: "sr",
  extraFiles: "ef",
  path: "pa",
  content: "ct",
};

const INVERSE_KEY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k]),
);

const USER_KEY_PATHS = new Set(["packageOverrides", "autoPackageLocations"]);

function remapKeys(
  value: unknown,
  dir: "encode" | "decode",
  path = "",
): unknown {
  if (Array.isArray(value)) return value.map((v) => remapKeys(v, dir, path));
  if (value === null || typeof value !== "object") return value;

  const map = dir === "encode" ? KEY_MAP : INVERSE_KEY_MAP;
  const skipKeyMap = USER_KEY_PATHS.has(path);
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const newKey = skipKeyMap ? k : (map[k] ?? k);
    const originalKey = dir === "encode" ? k : (INVERSE_KEY_MAP[k] ?? k);
    const childPath = path ? `${path}.${originalKey}` : originalKey;
    out[newKey] = remapKeys(v, dir, childPath);
  }

  return out;
}

function stripDefaults(preset: Preset): Record<string, unknown> {
  const o = JSON.parse(JSON.stringify(preset)) as Record<string, unknown>;

  if (o.schemaVersion === "1.0") delete o.schemaVersion;
  if (o.version === "1.0.0") delete o.version;
  if (!o.description) delete o.description;
  if (!o.author) delete o.author;
  if (Array.isArray(o.packages) && o.packages.length === 0) delete o.packages;
  if (Array.isArray(o.registryPackages) && o.registryPackages.length === 0) {
    delete o.registryPackages;
  }
  if (
    o.packageOverrides &&
    Object.keys(o.packageOverrides as object).length === 0
  ) {
    delete o.packageOverrides;
  }
  if (
    o.autoPackageLocations &&
    Object.keys(o.autoPackageLocations as object).length === 0
  ) {
    delete o.autoPackageLocations;
  }

  const b = o.basics as Record<string, unknown> | undefined;
  if (b) {
    if (b.typescript === "strict") delete b.typescript;
    if (b.linter === "biome") delete b.linter;
    if (b.gitInit === true) delete b.gitInit;
  }

  // For top-level objects that the schema requires (auth, css, integrations),
  // we trim interior fields but keep the container. Deleting the container
  // would break decode — none of these have a top-level `.default()` on the
  // schema, only on their inner fields. The empty `{}` is fine; Zod fills
  // every interior default during `safeParse`.
  const au = o.auth as Record<string, unknown> | undefined;
  if (au) {
    if (au.rbac === false) delete au.rbac;
    if (au.entitlements === false) delete au.entitlements;
    if (au.provider === "none") delete au.provider;
    if (Object.keys(au).length === 0) o.auth = {};
  }

  const cs = o.css as Record<string, unknown> | undefined;
  if (cs) {
    if (cs.framework === "tailwind4") delete cs.framework;
    if (cs.ui === "none") delete cs.ui;
    if (cs.styling === "css-variables") delete cs.styling;
    if (Object.keys(cs).length === 0) o.css = {};
  }

  const ig = o.integrations as Record<string, unknown> | undefined;
  if (ig) {
    for (const k of Object.keys(ig)) {
      if (ig[k] === "none") delete ig[k];
    }
    // envValidation's default is now "t3-env" (was the legacy `true` boolean).
    // Strip when value equals the default — "none" already dropped above.
    if (ig.envValidation === "t3-env") delete ig.envValidation;
    if (Object.keys(ig).length === 0) o.integrations = {};
  }

  // basics has REQUIRED fields (projectName, scope) — we trim defaults
  // but never delete the container itself, or schema parse fails.
  // (Already handled above.)

  if (Array.isArray(o.apps)) {
    o.apps = o.apps.map((a) => {
      const r = { ...(a as Record<string, unknown>) };
      if (r.i18n === false) delete r.i18n;
      if (Array.isArray(r.consumes) && r.consumes.length === 0)
        delete r.consumes;
      if (r.location === "apps") delete r.location;
      return r;
    });
  }

  if (Array.isArray(o.packages)) {
    o.packages = o.packages.map((p) => {
      const r = { ...(p as Record<string, unknown>) };
      if (r.producesCSS === false) delete r.producesCSS;
      const ex = r.exports;
      if (Array.isArray(ex) && ex.length === 1 && ex[0] === ".")
        delete r.exports;
      if (r.location === "packages") delete r.location;
      return r;
    });
  }

  return o;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64u: string): Uint8Array {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== "undefined") {
    const stream = new Blob([data.slice()])
      .stream()
      .pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  const { deflateRawSync } = await import("node:zlib");
  return new Uint8Array(deflateRawSync(data));
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "undefined") {
    const stream = new Blob([data.slice()])
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  const { inflateRawSync } = await import("node:zlib");
  return new Uint8Array(inflateRawSync(data));
}

/** Compress a preset into a versioned, URL-safe string. */
export async function compressPreset(preset: Preset): Promise<string> {
  const remapped = remapKeys(stripDefaults(preset), "encode");
  const bytes = new TextEncoder().encode(JSON.stringify(remapped));
  return `${VERSION_PREFIX}${bytesToBase64Url(await deflateRaw(bytes))}`;
}

/** Decompress a versioned URL-safe string back into a preset, or null if invalid. */
export async function decompressPreset(input: string): Promise<Preset | null> {
  try {
    if (!input.startsWith(VERSION_PREFIX)) return null;
    const compressed = base64UrlToBytes(input.slice(VERSION_PREFIX.length));
    const json = new TextDecoder().decode(await inflateRaw(compressed));
    const restored = remapKeys(JSON.parse(json), "decode") as Record<
      string,
      unknown
    >;
    // Inject empty containers for schema-required object fields that the
    // encoder stripped — Zod fills the interior defaults from there. Skip
    // `basics` (has required fields without defaults) and the discriminated
    // unions `database` / `api` (they need at least `{ strategy: "none" }`).
    for (const k of ["auth", "css", "integrations"]) {
      if (restored[k] === undefined) restored[k] = {};
    }
    for (const k of ["database", "api"]) {
      if (restored[k] === undefined) restored[k] = { strategy: "none" };
    }
    const result = PresetSchema.safeParse(restored);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Read a preset from the current URL's search params. */
export async function readPresetFromURL(): Promise<Preset | null> {
  if (typeof window === "undefined") return null;
  const compressed = new URLSearchParams(window.location.search).get(PARAM_KEY);
  return compressed ? decompressPreset(compressed) : null;
}

/** Build a shareable URL for a preset. */
export async function generateShareURL(
  preset: Preset,
  baseURL?: string,
): Promise<string> {
  const base =
    baseURL ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/builder?${PARAM_KEY}=${await compressPreset(preset)}`;
}

/** Sync a preset into the browser URL without navigating. */
export async function pushPresetToURL(preset: Preset): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM_KEY, await compressPreset(preset));
    window.history.replaceState(null, "", url.toString());
  } catch {
    /* noop */
  }
}

/** Read the open-file path from the URL — `null` if none is set. */
export function readSelectedFileFromURL(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(FILE_PARAM_KEY);
}

/**
 * Sync the open-file path into the URL. Pass `null` to remove the param
 * (closing the file). Like `pushPresetToURL` this uses `history.replaceState`
 * so a tab refresh restores the same file but the back stack doesn't fill
 * up with every file the user clicked.
 */
export function pushSelectedFileToURL(path: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (path) url.searchParams.set(FILE_PARAM_KEY, path);
    else url.searchParams.delete(FILE_PARAM_KEY);
    window.history.replaceState(null, "", url.toString());
  } catch {
    /* noop */
  }
}

/**
 * Read the currently-expanded section id from the URL — `null` if none.
 * Section ids match the `data-section` attributes used by ConfigureView's
 * scrollIntoView lookup (`apps`, `packages`, `package-<name>`,
 * `auto-package-<name>`, `app-<name>`, etc.) so the same id round-trips
 * between scroll, expand, and URL.
 */
export function readExpandedSectionFromURL(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(SECTION_PARAM_KEY);
}

/**
 * Sync the expanded section id into the URL. Pass `null` to remove the param
 * (collapse everything). Uses `history.replaceState` like the preset / file
 * params so the back stack doesn't fill up with every accordion toggle.
 */
export function pushExpandedSectionToURL(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set(SECTION_PARAM_KEY, id);
    else url.searchParams.delete(SECTION_PARAM_KEY);
    window.history.replaceState(null, "", url.toString());
  } catch {
    /* noop */
  }
}

/** Trigger a browser download of the preset as JSON. */
export function downloadPresetJSON(preset: Preset): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(preset, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${preset.basics.projectName || "preset"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse a preset from an uploaded JSON file, or null if invalid. */
export async function importPresetFromFile(file: File): Promise<Preset | null> {
  try {
    const result = PresetSchema.safeParse(JSON.parse(await file.text()));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function savePresetToStorage(preset: Preset): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
  } catch {
    /* empty */
  }
}

export function loadPresetFromStorage(): Preset | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const result = PresetSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function clearPresetStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
