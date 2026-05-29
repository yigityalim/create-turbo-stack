"use client";

/**
 * Package customize editor — exposes `preset.packageOverrides[name]` to the
 * UI. Drops a "+ Customize" affordance into the package card's expanded
 * view; lets the user add extra deps, scripts, and files on top of what the
 * provider/resolver emits.
 *
 * Works for user-declared AND auto-packages (same schema slot in the preset).
 * Auto-packages still keep their provider-emitted core; overrides are
 * additive — the merge happens in `applyPackageOverride` (core/resolve).
 *
 * UX model: every section is an editable map (or list) with `+` to add a new
 * row and `×` to remove one. Empty maps collapse to "no entries" — the
 * reducer normalizes them away so the URL codec stays minimal.
 */

import type { Preset } from "@create-turbo-stack/schema";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

type PackageOverride = NonNullable<Preset["packageOverrides"]>[string];

// Note: `extraFiles` was previously a tab here. It moved out (alongside an
// `ExtraFilesEditor` that still lives lower in the file but is no longer
// referenced) because file content editing belongs to the upcoming file
// editor, not to this configure-pane override. Existing `extraFiles` data
// stays on disk and continues to materialize — it just isn't editable from
// here anymore. Re-introducing it requires adding "files" back to TabKey.
type TabKey = "deps" | "dev" | "scripts";

