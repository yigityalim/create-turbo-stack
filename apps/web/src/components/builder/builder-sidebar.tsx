"use client";

import {
  AlertTriangle,
  Check,
  Circle,
  ClipboardCopy,
  Download,
  Gauge,
  Link,
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
import {
  downloadPresetJSON,
  generateShareURL,
  importPresetFromFile,
} from "@/lib/preset/serialization";
import { useBuilder } from "./builder-provider";
import { ProviderIcon } from "./icons";

export function BuilderSidebar() {
  const { validationErrors, isValid, fileTreeError, preset } = useBuilder();

  // Track unsaved changes (compare with initial loaded state)
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
      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="space-y-5 p-4">
          {/* Unsaved changes indicator */}
          {isModified && (
            <div className="flex items-center gap-1.5 rounded-[3px] bg-amber-500/10 px-2 py-1">
              <Circle className="h-2 w-2 fill-amber-500 text-amber-500" />
              <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                Modified
              </span>
            </div>
          )}

          {/* Preset Info */}
          <PresetMetaFields />

          {/* Project Name & Scope */}
          <ProjectNameField />
          <ScopeField />

          {/* CLI Command */}
          <CliCommandSection />

          {/* Category Progress */}
          <CategoryProgress />

          {/* Complexity Badge */}
          <ComplexityBadge />

          {/* Stack Summary */}
          <StackSummary />

          {/* Errors */}
          {fileTreeError && (
            <div className="rounded-[3px] border border-red-500/20 bg-red-500/10 px-3 py-2">
              <p className="font-mono text-[11px] text-red-400 uppercase tracking-wide">
                Preview Error
              </p>
              <p className="mt-1 text-xs text-fd-muted-foreground">
                {fileTreeError}
              </p>
            </div>
          )}
          {!isValid && <ValidationErrors errors={validationErrors} />}
        </div>
      </div>

      {/* Sticky footer actions */}
      <div className="space-y-2.5 border-fd-border border-t bg-fd-background/95 p-4">
        <ActionButtons />
      </div>
    </aside>
  );
}

// ─── Preset Metadata ──────────────────────────────────────────────────────────

function PresetMetaFields() {
  const { preset, dispatch } = useBuilder();

  return (
    <div className="space-y-2">
      <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
        Preset Info
      </span>
      <label className="flex flex-col">
        <span className="mb-1 font-mono text-[10px] text-fd-muted-foreground">
          Name
        </span>
        <input
          type="text"
          value={preset.name}
          onChange={(e) =>
            dispatch({
              type: "SET_META",
              payload: { name: e.target.value },
            })
          }
          className="w-full rounded-[3px] border border-fd-border bg-fd-background px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:border-fd-primary focus:outline-none"
          placeholder="My SaaS Stack"
        />
      </label>
      <label className="flex flex-col">
        <span className="mb-1 font-mono text-[10px] text-fd-muted-foreground">
          Description
        </span>
        <textarea
          value={preset.description ?? ""}
          onChange={(e) =>
            dispatch({
              type: "SET_META",
              payload: { description: e.target.value },
            })
          }
          rows={2}
          className="w-full resize-none rounded-[3px] border border-fd-border bg-fd-background px-2.5 py-1.5 font-mono text-xs text-fd-foreground focus:border-fd-primary focus:outline-none"
          placeholder="One-line description of this preset"
        />
      </label>
    </div>
  );
}

// ─── Project Name ─────────────────────────────────────────────────────────────

function ProjectNameField() {
  const { preset, dispatch } = useBuilder();
  const value = preset.basics.projectName;
  const error =
    value.length === 0
      ? "Required"
      : !/^[a-z0-9-]+$/.test(value)
        ? "Lowercase alphanumeric and hyphens only"
        : null;

  return (
    <label className="flex flex-col">
      <span className="mb-1 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
        Project Name
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) =>
          dispatch({
            type: "SET_BASICS",
            payload: { projectName: e.target.value.toLowerCase() },
          })
        }
        className={cn(
          "w-full rounded-[3px] border px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:outline-none",
          error
            ? "border-red-500 bg-red-500/10"
            : "border-fd-border bg-fd-background focus:border-fd-primary",
        )}
        placeholder="my-turborepo"
      />
      {error && <span className="mt-1 text-[11px] text-red-400">{error}</span>}
    </label>
  );
}

// ─── Scope ────────────────────────────────────────────────────────────────────

function ScopeField() {
  const { preset, dispatch } = useBuilder();
  const value = preset.basics.scope;
  const error =
    value.length === 0
      ? "Required"
      : !/^@[a-z0-9-]+$/.test(value)
        ? "Must start with @ (e.g. @my-org)"
        : null;

  return (
    <label className="flex flex-col">
      <span className="mb-1 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
        Scope
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          let v = e.target.value.toLowerCase();
          if (v.length > 0 && !v.startsWith("@")) v = `@${v}`;
          dispatch({ type: "SET_BASICS", payload: { scope: v } });
        }}
        className={cn(
          "w-full rounded-[3px] border px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:outline-none",
          error
            ? "border-red-500 bg-red-500/10"
            : "border-fd-border bg-fd-background focus:border-fd-primary",
        )}
        placeholder="@my-org"
      />
      {error && <span className="mt-1 text-[11px] text-red-400">{error}</span>}
    </label>
  );
}

