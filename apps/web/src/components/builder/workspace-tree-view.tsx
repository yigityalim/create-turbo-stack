"use client";

/**
 * Workspace tree view — folder-only mini map of where every member lives.
 *
 * Triggered by the "View" button in the Apps / Packages section headers; the
 * goal is to give a quick "what's the shape of my monorepo" answer without
 * scrolling through cards. Files are deliberately omitted — the full file
 * tree already lives in the Preview pane.
 *
 * Sourcing:
 *   - User apps + packages from `preset.apps`/`preset.packages`
 *   - Auto-packages from `autoPackageNames(preset)` (badged "auto")
 *
 * Members are bucketed by their `location` (or `autoPackageLocations[name]`
 * for engine-generated ones). Bucket keys are sorted for stable rendering.
 */

import { autoPackageNames, type Preset } from "@create-turbo-stack/schema";
import { FolderOpen, X } from "lucide-react";
import { useMemo } from "react";

export type WorkspaceTreeKind = "apps" | "packages" | "both";

export function WorkspaceTreeView({
  preset,
  kind,
  onClose,
}: {
  preset: Preset;
  kind: WorkspaceTreeKind;
  onClose: () => void;
}) {
  const buckets = useMemo(() => buildBuckets(preset, kind), [preset, kind]);

  return (
    <div className="rounded-[3px] border border-fd-border bg-fd-background shadow-lg">
      <div className="flex items-center justify-between border-fd-border border-b px-3 py-2">
        <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wider">
          Workspace tree
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[2px] p-1 text-fd-muted-foreground transition-colors hover:bg-fd-muted/20 hover:text-fd-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto p-3">
        {buckets.length === 0 ? (
          <p className="font-mono text-xs text-fd-muted-foreground">
            Nothing to show yet — add a member to see the layout.
          </p>
        ) : (
          <ul className="space-y-2 font-mono text-xs">
            {buckets.map((bucket) => (
              <li key={bucket.location}>
                <div className="flex items-center gap-1.5 text-fd-foreground">
                  <FolderOpen className="h-3.5 w-3.5 text-fd-primary" />
                  <span>{bucket.location}/</span>
                  <span className="text-[10px] text-fd-muted-foreground">
                    ({bucket.entries.length})
                  </span>
                </div>
                <ul className="mt-0.5 ml-4 space-y-0.5 border-fd-border/40 border-l pl-3">
                  {bucket.entries.map((e) => (
                    <li
                      key={`${e.kind}:${e.name}`}
                      className="flex items-center gap-2 py-0.5 text-fd-muted-foreground"
                    >
                      <span className="text-fd-foreground">{e.name}</span>
                      <span className="rounded-[2px] bg-fd-muted/20 px-1 py-px text-[9px]">
                        {e.label}
                      </span>
                      {e.badge && (
                        <span className="rounded-[2px] bg-fd-primary/10 px-1 py-px text-[9px] text-fd-primary">
                          {e.badge}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Bucket builder ─────────────────────────────────────────────────────────

type Entry = {
  kind: "app" | "package" | "auto";
  name: string;
  label: string;
  badge?: string;
};

type Bucket = { location: string; entries: Entry[] };

function buildBuckets(preset: Preset, kind: WorkspaceTreeKind): Bucket[] {
  const map = new Map<string, Entry[]>();

  const pushEntry = (location: string, e: Entry) => {
    if (!map.has(location)) map.set(location, []);
    // biome-ignore lint/style/noNonNullAssertion: just set above
    map.get(location)!.push(e);
  };

  if (kind === "apps" || kind === "both") {
    for (const a of preset.apps) {
      pushEntry(a.location, {
        kind: "app",
        name: a.name,
        label: a.type,
        badge: a.i18n ? "i18n" : undefined,
      });
    }
  }
  if (kind === "packages" || kind === "both") {
    for (const p of preset.packages) {
      pushEntry(p.location, {
        kind: "package",
        name: p.name,
        label: p.type,
        badge: p.producesCSS ? "css" : undefined,
      });
    }
    for (const name of autoPackageNames(preset)) {
      const loc = preset.autoPackageLocations?.[name] ?? "packages";
      pushEntry(loc, {
        kind: "auto",
        name,
        label: "library",
        badge: "auto",
      });
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === "apps") return -1;
      if (b === "apps") return 1;
      if (a === "packages") return -1;
      if (b === "packages") return 1;
      return a.localeCompare(b);
    })
    .map(([location, entries]) => ({
      location,
      entries: entries.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