export function PackageCustomizeEditor({
  override,
  onChange,
}: {
  override: PackageOverride | undefined;
  onChange: (next: PackageOverride | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("deps");

  const deps = override?.dependencies ?? {};
  const devDeps = override?.devDependencies ?? {};
  const scripts = override?.scripts ?? {};
  const extraFiles = override?.extraFiles ?? [];

  const depCount = Object.keys(deps).length;
  const devCount = Object.keys(devDeps).length;
  const scriptCount = Object.keys(scripts).length;
  const fileCount = extraFiles.length;
  // `fileCount` still feeds the badge so users can SEE that extra files
  // exist on a package — they just can't edit them from this surface yet.
  const overrideCount = depCount + devCount + scriptCount + fileCount;

  /** Patch one field on the override; normalize empty values to `undefined`. */
  function patch(next: Partial<PackageOverride>) {
    const merged: PackageOverride = { ...override, ...next };
    // Strip empties so the resulting override is the smallest accurate shape.
    if (merged.dependencies && Object.keys(merged.dependencies).length === 0) {
      delete merged.dependencies;
    }
    if (
      merged.devDependencies &&
      Object.keys(merged.devDependencies).length === 0
    ) {
      delete merged.devDependencies;
    }
    if (merged.scripts && Object.keys(merged.scripts).length === 0) {
      delete merged.scripts;
    }
    if (merged.extraFiles && merged.extraFiles.length === 0) {
      delete merged.extraFiles;
    }
    onChange(Object.keys(merged).length > 0 ? merged : undefined);
  }

  return (
    <div className="rounded-[3px] border border-fd-border bg-fd-background/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-fd-muted/[0.04]"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wider">
            Customize
          </span>
          {overrideCount > 0 && (
            <span className="rounded-[2px] bg-fd-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-fd-primary">
              {overrideCount}
            </span>
          )}
          {fileCount > 0 && (
            <span
              title={`${fileCount} extra file${fileCount === 1 ? "" : "s"} attached — manage them from the tree.`}
              className="rounded-[2px] bg-fd-muted/15 px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground"
            >
              {fileCount} file{fileCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-fd-muted-foreground">
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <div className="border-fd-border/40 border-t">
          {/* Tab strip — counts double as the "is anything here" cue. */}
          <div className="flex items-stretch border-fd-border/40 border-b">
            <TabButton
              active={tab === "deps"}
              onClick={() => setTab("deps")}
              label="deps"
              count={depCount}
            />
            <TabButton
              active={tab === "dev"}
              onClick={() => setTab("dev")}
              label="dev"
              count={devCount}
            />
            <TabButton
              active={tab === "scripts"}
              onClick={() => setTab("scripts")}
              label="scripts"
              count={scriptCount}
            />
          </div>

          <div className="p-3">
            {tab === "deps" && (
              <KeyValueEditor
                label="Dependencies"
                help="Package name → version spec ('catalog:', 'workspace:*', '^4.0.0', …)."
                placeholderKey="zod"
                placeholderValue="^4.0.0"
                value={deps}
                onChange={(v) => patch({ dependencies: v })}
              />
            )}
            {tab === "dev" && (
              <KeyValueEditor
                label="Dev dependencies"
                help="Same shape as dependencies, but emitted under devDependencies."
                placeholderKey="vitest"
                placeholderValue="^4.0.0"
                value={devDeps}
                onChange={(v) => patch({ devDependencies: v })}
              />
            )}
            {tab === "scripts" && (
              <KeyValueEditor
                label="Scripts"
                help="package.json script entries — script name → command."
                placeholderKey="bench"
                placeholderValue="vitest bench"
                value={scripts}
                onChange={(v) => patch({ scripts: v })}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px flex items-center gap-1.5 border-b px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
        active
          ? "border-fd-primary text-fd-foreground"
          : "border-transparent text-fd-muted-foreground hover:text-fd-foreground",
      )}
    >
      {label}
      {count > 0 && (
        <span
          className={cn(
            "rounded-[2px] px-1 py-0.5 font-mono text-[9px]",
            active
              ? "bg-fd-primary/15 text-fd-primary"
              : "bg-fd-muted/[0.08] text-fd-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Key/value editor (Record<string, string>) ──────────────────────────────

function KeyValueEditor({
  label,
  help,
  placeholderKey,
  placeholderValue,
  value,
  onChange,
}: {
  label: string;
  help: string;
  placeholderKey: string;
  placeholderValue: string;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const entries = Object.entries(value);

  function setKey(oldKey: string, newKey: string) {
    if (newKey === oldKey) return;
    const next: Record<string, string> = {};
    // Preserve order, only swap the changed key.
    for (const [k, v] of entries) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  }

  function setVal(key: string, val: string) {
    onChange({ ...value, [key]: val });
  }

  function remove(key: string) {
    const next = { ...value };
    delete next[key];
    onChange(next);
  }

  function add() {
    // Pick a non-colliding placeholder key so we don't overwrite an existing
    // empty row the user just opened.
    const base = "";
    let n = 1;
    while (value[`${base}${n === 1 ? "" : n}`] !== undefined) n++;
    onChange({ ...value, [`${base}${n === 1 ? "" : n}`]: "" });
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-[2px] border border-fd-border bg-fd-card px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground transition-colors hover:border-fd-primary hover:text-fd-primary"
        >
          <Plus className="h-2.5 w-2.5" />
          add
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-fd-muted-foreground/60 text-xs italic">{help}</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map(([key, val]) => (
            <div
              key={`row-${key}`}
              className="grid grid-cols-[1fr,1fr,auto] gap-1.5"
            >
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(key, e.target.value)}
                placeholder={placeholderKey}
                className="rounded-[3px] border border-fd-border bg-fd-background px-2 py-1 font-mono text-[12px] text-fd-foreground focus:border-fd-primary focus:outline-none"
              />
              <input
                type="text"
                value={val}
                onChange={(e) => setVal(key, e.target.value)}
                placeholder={placeholderValue}
                className="rounded-[3px] border border-fd-border bg-fd-background px-2 py-1 font-mono text-[12px] text-fd-foreground focus:border-fd-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => remove(key)}
                title="Remove"
                className="rounded-[2px] p-1 text-fd-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// `ExtraFilesEditor` and its path-hint table used to live here. They were
// removed when the Customize accordion dropped its FILES tab — adding extra
// files with content belongs to the upcoming file editor, not to this
// configure pane. Re-introducing them requires restoring the editor function
// AND the "files" entry in `TabKey`.
