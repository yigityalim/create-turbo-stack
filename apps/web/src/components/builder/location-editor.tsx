"use client";

/**
 * Workspace location text input — used wherever a user can type a
 * `Turborepo workspace glob root`:
 *   - AppCard / PackageCard expanded view (edit existing)
 *   - AddAppForm / AddPackageForm (new entry)
 *   - WorkspaceLayout panel (autoPackageLocations entries)
 *
 * Behaviour:
 *   - Validates the same regex the schema enforces (kebab-case segments
 *     joined by `/`); shows the error inline so the user doesn't have to
 *     watch the global validation panel.
 *   - Renders a live "will live at <location>/<name>" preview so the
 *     consequences of a non-default location are visible immediately.
 *   - `suggestions` populates a `<datalist>` — typing autocompletes from
 *     known workspaces (packages, packages/billing, tooling, …) but a brand
 *     new value still validates and creates a new workspace bucket.
 *   - Treats `value === defaultValue` as "no override" visually but still
 *     stores the explicit value — that way the round-trip with the URL
 *     codec's default-stripping is symmetric.
 */

import { useId, useMemo } from "react";
import { cn } from "@/lib/cn";
import { useBuilder } from "./builder-provider";

const LOCATION_REGEX = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/;

export function validateLocation(value: string): string | null {
  if (value.length === 0) return "Required";
  if (!LOCATION_REGEX.test(value)) {
    return "Kebab-case segments separated by '/' (e.g. 'packages', 'tooling', 'packages/billing')";
  }
  return null;
}

export function LocationEditor({
  value,
  onChange,
  defaultValue,
  nameForPreview,
  help,
  compact,
  suggestions,
}: {
  value: string;
  onChange: (next: string) => void;
  defaultValue: string;
  nameForPreview: string;
  help?: string;
  compact?: boolean;
  /** Override the auto-derived suggestion list. Default behaviour: read every
   *  known location (apps, packages, autoPackageLocations) from the preset. */
  suggestions?: string[];
}) {
  const error = validateLocation(value);
  const isDefault = value === defaultValue;
  const listId = useId();
  const { preset } = useBuilder();
  const options = useMemo(() => {
    // Auto-derived: walk the preset for every workspace location currently
    // in use, so a value the user already typed elsewhere is one keystroke
    // away. Explicit `suggestions` overrides this if the caller passes one.
    const set = new Set<string>(suggestions ?? []);
    if (!suggestions) {
      for (const a of preset.apps) set.add(a.location);
      for (const p of preset.packages) set.add(p.location);
      for (const loc of Object.values(preset.autoPackageLocations ?? {})) {
        set.add(loc);
      }
    }
    // Drop the default — it's already shown as the placeholder.
    return [...set].filter((s) => s && s !== defaultValue).sort();
  }, [suggestions, preset, defaultValue]);

  return (
    <label className="flex flex-col">
      <span className="mb-1 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wider">
        Location
        <span className="ml-2 text-fd-muted-foreground/60 lowercase tracking-normal">
          {isDefault ? "default workspace glob" : "custom workspace glob"}
        </span>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultValue}
        list={options.length > 0 ? listId : undefined}
        className={cn(
          "rounded-[3px] border bg-fd-background px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:outline-none",
          compact ? "w-48" : "w-full",
          error
            ? "border-red-500"
            : isDefault
              ? "border-fd-border focus:border-fd-primary"
              : "border-fd-primary/50 bg-fd-primary/[0.04] focus:border-fd-primary",
        )}
      />
      {options.length > 0 && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
      {error ? (
        <span className="mt-1 text-[11px] text-red-400">{error}</span>
      ) : (
        <span className="mt-1 font-mono text-[10px] text-fd-muted-foreground">
          Lives at{" "}
          <code className="rounded bg-fd-muted/30 px-1 py-px">
            {value}/{nameForPreview || "<name>"}
          </code>
        </span>
      )}
      {help && !error && (
        <span className="mt-1 text-[10px] text-fd-muted-foreground/80 leading-relaxed">
          {help}
        </span>
      )}
    </label>
  );
}
