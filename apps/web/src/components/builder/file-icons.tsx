/**
 * Inline file-type icons for the explorer tree.
 *
 * Each icon is a 16×16 SVG built either from a "monogram tile" (coloured
 * square + 2–4 letter abbreviation) or a Lucide glyph with a brand-aware
 * tint. No external assets, no network — palette is loosely modelled on the
 * VSCode Material Icon Theme so file types are scannable at a glance.
 *
 * Public API: `<FileIcon name="package.json" />`. The matcher returns the
 * most specific renderer it can — exact filenames first (package.json,
 * tsconfig.json, …), then extension, then a muted fallback.
 */

import { cn } from "@/lib/cn";

const SIZE = "h-4 w-4 shrink-0";

// ─── Primitives ───────────────────────────────────────────────────────────────

function MonogramTile({
  fill,
  label,
  textFill = "#ffffff",
  fontSize,
}: {
  fill: string;
  label: string;
  textFill?: string;
  /** Auto-shrinks for longer labels; override for special-case glyphs. */
  fontSize?: number;
}) {
  const size =
    fontSize ?? (label.length <= 2 ? 7 : label.length === 3 ? 5.5 : 4.5);
  return (
    <svg viewBox="0 0 16 16" className={SIZE} aria-hidden="true">
      <rect x="1" y="1.5" width="14" height="13" rx="2.5" fill={fill} />
      <text
        x="8"
        y="11.5"
        textAnchor="middle"
        fontSize={size}
        fontWeight={700}
        fill={textFill}
        fontFamily="-apple-system, ui-sans-serif, sans-serif"
        letterSpacing="-0.02em"
      >
        {label}
      </text>
    </svg>
  );
}