// ─── Category Progress (minimap) ──────────────────────────────────────────

function CategoryProgress() {
  const { preset } = useBuilder();

  const progress = useMemo(() => {
    const items: { key: string; label: string; active: boolean }[] = [
      {
        key: "database",
        label: "Database",
        active: preset.database.strategy !== "none",
      },
      { key: "api", label: "API", active: preset.api.strategy !== "none" },
      { key: "auth", label: "Auth", active: preset.auth.provider !== "none" },
      { key: "css", label: "CSS", active: preset.css.framework !== "vanilla" },
      { key: "ui", label: "UI", active: preset.css.ui !== "none" },
      {
        key: "analytics",
        label: "Analytics",
        active: preset.integrations.analytics !== "none",
      },
      {
        key: "errors",
        label: "Errors",
        active: preset.integrations.errorTracking !== "none",
      },
      {
        key: "email",
        label: "Email",
        active: preset.integrations.email !== "none",
      },
      {
        key: "rateLimit",
        label: "Rate Limit",
        active: preset.integrations.rateLimit !== "none",
      },
      { key: "ai", label: "AI", active: preset.integrations.ai !== "none" },
    ];
    return items;
  }, [preset]);

  const activeCount = progress.filter((p) => p.active).length;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
          Configuration
        </span>
        <span className="font-mono text-[11px] text-fd-muted-foreground">
          {activeCount}/{progress.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {progress.map((item) => (
          <span
            key={item.key}
            className={cn(
              "rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] transition-colors",
              item.active
                ? "bg-fd-primary/12 text-fd-primary"
                : "bg-fd-muted/10 text-fd-muted-foreground/50",
            )}
          >
            {item.label}
          </span>
        ))}
      </div>
      {/* Progress bar */}
      <div className="h-1 overflow-hidden rounded-[2px] bg-fd-muted/15">
        <div
          className="h-full rounded-[2px] bg-fd-primary/60 transition-all duration-300"
          style={{ width: `${(activeCount / progress.length) * 100}%` }}
        />
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

function ComplexityBadge() {
  const { preset } = useBuilder();
  const { level, score, details } = useMemo(
    () => computeComplexity(preset),
    [preset],
  );
  const style = COMPLEXITY_STYLES[level];

  return (
    <div className="space-y-1.5">
      <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
        Complexity
      </span>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-[3px] px-2 py-1",
            style.bg,
          )}
        >
          <Gauge className={cn("h-3.5 w-3.5", style.text)} />
          <span className={cn("font-mono text-xs font-medium", style.text)}>
            {style.label}
          </span>
        </div>
        <span className="font-mono text-[10px] text-fd-muted-foreground">
          {score} pts
        </span>
      </div>
      {details.length > 0 && (
        <p className="text-[11px] text-fd-muted-foreground leading-relaxed">
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
      const url = await generateShareURL(preset);
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
        <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
          CLI Command
        </span>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "flex items-center gap-1 rounded-[3px] border px-2 py-1 font-mono text-[11px] uppercase transition-colors",
            copied
              ? "border-fd-primary bg-fd-primary/14 text-fd-primary"
              : "border-fd-border bg-fd-muted/20 text-fd-muted-foreground hover:border-fd-primary hover:bg-fd-primary/[0.06] hover:text-fd-foreground",
          )}
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <ClipboardCopy className="h-3 w-3" />
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
              "flex-1 rounded-[2px] px-1 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
              pm === opt
                ? "bg-fd-primary/15 text-fd-primary"
                : "text-fd-muted-foreground hover:bg-fd-muted/15 hover:text-fd-foreground",
            )}
          >
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

