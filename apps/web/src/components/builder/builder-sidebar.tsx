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
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { BUILTIN_PRESETS, DEFAULT_PRESET } from "@/lib/preset/defaults";
import {
  downloadPresetJSON,
  generateShareURL,
  importPresetFromFile,
} from "@/lib/preset/serialization";
import { useBuilder } from "./builder-provider";

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
    <aside className="flex min-h-0 flex-col overflow-hidden border-fd-border/50 border-r bg-fd-background">
      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="p-3 space-y-4">
          {/* Unsaved changes indicator */}
          {isModified && (
            <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1">
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
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
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
      <div className="border-fd-border/35 border-t bg-fd-background/95 p-3 space-y-2">
        <ActionButtons />
        <PresetSelector />
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
          className="w-full rounded-lg border border-fd-border/60 bg-fd-background px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:border-fd-primary focus:outline-none"
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
          className="w-full resize-none rounded-lg border border-fd-border/60 bg-fd-background px-2.5 py-1.5 font-mono text-xs text-fd-foreground focus:border-fd-primary focus:outline-none"
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
          "w-full rounded-lg border px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:outline-none",
          error
            ? "border-red-500 bg-red-500/10"
            : "border-fd-border/60 bg-fd-background focus:border-fd-primary",
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
          "w-full rounded-lg border px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:outline-none",
          error
            ? "border-red-500 bg-red-500/10"
            : "border-fd-border/60 bg-fd-background focus:border-fd-primary",
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
              "rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors",
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
      <div className="h-1 overflow-hidden rounded-full bg-fd-muted/15">
        <div
          className="h-full rounded-full bg-fd-primary/60 transition-all duration-300"
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
            "flex items-center gap-1.5 rounded-md px-2 py-1",
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

function CliCommandSection() {
  const { preset } = useBuilder();
  const [copied, setCopied] = useState(false);
  const [copiedPreset, setCopiedPreset] = useState(false);

  const command = useMemo(() => {
    return `npx create-turbo-stack@latest ${preset.basics.projectName}`;
  }, [preset.basics.projectName]);

  const presetCommand = useMemo(() => {
    const url = generateShareURL(preset);
    return `npx create-turbo-stack --preset ${url}`;
  }, [preset]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  async function copyPresetCommand() {
    try {
      await navigator.clipboard.writeText(presetCommand);
      setCopiedPreset(true);
      setTimeout(() => setCopiedPreset(false), 2000);
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
            "flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] uppercase transition-colors",
            copied
              ? "bg-fd-primary/14 text-fd-primary"
              : "bg-fd-muted/20 text-fd-muted-foreground hover:bg-fd-muted/35",
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
      <button
        type="button"
        onClick={copy}
        className="w-full cursor-pointer rounded-lg bg-fd-muted/10 px-2.5 py-2 text-left ring-1 ring-fd-border/30"
      >
        <code className="block break-all font-mono text-fd-muted-foreground text-xs">
          <span className="text-fd-primary">$</span> {command}
        </code>
      </button>
      <button
        type="button"
        onClick={copyPresetCommand}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[11px] transition-colors",
          copiedPreset
            ? "bg-fd-primary/14 text-fd-primary"
            : "bg-fd-muted/10 text-fd-muted-foreground hover:bg-fd-muted/20",
        )}
      >
        {copiedPreset ? (
          <Check className="h-3 w-3 shrink-0" />
        ) : (
          <Link className="h-3 w-3 shrink-0" />
        )}
        {copiedPreset ? "Copied!" : "Copy with preset URL"}
      </button>
    </div>
  );
}

// ─── Stack Summary ────────────────────────────────────────────────────────────

function StackSummary() {
  const { preset } = useBuilder();

  const badges = useMemo(() => {
    const b: { label: string; category: string }[] = [];
    if (preset.database.strategy !== "none")
      b.push({ label: preset.database.strategy, category: "database" });
    if (preset.api.strategy !== "none")
      b.push({ label: preset.api.strategy, category: "api" });
    if (preset.auth.provider !== "none")
      b.push({ label: preset.auth.provider, category: "auth" });
    if (preset.css.framework !== "vanilla")
      b.push({ label: preset.css.framework, category: "css" });
    if (preset.css.ui !== "none")
      b.push({ label: preset.css.ui, category: "ui" });
    for (const [key, value] of Object.entries(preset.integrations)) {
      if (key === "envValidation") continue;
      if (value !== "none") b.push({ label: String(value), category: key });
    }
    for (const app of preset.apps) {
      b.push({ label: `${app.name} (${app.type})`, category: "app" });
    }
    for (const pkg of preset.packages) {
      b.push({ label: `${pkg.name} (${pkg.type})`, category: "package" });
    }
    return b;
  }, [preset]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
          Selected Stack
        </span>
        <span className="font-mono text-[11px] text-fd-muted-foreground">
          {badges.length} picks
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {badges.map((badge) => (
          <span
            key={`${badge.category}-${badge.label}`}
            className="rounded-md bg-fd-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-fd-primary"
          >
            {badge.label}
          </span>
        ))}
        {badges.length === 0 && (
          <span className="text-xs text-fd-muted-foreground">
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
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 space-y-1">
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
    const url = generateShareURL(preset);
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
        "flex flex-col items-center gap-1 rounded-md px-2 py-1.5 font-mono text-[10px] transition-colors",
        active
          ? "bg-fd-primary/10 text-fd-primary"
          : "bg-fd-muted/15 text-fd-muted-foreground hover:bg-fd-muted/25 hover:text-fd-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ─── Preset Selector ──────────────────────────────────────────────────────────

function PresetSelector() {
  const { dispatch } = useBuilder();

  return (
    <div className="space-y-1.5">
      <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
        Presets
      </span>
      <div className="grid grid-cols-3 gap-1.5">
        {BUILTIN_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => dispatch({ type: "LOAD_PRESET", payload: p.preset })}
            className="rounded-md bg-fd-muted/15 px-2 py-1.5 font-mono text-[10px] text-fd-muted-foreground transition-colors hover:bg-fd-muted/25 hover:text-fd-foreground"
            title={p.description}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