function LockIcon({ tint }: { tint: string }) {
  return (
    <svg viewBox="0 0 16 16" className={SIZE} aria-hidden="true" fill="none">
      <rect x="3.5" y="7.5" width="9" height="6" rx="1.2" fill={tint} />
      <path
        d="M5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2"
        stroke={tint}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CogFile({ tint }: { tint: string }) {
  return (
    <svg viewBox="0 0 16 16" className={SIZE} aria-hidden="true" fill="none">
      <path
        d="M3 2.5h6.5L13 6v7.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"
        stroke={tint}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="10" r="1.4" fill={tint} />
      <path
        d="M8 7.6v.8M8 11.6v.8M10 10h.8M5.2 10H6"
        stroke={tint}
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GenericFile({ tint }: { tint: string }) {
  return (
    <svg viewBox="0 0 16 16" className={SIZE} aria-hidden="true" fill="none">
      <path
        d="M4 2h5l3 3v9H4z"
        stroke={tint}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M9 2v3h3"
        stroke={tint}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Concrete icons ───────────────────────────────────────────────────────────
// Palette mirrors VSCode Material's brand colours for the common cases.

const TS_BLUE = "#3178c6";
const JS_YELLOW = "#f7df1e";
const NPM_RED = "#cb3837";
const BIOME_GREEN = "#60a5fa"; // biome uses a blue brand; gentle for the tile
const MD_BLUE = "#519aba";
const CSS_PURPLE = "#563d7c";
const HTML_ORANGE = "#e34c26";
const JSON_OCHRE = "#a98a2e";
const ENV_GRAY = "#6b7280";
const YAML_RED = "#b91c1c";
const TOML_BROWN = "#9a3412";

function TypeScriptIcon() {
  return <MonogramTile fill={TS_BLUE} label="TS" />;
}
function TsxIcon() {
  return <MonogramTile fill={TS_BLUE} label="TSX" />;
}
function JavaScriptIcon() {
  return <MonogramTile fill={JS_YELLOW} label="JS" textFill="#1a1a1a" />;
}
function JsxIcon() {
  return <MonogramTile fill={JS_YELLOW} label="JSX" textFill="#1a1a1a" />;
}
function JsonIcon() {
  return <MonogramTile fill={JSON_OCHRE} label="{}" fontSize={8} />;
}
function MarkdownIcon() {
  return <MonogramTile fill={MD_BLUE} label="MD" />;
}
function CssIcon() {
  return <MonogramTile fill={CSS_PURPLE} label="CSS" />;
}
function HtmlIcon() {
  return <MonogramTile fill={HTML_ORANGE} label="</>" fontSize={5} />;
}
function YamlIcon() {
  return <MonogramTile fill={YAML_RED} label="YML" />;
}
function TomlIcon() {
  return <MonogramTile fill={TOML_BROWN} label="TML" />;
}
function EnvIcon() {
  return <MonogramTile fill={ENV_GRAY} label="ENV" />;
}
function PackageJsonIcon() {
  return <MonogramTile fill={NPM_RED} label="{}" fontSize={8} />;
}
function TsconfigIcon() {
  return <MonogramTile fill={TS_BLUE} label="{}" fontSize={8} />;
}
function BiomeIcon() {
  return <MonogramTile fill={BIOME_GREEN} label="B" />;
}

// ─── Filename → icon resolver ─────────────────────────────────────────────────

/**
 * Map a filename to its renderer. Exact filenames win over extensions, so
 * `package.json` gets the npm-red icon, not the generic ochre JSON tile.
 * Lockfiles, dotenv variants, and a couple of well-known configs are
 * recognised; everything else falls back to extension matching, then a muted
 * generic file glyph.
 */
function resolveFileIcon(name: string): React.ReactElement {
  // Exact filenames (special cases first).
  const lower = name.toLowerCase();
  if (lower === "package.json") return <PackageJsonIcon />;
  if (lower === "tsconfig.json" || lower.startsWith("tsconfig."))
    return <TsconfigIcon />;
  if (lower === "biome.json" || lower === "biome.jsonc") return <BiomeIcon />;
  if (
    lower === "bun.lock" ||
    lower === "bun.lockb" ||
    lower === "package-lock.json" ||
    lower === "pnpm-lock.yaml" ||
    lower === "yarn.lock"
  ) {
    return <LockIcon tint="currentColor" />;
  }
  if (
    lower === ".gitignore" ||
    lower === ".npmrc" ||
    lower === ".gitattributes"
  ) {
    return <CogFile tint="currentColor" />;
  }
  if (lower.startsWith(".env")) return <EnvIcon />;

  // Extension matching.
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  switch (ext) {
    case "ts":
    case "mts":
    case "cts":
      return <TypeScriptIcon />;
    case "tsx":
      return <TsxIcon />;
    case "js":
    case "mjs":
    case "cjs":
      return <JavaScriptIcon />;
    case "jsx":
      return <JsxIcon />;
    case "json":
    case "jsonc":
      return <JsonIcon />;
    case "md":
    case "mdx":
      return <MarkdownIcon />;
    case "css":
    case "scss":
    case "sass":
    case "less":
      return <CssIcon />;
    case "html":
    case "htm":
      return <HtmlIcon />;
    case "yaml":
    case "yml":
      return <YamlIcon />;
    case "toml":
      return <TomlIcon />;
    default:
      return <GenericFile tint="currentColor" />;
  }
}

// ─── Public component ─────────────────────────────────────────────────────────

/**
 * File-type aware icon. When `isSelected`, the icon dims so the row's
 * selection chrome carries the colour. When `isMuted` (e.g. for content-only
 * search matches), the icon stays grey to keep focus on the matched cell.
 */
export function FileIcon({
  name,
  isSelected,
  isMuted,
}: {
  name: string;
  isSelected?: boolean;
  isMuted?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        isMuted && "text-fd-muted-foreground/60",
        !isMuted && "text-fd-muted-foreground",
        isSelected && "opacity-60",
      )}
    >
      {resolveFileIcon(name)}
    </span>
  );
}