function StackSummary() {
  const { preset, dispatch } = useBuilder();

  // Each badge now carries an `icon` slot (group + value) so the sidebar gets
  // the same brand glyphs the option cards in the configure pane use.
  // Hand-coded `apps/packages` chip glyphs (frameworks + package types) use
  // their own PROVIDER_ICONS groups so the brand mark is recognizable.
  const badges = useMemo(() => {
    const b: {
      key: string;
      label: string;
      /** Optional muted suffix — e.g. category label so duplicate providers
       *  ("Upstash" for cache AND rate-limit) read distinctly. */
      secondary?: string;
      icon?: { group: string; value: string };
      onRemove?: () => void;
    }[] = [];
    const clear = (action: PresetAction) => () => dispatch(action);

    if (preset.database.strategy !== "none")
      b.push({
        key: `db-${preset.database.strategy}`,
        label: providerLabel("database", preset.database.strategy),
        icon: { group: "database", value: preset.database.strategy },
        onRemove: clear({
          type: "SET_DATABASE",
          payload: { strategy: "none" },
        } as PresetAction),
      });
    if (preset.api.strategy !== "none")
      b.push({
        key: `api-${preset.api.strategy}`,
        label: providerLabel("api", preset.api.strategy),
        icon: { group: "api", value: preset.api.strategy },
        onRemove: clear({
          type: "SET_API",
          payload: { strategy: "none" },
        } as PresetAction),
      });
    if (preset.auth.provider !== "none")
      b.push({
        key: `auth-${preset.auth.provider}`,
        label: providerLabel("auth", preset.auth.provider),
        icon: { group: "auth", value: preset.auth.provider },
        onRemove: clear({
          type: "SET_AUTH",
          payload: { provider: "none" },
        } as PresetAction),
      });
    if (preset.css.ui !== "none")
      b.push({
        key: `ui-${preset.css.ui}`,
        label: providerLabel("ui", preset.css.ui),
        icon: { group: "ui", value: preset.css.ui },
        onRemove: clear({
          type: "SET_CSS",
          payload: { ui: "none" },
        } as PresetAction),
      });
    for (const [key, value] of Object.entries(preset.integrations)) {
      if (key === "envValidation" || value === "none") continue;
      // Same provider can power multiple integrations (Upstash → cache +
      // rateLimit, Vercel → analytics + AI). Tack the category label on so
      // the two chips are distinct at a glance instead of both reading
      // "Upstash" with no context.
      const provider = providerLabel(key, String(value));
      const category = INTEGRATION_CATEGORY_LABELS[key] ?? key;
      b.push({
        key: `${key}-${value}`,
        label: provider,
        secondary: category,
        icon: { group: key, value: String(value) },
        onRemove: clear({
          type: "SET_INTEGRATIONS",
          payload: { [key]: "none" },
        } as PresetAction),
      });
    }
    preset.apps.forEach((app, i) => {
      b.push({
        key: `app-${app.name}`,
        label: app.name,
        icon: { group: "appType", value: app.type },
        onRemove:
          preset.apps.length > 1
            ? clear({ type: "REMOVE_APP", index: i } as PresetAction)
            : undefined,
      });
    });
    preset.packages.forEach((pkg, i) => {
      b.push({
        key: `pkg-${pkg.name}`,
        label: pkg.name,
        icon: { group: "packageType", value: pkg.type },
        onRemove: clear({ type: "REMOVE_PACKAGE", index: i } as PresetAction),
      });
    });
    return b;
  }, [preset, dispatch]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
          Selected stack
        </span>
        <span className="font-mono text-[11px] text-fd-muted-foreground">
          {badges.length} picks
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((badge) =>
          badge.onRemove ? (
            <button
              key={badge.key}
              type="button"
              onClick={badge.onRemove}
              title={
                badge.secondary
                  ? `Remove ${badge.label} (${badge.secondary})`
                  : `Remove ${badge.label}`
              }
              className="group flex items-center gap-1.5 rounded-[3px] border border-fd-primary/30 bg-fd-primary/10 py-1 pr-1.5 pl-1.5 font-mono text-[11px] text-fd-primary transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
            >
              {badge.icon && (
                <ProviderIcon
                  group={badge.icon.group}
                  value={badge.icon.value}
                  className="size-3"
                />
              )}
              {badge.label}
              {badge.secondary && (
                <span className="text-fd-primary/50">· {badge.secondary}</span>
              )}
              <X className="h-2.5 w-2.5 opacity-50 transition-opacity group-hover:opacity-100" />
            </button>
          ) : (
            <span
              key={badge.key}
              className="flex items-center gap-1.5 rounded-[3px] border border-fd-border bg-fd-muted/15 px-1.5 py-1 font-mono text-[11px] text-fd-muted-foreground"
            >
              {badge.icon && (
                <ProviderIcon
                  group={badge.icon.group}
                  value={badge.icon.value}
                  className="size-3"
                />
              )}
              {badge.label}
              {badge.secondary && (
                <span className="text-fd-muted-foreground/50">
                  · {badge.secondary}
                </span>
              )}
            </span>
          ),
        )}
        {badges.length === 0 && (
          <span className="text-fd-muted-foreground text-xs">
            Default configuration
          </span>
        )}
      </div>
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
    <div className="rounded-[3px] border border-amber-500/20 bg-amber-500/10 px-3 py-2 space-y-1">
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-600 uppercase tracking-wide dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        Validation Issues
      </div>
      {errors.slice(0, 5).map((err) => (
        <p key={err.message} className="text-xs text-fd-muted-foreground">
          {err.message}
        </p>
      ))}
      {errors.length > 5 && (
        <p className="text-xs text-fd-muted-foreground">
          ...and {errors.length - 5} more
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
    <div className="grid grid-cols-4 gap-1.5">
      <ActionButton
        icon={shared ? Check : Share2}
        label={shared ? "Copied!" : "Share"}
        onClick={handleShare}
        active={shared}
      />
      <ActionButton icon={Download} label="Export" onClick={handleExport} />
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
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-[3px] border px-2 py-1.5 font-mono text-[10px] transition-colors",
        active
          ? "border-fd-primary bg-fd-primary/10 text-fd-primary"
          : "border-fd-border bg-fd-muted/15 text-fd-muted-foreground hover:border-fd-primary hover:bg-fd-primary/[0.06] hover:text-fd-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
