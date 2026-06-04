import { type NextRequest, NextResponse } from "next/server";
import { PresetSchema } from "@create-turbo-stack/schema";

/**
 * GET /api/preset?p=v1:<compressed>
 *
 * Decodes a compressed preset from the builder's share URL and returns
 * it as raw JSON. This is the URL the CLI uses with --preset so that
 * `fetch(url)` returns machine-readable JSON rather than the builder HTML.
 *
 * The compression scheme mirrors serialization.ts in the web app:
 * deflate-raw → base64url, prefixed with "v1:".
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("p");

  if (!p) {
    return NextResponse.json(
      { error: "Missing ?p= parameter. Use the builder to generate a shareable URL." },
      { status: 400 },
    );
  }

  try {
    const preset = await decodePreset(p);
    if (!preset) {
      return NextResponse.json(
        { error: "Invalid or corrupted preset data." },
        { status: 400 },
      );
    }
    return NextResponse.json(preset, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to decode preset." },
      { status: 400 },
    );
  }
}

const VERSION_PREFIX = "v1:";
const KEY_MAP: Record<string, string> = {
  sv: "schemaVersion", n: "name", v: "version", d: "description", ao: "author",
  b: "basics", db: "database", a: "api", au: "auth", c: "css", i: "integrations",
  ap: "apps", pk: "packages", rp: "registryPackages", ov: "packageOverrides",
  al: "autoPackageLocations", pn: "projectName", pm: "packageManager", sc: "scope",
  ts: "typescript", l: "linter", g: "gitInit", st: "strategy", dv: "driver",
  md: "mode", pr: "provider", rb: "rbac", en: "entitlements", fw: "framework",
  u: "ui", sy: "styling", an: "analytics", et: "errorTracking", em: "email",
  rl: "rateLimit", ai: "ai", ca: "cache", ev: "envValidation", t: "type",
  lo: "location", p: "port", il: "i18n", co: "consumes", pc: "producesCSS",
  ex: "exports", rg: "registry", rf: "ref", ck: "checksum", dp: "dependencies",
  dd: "devDependencies", sr: "scripts", ef: "extraFiles", pa: "path", ct: "content",
};

const USER_KEY_PATHS = new Set(["packageOverrides", "autoPackageLocations"]);

function remapKeys(value: unknown, path = ""): unknown {
  if (Array.isArray(value)) return value.map((v) => remapKeys(v, path));
  if (value === null || typeof value !== "object") return value;
  const skipKeyMap = USER_KEY_PATHS.has(path);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const newKey = skipKeyMap ? k : (KEY_MAP[k] ?? k);
    const originalKey = KEY_MAP[k] ?? k;
    const childPath = path ? `${path}.${originalKey}` : originalKey;
    out[newKey] = remapKeys(v, childPath);
  }
  return out;
}

function base64UrlToBytes(b64u: string): Uint8Array {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
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

async function decodePreset(compressed: string): Promise<unknown | null> {
  const payload = compressed.startsWith(VERSION_PREFIX)
    ? compressed.slice(VERSION_PREFIX.length)
    : compressed;
  const bytes = base64UrlToBytes(payload);
  const inflated = await inflateRaw(bytes);
  const json = new TextDecoder().decode(inflated);
  const raw = remapKeys(JSON.parse(json));
  const result = PresetSchema.safeParse(raw);
  return result.success ? result.data : null;
}
