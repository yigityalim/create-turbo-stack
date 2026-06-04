"use client";

import {
  AlertTriangle,
  Check,
  Circle,
  ClipboardCopy,
  Download,
  FolderArchive,
  Gauge,
  Link,
  Loader2,
  RefreshCw,
  Share2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { matchBuiltin } from "@/lib/preset/builtins";
import { DEFAULT_PRESET } from "@/lib/preset/defaults";
import type { PresetAction } from "@/lib/preset/reducer";
import {
  INTEGRATION_CATEGORY_LABELS,
  providerLabel,
} from "@/lib/preset/schema-meta";
import { resolveTreeAction } from "@/lib/actions/resolve-tree";
import {
  downloadPresetJSON,
  downloadProjectZip,
  generateCliPresetURL,
  generateShareURL,
  importPresetFromFile,
} from "@/lib/preset/serialization";
import { useBuilder } from "./builder-provider";
import { ProviderIcon } from "./icons";

/** Wrapper that adds consistent padding + explicit bottom border. */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-fd-border/50 border-b px-3.5 py-3 last:border-b-0">
      {children}
    </div>
  );
}

/** Consistent section header used across all sidebar blocks. */
function SidebarLabel({
  label,
  right,
}: {
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="select-none font-mono text-[10px] font-medium tracking-[0.1em] text-fd-muted-foreground uppercase">
        {label}
      </span>
      {right && (
        <span className="font-mono text-[10px] text-fd-muted-foreground/70">
          {right}
        </span>
      )}
    </div>
  );
}

export function BuilderSidebar() {
  const { validationErrors, isValid, fileTreeError, preset } = useBuilder();

  const initialPresetRef = useRef<string | null>(null);
  const [isModified, setIsModified] = useState(false);

  useEffect(() => {
    const serialized = JSON.stringify(preset);
    if (initialPresetRef.current === null) {
      initialPresetRef.current = serialized;
    }
    setIsModified(serialized !== initialPresetRef.current);
  }, [preset]);

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden border-fd-border border-r bg-fd-background">
      <div className="min-h-0 flex-1 overflow-auto">
        <Section><ProjectSection isModified={isModified} /></Section>
        <Section><CliCommandSection /></Section>
        <Section><CoverageGrid /></Section>
        <Section><ComplexityMeter /></Section>
        <Section><StackSummary /></Section>
        {(fileTreeError || !isValid) && (
          <Section>
            <div className="space-y-2">
              {fileTreeError && (
                <div className="rounded-[3px] border border-red-500/20 bg-red-500/8 px-2.5 py-2">
                  <p className="font-mono text-[9px] tracking-[0.12em] text-red-400 uppercase mb-1">
                    Preview Error
                  </p>
                  <p className="font-mono text-[11px] text-fd-muted-foreground">
                    {fileTreeError}
                  </p>
                </div>
              )}
              {!isValid && <ValidationErrors errors={validationErrors} />}
            </div>
          </Section>
        )}
      </div>
      <div className="border-fd-border border-t bg-fd-background/95 p-3.5">
        <ActionButtons />
      </div>
    </aside>
  );
}

// ─── Project Section (name + scope + description merged) ─────────────────────

