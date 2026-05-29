"use client";

/**
 * Workspace Layout — the only place to relocate engine-generated packages
 * (typescript-config, env, db, api, auth, analytics, monitoring, …).
 *
 * UX shape: collapsed accordion by default. With 9-11 auto-packages possible,
 * keeping it open would push the rest of the configure view off-screen for
 * users who never relocate anything (the common case). Expanded view caps at
 * max-h-96 with inner scroll so even a fully-loaded preset doesn't take over
 * the layout.
 */

import { autoPackageNames } from "@create-turbo-stack/schema";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import { useState } from "react";
import { useBuilder } from "./builder-provider";
import { ProviderIcon } from "./icons";
import { LocationEditor } from "./location-editor";

export function WorkspaceLayoutSection() {
  const { preset, dispatch } = useBuilder();
  const names = autoPackageNames(preset);
  // Default closed — most users never relocate auto-packages, so an open
  // accordion just pushes Apps / Packages off-screen for no reason. Open it
  // automatically when at least one auto-package is already relocated, since
  // the user clearly cares.
  const hasOverrides =
    Object.keys(preset.autoPackageLocations ?? {}).length > 0;
  const [open, setOpen] = useState(hasOverrides);

  function setLocation(name: string, value: string) {
    const next = { ...(preset.autoPackageLocations ?? {}) };
    if (value === "packages") {
      // Default — store-by-omission so the URL codec strips it cleanly.
      delete next[name];
    } else {
      next[name] = value;
    }
    dispatch({
      type: "SET_AUTO_PACKAGE_LOCATIONS",
      payload: Object.keys(next).length > 0 ? next : undefined,
    });
  }

  const overrideCount = Object.keys(preset.autoPackageLocations ?? {}).length;

  return (
    <section className="scroll-mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-2.5 rounded-[3px] border border-fd-border bg-fd-card/60 px-3 py-2.5 text-left transition-colors hover:bg-fd-card"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[3px] border border-fd-border bg-fd-background text-fd-primary">
          <Layers className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-mono font-semibold text-sm uppercase tracking-wide">
              Workspace Layout
            </h2>
            {overrideCount > 0 && (
              <span className="rounded-[2px] bg-fd-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-fd-primary">
                {overrideCount} relocated
              </span>
            )}
          </div>
          <p className="mt-1 text-fd-muted-foreground text-xs leading-relaxed">
            Move engine-generated packages into different workspace globs.
          </p>
        </div>
        {open ? (
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-fd-muted-foreground" />
        ) : (
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-fd-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="mt-2 max-h-96 space-y-2 overflow-y-auto rounded-[3px] border border-fd-border bg-fd-background p-3">
          {names.map((name) => {
            const current = preset.autoPackageLocations?.[name] ?? "packages";
            const iconGroup = categoryFromAutoPackageName(name);
            const iconValue = iconValueForCategory(iconGroup, preset);
            return (
              <div
                key={name}
                data-section={`auto-package-${name}`}
                className="grid grid-cols-1 gap-3 rounded-[3px] border border-fd-border bg-fd-card p-3 sm:grid-cols-[1fr,2fr] sm:items-center"
              >
                <div className="flex items-center gap-2">
                  {iconGroup && iconValue ? (
                    <ProviderIcon group={iconGroup} value={iconValue} />
                  ) : null}
                  <span className="font-mono text-sm text-fd-foreground">
                    {name}
                  </span>
                  <span className="rounded-[2px] bg-fd-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground">
                    auto
                  </span>
                </div>
                <LocationEditor
                  value={current}
                  onChange={(v) => setLocation(name, v)}
                  defaultValue="packages"
                  nameForPreview={name}
                  compact
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/**
 * Map an auto-package NAME back to the `PROVIDER_ICONS` group key. The schema
 * does the reverse mapping (`integrationPackageName(category)`); we hand-code
 * the inverse here because it's a tiny table and adding a runtime helper for
 * one consumer is overkill. Update if you add a new auto-package category.
 */
function categoryFromAutoPackageName(name: string): string | null {
  switch (name) {
    case "db":
      return "database";
    case "api":
      return "api";
    case "auth":
      return "auth";
    case "monitoring":
      return "errorTracking";
    case "rate-limit":
      return "rateLimit";
    case "analytics":
    case "email":
    case "ai":
    case "cache":
      return name;
    default:
      return null;
  }
}

function iconValueForCategory(
  category: string | null,
  preset: ReturnType<typeof useBuilder>["preset"],
): string | null {
  if (!category) return null;
  switch (category) {
    case "database":
      return preset.database.strategy;
    case "api":
      return preset.api.strategy;
    case "auth":
      return preset.auth.provider;
    case "analytics":
    case "errorTracking":
    case "email":
    case "rateLimit":
    case "ai":
    case "cache":
      // biome-ignore lint/suspicious/noExplicitAny: dynamic schema key lookup
      return (preset.integrations as any)[category] ?? null;
    default:
      return null;
  }
}