function ProjectSection({ isModified }: { isModified: boolean }) {
  const { preset, dispatch } = useBuilder();

  const nameValue = preset.basics.projectName;
  const scopeValue = preset.basics.scope;

  const nameError =
    nameValue.length === 0
      ? "Required"
      : !/^[a-z0-9-]+$/.test(nameValue)
        ? "Lowercase + hyphens only"
        : null;

  const scopeError =
    scopeValue.length === 0
      ? "Required"
      : !/^@[a-z0-9-]+$/.test(scopeValue)
        ? "Must start with @"
        : null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <SidebarLabel label="Project" />
        {isModified && (
          <span className="flex items-center gap-1 font-mono text-[9px] text-amber-500 dark:text-amber-400">
            <Circle className="h-1.5 w-1.5 fill-current" />
            modified
          </span>
        )}
      </div>

      {/* Name — large, prominent */}
      <div>
        <input
          type="text"
          value={nameValue}
          onChange={(e) =>
            dispatch({
              type: "SET_BASICS",
              payload: { projectName: e.target.value.toLowerCase() },
            })
          }
          className={cn(
            "w-full rounded-[3px] border bg-transparent px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:outline-none transition-colors",
            nameError
              ? "border-red-500/60 bg-red-500/8"
              : "border-fd-border focus:border-fd-primary",
          )}
          placeholder="my-turborepo"
        />
        {nameError && (
          <p className="mt-0.5 font-mono text-[10px] text-red-400">{nameError}</p>
        )}
      </div>

      {/* Scope */}
      <div>
        <input
          type="text"
          value={scopeValue}
          onChange={(e) => {
            let v = e.target.value.toLowerCase();
            if (v.length > 0 && !v.startsWith("@")) v = `@${v}`;
            dispatch({ type: "SET_BASICS", payload: { scope: v } });
          }}
          className={cn(
            "w-full rounded-[3px] border bg-transparent px-2.5 py-1.5 font-mono text-xs text-fd-muted-foreground focus:text-fd-foreground focus:outline-none transition-colors",
            scopeError
              ? "border-red-500/60 bg-red-500/8"
              : "border-fd-border focus:border-fd-primary",
          )}
          placeholder="@my-org"
        />
        {scopeError && (
          <p className="mt-0.5 font-mono text-[10px] text-red-400">{scopeError}</p>
        )}
      </div>

      {/* Preset name + description — subtle, below fold */}
      <div className="grid grid-cols-2 gap-1.5">
        <input
          type="text"
          value={preset.name}
          onChange={(e) =>
            dispatch({ type: "SET_META", payload: { name: e.target.value } })
          }
          className="rounded-[3px] border border-fd-border bg-transparent px-2 py-1 font-mono text-[11px] text-fd-muted-foreground placeholder:text-fd-muted-foreground/40 focus:border-fd-primary focus:text-fd-foreground focus:outline-none transition-colors"
          placeholder="preset name"
        />
        <input
          type="text"
          value={preset.description ?? ""}
          onChange={(e) =>
            dispatch({ type: "SET_META", payload: { description: e.target.value } })
          }
          className="rounded-[3px] border border-fd-border bg-transparent px-2 py-1 font-mono text-[11px] text-fd-muted-foreground placeholder:text-fd-muted-foreground/40 focus:border-fd-primary focus:text-fd-foreground focus:outline-none transition-colors"
          placeholder="description"
        />
      </div>
    </div>
  );
}

// ─── Coverage Grid ────────────────────────────────────────────────────────────

type CoverageCell = {
  key: string;
  label: string;
  active: boolean;
  icon?: { group: string; value: string };
};

function CoverageGrid() {
  const { preset } = useBuilder();

  const cells = useMemo((): CoverageCell[] => [
    {
      key: "database",
      label: "DB",
      active: preset.database.strategy !== "none",
      icon: preset.database.strategy !== "none"
        ? { group: "database", value: preset.database.strategy }
        : undefined,
    },
    {
      key: "api",
      label: "API",
      active: preset.api.strategy !== "none",
      icon: preset.api.strategy !== "none"
        ? { group: "api", value: preset.api.strategy }
        : undefined,
    },
    {
      key: "auth",
      label: "Auth",
      active: preset.auth.provider !== "none",
      icon: preset.auth.provider !== "none"
        ? { group: "auth", value: preset.auth.provider }
        : undefined,
    },
    {
      key: "css",
      label: "CSS",
      active: true,
      icon: { group: "css", value: preset.css.framework },
    },
    {
      key: "ui",
      label: "UI",
      active: preset.css.ui !== "none",
      icon: preset.css.ui !== "none"
        ? { group: "ui", value: preset.css.ui }
        : undefined,
    },
    {
      key: "analytics",
      label: "Analytics",
      active: preset.integrations.analytics !== "none",
      icon: preset.integrations.analytics !== "none"
        ? { group: "analytics", value: preset.integrations.analytics }
        : undefined,
    },
    {
      key: "errorTracking",
      label: "Errors",
      active: preset.integrations.errorTracking !== "none",
      icon: preset.integrations.errorTracking !== "none"
        ? { group: "errorTracking", value: preset.integrations.errorTracking }
        : undefined,
    },
    {
      key: "email",
      label: "Email",
      active: preset.integrations.email !== "none",
      icon: preset.integrations.email !== "none"
        ? { group: "email", value: preset.integrations.email }
        : undefined,
    },
    {
      key: "rateLimit",
      label: "Rate",
      active: preset.integrations.rateLimit !== "none",
      icon: preset.integrations.rateLimit !== "none"
        ? { group: "rateLimit", value: preset.integrations.rateLimit }
        : undefined,
    },
    {
      key: "ai",
      label: "AI",
      active: preset.integrations.ai !== "none",
      icon: preset.integrations.ai !== "none"
        ? { group: "ai", value: preset.integrations.ai }
        : undefined,
    },
  ], [preset]);

  const activeCount = cells.filter((c) => c.active).length;

  return (
    <div className="space-y-2">
      <SidebarLabel label="Configuration" right={`${activeCount} / ${cells.length}`} />
      <div className="grid grid-cols-5 gap-1">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={cn(
              "flex flex-col items-center gap-1 rounded-[3px] border py-1.5 px-1 transition-colors",
              cell.active
                ? "border-fd-primary/30 bg-fd-primary/8"
                : "border-fd-border/50 bg-fd-muted/8",
            )}
          >
            <div className="h-3.5 w-3.5 flex items-center justify-center">
              {cell.icon ? (
                <ProviderIcon
                  group={cell.icon.group}
                  value={cell.icon.value}
                  className="h-3.5 w-3.5"
                />
              ) : (
                <span
                  className={cn(
                    "block h-1.5 w-1.5 rounded-full",
                    cell.active ? "bg-fd-primary/60" : "bg-fd-muted-foreground/20",
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                "font-mono text-[8px] leading-none tracking-wide",
                cell.active
                  ? "text-fd-primary/80"
                  : "text-fd-muted-foreground/40",
              )}
            >
              {cell.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Complexity Badge ─────────────────────────────────────────────────────

type ComplexityLevel = "minimal" | "standard" | "advanced" | "complex";

function computeComplexity(preset: typeof DEFAULT_PRESET): {
  level: ComplexityLevel;
  score: number;
  details: string[];
} {
  let score = 0;
  const details: string[] = [];

  // Database
  if (preset.database.strategy !== "none") {
    score += 2;
    details.push(preset.database.strategy);
  }

  // API
  if (preset.api.strategy !== "none") {
    score += 2;
    details.push(preset.api.strategy);
  }

  // Auth
  if (preset.auth.provider !== "none") {
    score += 2;
    details.push("auth");
    if (preset.auth.rbac) {
      score += 1;
      details.push("rbac");
    }
    if (preset.auth.entitlements) {
      score += 1;
      details.push("entitlements");
    }
  }

  // CSS
  if (preset.css.ui !== "none") {
    score += 1;
    details.push(preset.css.ui);
  }

  // Integrations
  if (preset.integrations.analytics !== "none") {
    score += 1;
    details.push("analytics");
  }
  if (preset.integrations.errorTracking !== "none") {
    score += 1;
    details.push("error tracking");
  }
  if (preset.integrations.email !== "none") {
    score += 1;
    details.push("email");
  }
  if (preset.integrations.rateLimit !== "none") {
    score += 1;
    details.push("rate limit");
  }
  if (preset.integrations.ai !== "none") {
    score += 1;
    details.push("ai");
  }

  // Apps & packages
  score += preset.apps.length - 1; // First app is free
  score += preset.packages.length;
  if (preset.apps.length > 1) details.push(`${preset.apps.length} apps`);
  if (preset.packages.length > 0)
    details.push(`${preset.packages.length} packages`);

  // i18n
  if (preset.apps.some((a) => a.i18n)) {
    score += 1;
    details.push("i18n");
  }

  let level: ComplexityLevel;
  if (score <= 2) level = "minimal";
  else if (score <= 6) level = "standard";
  else if (score <= 10) level = "advanced";
  else level = "complex";

  return { level, score, details };
}

const COMPLEXITY_STYLES: Record<
  ComplexityLevel,
  { bg: string; text: string; label: string }
> = {
  minimal: {
    bg: "bg-green-500/12",
    text: "text-green-600 dark:text-green-400",
    label: "Minimal",
  },
  standard: {
    bg: "bg-blue-500/12",
    text: "text-blue-600 dark:text-blue-400",
    label: "Standard",
  },
  advanced: {
    bg: "bg-amber-500/12",
    text: "text-amber-600 dark:text-amber-400",
    label: "Advanced",
  },
  complex: {
    bg: "bg-red-500/12",
    text: "text-red-600 dark:text-red-400",
    label: "Complex",
  },
};

const MAX_SCORE = 12;

function ComplexityMeter() {
  const { preset } = useBuilder();
  const { level, score, details } = useMemo(
    () => computeComplexity(preset),
    [preset],
  );
  const style = COMPLEXITY_STYLES[level];
  const filled = Math.min(score, MAX_SCORE);

  return (
    <div className="space-y-2">
      <SidebarLabel
        label="Complexity"
        right={
          <span className={cn("font-mono text-[9px]", style.text)}>
            {style.label} · {score}pts
          </span>
        }
      />
      <div className="flex gap-[2px]">
        {Array.from({ length: MAX_SCORE }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-[1px] transition-colors duration-200",
              i < filled
                ? level === "minimal"
                  ? "bg-green-500/70"
                  : level === "standard"
                    ? "bg-blue-500/70"
                    : level === "advanced"
                      ? "bg-amber-500/70"
                      : "bg-red-500/70"
                : "bg-fd-muted/20",
            )}
          />
        ))}
      </div>
      {details.length > 0 && (
        <p className="font-mono text-[10px] text-fd-muted-foreground/60 leading-relaxed">
          {details.join(" · ")}
        </p>
      )}
    </div>
  );
}

// ─── CLI Command ──────────────────────────────────────────────────────────────

/**
 * Package-manager runner prefixes for `create-*` packages. The trailing
 * space-or-empty in the prefix dictates whether the package name follows
 * with a space (`bunx create-turbo-stack`) or is glued straight on
 * (`deno run -A npm:create-turbo-stack`). Mirrors the canonical
 * invocation each ecosystem documents — npm/pnpm/yarn use the dlx-style
 * "remote package runner", bun has `bunx`, deno needs `npm:`.
 */
const PM_OPTIONS = ["bun", "npm", "pnpm", "yarn", "deno"] as const;
type PMKey = (typeof PM_OPTIONS)[number];
const PM_PREFIX: Record<PMKey, string> = {
  bun: "bunx ",
  npm: "npx ",
  pnpm: "pnpm dlx ",
  yarn: "yarn dlx ",
  deno: "deno run -A npm:",
};

const PM_STORAGE_KEY = "create-turbo-stack:builder-pm";

function readStoredPM(): PMKey {
  if (typeof window === "undefined") return "npm";
  try {
    const v = localStorage.getItem(PM_STORAGE_KEY);
    return (PM_OPTIONS as readonly string[]).includes(v ?? "")
      ? (v as PMKey)
      : "npm";
  } catch {
    return "npm";
  }
}

function CliCommandSection() {
  const { preset } = useBuilder();
  const [copied, setCopied] = useState(false);
  const [pm, setPmState] = useState<PMKey>(readStoredPM);
  const setPm = useCallback((next: PMKey) => {
    setPmState(next);
    try {
      localStorage.setItem(PM_STORAGE_KEY, next);
    } catch {
      /* storage unavailable — fall back to in-memory only */
    }
  }, []);

  /**
   * Built-in match — drives the command shape. Three states:
   *
   *   match.identical = true   → bare shortcut (`<name> <preset-name>`)
   *   match.identical = false  → preset-name flag (`<name> <projectName> --preset <preset-name>`)
   *   match = null             → URL-encoded preset (the big one)
   *
   * The URL form is async (CompressionStream), so we render a stable
   * placeholder until it resolves. The first two forms resolve synchronously.
   */
  const match = useMemo(() => matchBuiltin(preset), [preset]);

  const projectName = preset.basics.projectName || "my-app";

  /**
   * For diverged presets we keep the share URL OUT of the rendered command
   * box — a 700-char URL forces multi-line wrap and turns the sidebar into
   * a wall of base64. The URL goes to clipboard on Copy; the box shows a
   * compact `<url · 720c>` chip so the command structure stays readable.
   */
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  useEffect(() => {
    if (match) {
      setShareUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      // CLI command uses /api/preset (returns JSON); share button uses /builder (opens UI).
      const url = await generateCliPresetURL(preset);
      if (!cancelled) setShareUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [match, preset]);

  /** What lands in the user's clipboard — always the real, full command. */
  const prefix = PM_PREFIX[pm];
  const command = useMemo(() => {
    if (match?.identical) {
      return `${prefix}create-turbo-stack@latest ${match.name}`;
    }
    if (match) {
      return `${prefix}create-turbo-stack@latest ${projectName} --preset ${match.name}`;
    }
    return shareUrl
      ? `${prefix}create-turbo-stack@latest ${projectName} --preset ${shareUrl}`
      : `${prefix}create-turbo-stack@latest ${projectName} --preset …`;
  }, [match, prefix, projectName, shareUrl]);

  const subLabel = match?.identical
    ? `Matches the ${match.name} preset exactly`
    : match
      ? `Based on ${match.name} — renamed only`
      : shareUrl
        ? `Diverged from any built-in — ${shareUrl.length.toLocaleString()} chars in URL`
        : "Encoding preset…";

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <SidebarLabel label="CLI Command" />
        <button
          type="button"
          onClick={copy}
          className={cn(
            "flex items-center gap-1 rounded-[3px] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-colors",
            copied
              ? "border-fd-primary bg-fd-primary/14 text-fd-primary"
              : "border-fd-border bg-fd-muted/20 text-fd-muted-foreground hover:border-fd-primary hover:bg-fd-primary/[0.06] hover:text-fd-foreground",
          )}
        >
          {copied ? (
            <Check className="h-2.5 w-2.5" />
          ) : (
            <ClipboardCopy className="h-2.5 w-2.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {/* PM runner picker — persists to localStorage so the user only sets
          it once per machine. The selected runner drives the command's
          prefix; nothing else changes. */}
      <div className="flex items-stretch gap-0.5 rounded-[3px] border border-fd-border bg-fd-card p-0.5">
        {PM_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setPm(opt)}
            title={`${PM_PREFIX[opt].trim()} create-turbo-stack@latest …`}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-[2px] px-1 py-1 font-mono text-[8px] uppercase tracking-wider transition-colors",
              pm === opt
                ? "bg-fd-primary/15 text-fd-primary"
                : "text-fd-muted-foreground hover:bg-fd-muted/15 hover:text-fd-foreground",
            )}
          >
            <ProviderIcon
              group="packageManager"
              value={opt}
              className="h-3.5 w-3.5"
            />
            {opt}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={copy}
        title={
          match ? command : "Click to copy the full command (URL included)"
        }
        className="w-full cursor-pointer overflow-hidden rounded-[3px] border border-fd-border bg-fd-muted/10 px-2.5 py-2 text-left transition-colors hover:border-fd-primary hover:bg-fd-primary/[0.06]"
      >
        <code className="block truncate font-mono text-fd-muted-foreground text-xs">
          <span className="text-fd-primary">$</span>{" "}
          {match ? (
            command
          ) : (
            <>
              {prefix}create-turbo-stack@latest {projectName} --preset{" "}
              <span
                className="inline-flex items-center gap-1 rounded-[2px] bg-fd-primary/10 px-1.5 py-0 font-mono text-[10px] text-fd-primary"
                title="The share URL is included in the copied command, hidden here so the sidebar stays readable."
              >
                <Link className="h-2.5 w-2.5" />
                url · {shareUrl ? `${shareUrl.length.toLocaleString()}c` : "…"}
              </span>
            </>
          )}
        </code>
      </button>
      <p
        className={cn(
          "flex items-center gap-1 font-mono text-[10px]",
          match ? "text-fd-primary/80" : "text-fd-muted-foreground/80",
        )}
      >
        {match ? (
          <Check className="h-2.5 w-2.5 shrink-0" />
        ) : (
          <Link className="h-2.5 w-2.5 shrink-0" />
        )}
        {subLabel}
      </p>
    </div>
  );
}

// ─── Stack Summary ────────────────────────────────────────────────────────────

type StackBadge = {
  key: string;
  label: string;
  secondary?: string;
  icon?: { group: string; value: string };
  onRemove?: () => void;
  group: "core" | "integrations" | "apps" | "packages";
};

const STACK_GROUPS: { key: StackBadge["group"]; label: string }[] = [
  { key: "core", label: "Core" },
  { key: "integrations", label: "Integrations" },
  { key: "apps", label: "Apps" },
  { key: "packages", label: "Packages" },
];

function StackChip({ badge }: { badge: StackBadge }) {
  const base =
    "flex items-center gap-1.5 rounded-[3px] border px-2 py-1 font-mono text-[11px] transition-colors";

  if (badge.onRemove) {
    return (
      <button
        type="button"
        onClick={badge.onRemove}
        title={badge.secondary ? `Remove ${badge.label} (${badge.secondary})` : `Remove ${badge.label}`}
        className={cn(
          base,
          "group border-fd-primary/25 bg-fd-primary/8 text-fd-primary hover:border-red-500/40 hover:bg-red-500/8 hover:text-red-400",
        )}
      >
        {badge.icon && (
          <ProviderIcon group={badge.icon.group} value={badge.icon.value} className="size-3.5" />
        )}
        {badge.label}
        {badge.secondary && (
          <span className="text-fd-primary/40 text-[10px]">· {badge.secondary}</span>
        )}
        <X className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  }
  return (
    <span className={cn(base, "border-fd-border/50 bg-fd-muted/10 text-fd-muted-foreground")}>
      {badge.icon && (
        <ProviderIcon group={badge.icon.group} value={badge.icon.value} className="size-3.5" />
      )}
      {badge.label}
    </span>
  );
}

function StackSummary() {
  const { preset, dispatch } = useBuilder();

  const badges = useMemo((): StackBadge[] => {
    const b: StackBadge[] = [];
    const clear = (action: PresetAction) => () => dispatch(action);

    if (preset.database.strategy !== "none")
      b.push({
        key: `db-${preset.database.strategy}`,
        label: providerLabel("database", preset.database.strategy),
        icon: { group: "database", value: preset.database.strategy },
        onRemove: clear({ type: "SET_DATABASE", payload: { strategy: "none" } } as PresetAction),
        group: "core",
      });
    if (preset.api.strategy !== "none")
      b.push({
        key: `api-${preset.api.strategy}`,
        label: providerLabel("api", preset.api.strategy),
        icon: { group: "api", value: preset.api.strategy },
        onRemove: clear({ type: "SET_API", payload: { strategy: "none" } } as PresetAction),
        group: "core",
      });
    if (preset.auth.provider !== "none")
      b.push({
        key: `auth-${preset.auth.provider}`,
        label: providerLabel("auth", preset.auth.provider),
        icon: { group: "auth", value: preset.auth.provider },
        onRemove: clear({ type: "SET_AUTH", payload: { provider: "none" } } as PresetAction),
        group: "core",
      });
    if (preset.css.ui !== "none")
      b.push({
        key: `ui-${preset.css.ui}`,
        label: providerLabel("ui", preset.css.ui),
        icon: { group: "ui", value: preset.css.ui },
        onRemove: clear({ type: "SET_CSS", payload: { ui: "none" } } as PresetAction),
        group: "core",
      });

    for (const [key, value] of Object.entries(preset.integrations)) {
      if (key === "envValidation" || value === "none") continue;
      const provider = providerLabel(key, String(value));
      const category = INTEGRATION_CATEGORY_LABELS[key] ?? key;
      b.push({
        key: `${key}-${value}`,
        label: provider,
        secondary: category,
        icon: { group: key, value: String(value) },
        onRemove: clear({ type: "SET_INTEGRATIONS", payload: { [key]: "none" } } as PresetAction),
        group: "integrations",
      });
    }

    preset.apps.forEach((app, i) => {
      b.push({
        key: `app-${app.name}`,
        label: app.name,
        icon: { group: "appType", value: app.type },
        onRemove: preset.apps.length > 1
          ? clear({ type: "REMOVE_APP", index: i } as PresetAction)
          : undefined,
        group: "apps",
      });
    });

    preset.packages.forEach((pkg, i) => {
      b.push({
        key: `pkg-${pkg.name}`,
        label: pkg.name,
        icon: { group: "packageType", value: pkg.type },
        onRemove: clear({ type: "REMOVE_PACKAGE", index: i } as PresetAction),
        group: "packages",
      });
    });

    return b;
  }, [preset, dispatch]);

  const total = badges.length;

  return (
    <div className="space-y-2.5">
      <SidebarLabel label="Stack" right={`${total} picks`} />
      {total === 0 ? (
        <p className="font-mono text-[10px] text-fd-muted-foreground/50">Default configuration</p>
      ) : (
        <div className="space-y-2">
          {STACK_GROUPS.map(({ key, label }) => {
            const items = badges.filter((b) => b.group === key);
            if (items.length === 0) return null;
            return (
              <div key={key}>
                <p className="mb-1 font-mono text-[8px] tracking-[0.12em] text-fd-muted-foreground/40 uppercase">
                  {label}
                </p>
                <div className="flex flex-wrap gap-1">
                  {items.map((badge) => (
                    <StackChip key={badge.key} badge={badge} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Validation Errors ────────────────────────────────────────────────────────

function ValidationErrors({
  errors,
}: {
  errors: { path: (string | number)[]; message: string }[];
}) {
  return (
    <div className="rounded-[3px] border border-amber-500/20 bg-amber-500/8 px-2.5 py-2 space-y-1">
      <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.12em] text-amber-500 uppercase dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" />
        Validation
      </div>
      {errors.slice(0, 5).map((err) => (
        <p key={err.message} className="font-mono text-[11px] text-fd-muted-foreground">
          {err.message}
        </p>
      ))}
      {errors.length > 5 && (
        <p className="font-mono text-[10px] text-fd-muted-foreground/60">
          +{errors.length - 5} more
        </p>
      )}
    </div>
  );
}

// ─── Actions ──────────────────────────────────────────────────────────────────

function ActionButtons() {
  const { preset, dispatch, eventBus } = useBuilder();
  const [shared, setShared] = useState(false);

  async function handleShare() {
    const url = await generateShareURL(preset);
    // Use Web Share API if available
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: preset.name || "Turbo Stack Preset",
          text: preset.description || "Check out my Turbo Stack preset",
          url,
        });
        eventBus.emit("preset:share", { method: "url" });
        return;
      } catch {
        // User cancelled or share failed, fall back to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      eventBus.emit("preset:share", { method: "url" });
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  function handleExport() {
    downloadPresetJSON(preset);
    eventBus.emit("preset:share", { method: "json" });
  }

  const [zipping, setZipping] = useState(false);
  async function handleDownloadZip() {
    if (zipping) return;
    setZipping(true);
    try {
      const { tree, error } = await resolveTreeAction(preset);
      if (error || !tree) return;
      downloadProjectZip(preset, tree.nodes);
      eventBus.emit("preset:share", { method: "zip" });
    } finally {
      setZipping(false);
    }
  }

  async function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const imported = await importPresetFromFile(file);
      if (imported) {
        dispatch({ type: "LOAD_PRESET", payload: imported });
      }
    };
    input.click();
  }

  function handleReset() {
    dispatch({ type: "RESET", payload: DEFAULT_PRESET });
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <ActionButton
        icon={shared ? Check : Share2}
        label={shared ? "Copied!" : "Share"}
        onClick={handleShare}
        active={shared}
        className="col-span-2"
      />
      <ActionButton icon={Download} label="JSON" onClick={handleExport} />
      <ActionButton
        icon={zipping ? Loader2 : FolderArchive}
        label={zipping ? "Zipping…" : "ZIP"}
        onClick={handleDownloadZip}
        disabled={zipping}
      />
      <ActionButton icon={Upload} label="Import" onClick={handleImport} />
      <ActionButton icon={RefreshCw} label="Reset" onClick={handleReset} />
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  disabled = false,
  className,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-[3px] border px-2 py-1.5 font-mono text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-fd-primary bg-fd-primary/10 text-fd-primary"
          : "border-fd-border bg-fd-muted/15 text-fd-muted-foreground hover:border-fd-primary hover:bg-fd-primary/[0.06] hover:text-fd-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
