"use client";

import type { Package } from "@create-turbo-stack/schema";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { PACKAGE_FIELDS } from "@/lib/preset/schema-meta";
import { useBuilder } from "./builder-provider";
import { OptionCard } from "./option-card";

export function PackagesSection() {
  const { preset, dispatch, validationErrors } = useBuilder();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const pkgErrors = validationErrors.filter((e) => e.path[0] === "packages");

  return (
    <section className="scroll-mt-4">
      <div className="mb-3 flex items-center justify-between border-fd-border border-b pb-2">
        <div className="flex items-center gap-2">
          <h2 className="font-mono font-semibold text-fd-foreground text-sm sm:text-base">
            PACKAGES
          </h2>
          <span className="font-mono text-[11px] text-fd-muted-foreground">
            {preset.packages.length} package
            {preset.packages.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 rounded-md bg-fd-primary/10 px-2 py-1 font-mono text-[11px] text-fd-primary transition-colors hover:bg-fd-primary/20"
        >
          <Plus className="h-3 w-3" />
          Add Package
        </button>
      </div>

      {pkgErrors.length > 0 && (
        <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
          {pkgErrors.map((err) => (
            <p key={err.message} className="text-xs text-red-400">
              {err.message}
            </p>
          ))}
        </div>
      )}

      {preset.packages.length === 0 && !showAddForm && (
        <p className="py-4 text-center font-mono text-xs text-fd-muted-foreground">
          No custom packages yet. Auto-packages (typescript-config, env, db,
          api, auth) are generated automatically.
        </p>
      )}

      <div className="space-y-2">
        {preset.packages.map((pkg, index) => (
          <div key={pkg.name} data-section={`package-${pkg.name}`}>
            <PackageCard
              pkg={pkg}
              index={index}
              expanded={expandedIndex === index}
              onToggle={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
            />
          </div>
        ))}
      </div>

      {showAddForm && (
        <AddPackageForm
          existingNames={preset.packages.map((p) => p.name)}
          onAdd={(pkg) => {
            dispatch({ type: "ADD_PACKAGE", payload: pkg });
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </section>
  );
}

// ─── Package Card ─────────────────────────────────────────────────────────────

function PackageCard({
  pkg,
  index,
  expanded,
  onToggle,
}: {
  pkg: Package;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { dispatch } = useBuilder();

  return (
    <div className="rounded-lg bg-fd-muted/10 ring-1 ring-fd-border/40">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-fd-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-fd-muted-foreground" />
          )}
          <span className="font-mono text-sm font-medium text-fd-foreground">
            {pkg.name}
          </span>
          <span className="rounded bg-fd-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground">
            {pkg.type}
          </span>
          {pkg.producesCSS && (
            <span className="rounded bg-fd-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-fd-primary">
              CSS
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "REMOVE_PACKAGE", index })}
          className="rounded p-1 text-fd-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="border-fd-border/40 border-t px-3 py-3 space-y-3">
          {/* Type */}
          <div>
            <p className="mb-2 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
              Type
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PACKAGE_FIELDS.type.options?.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={pkg.type === opt.value}
                  onClick={() =>
                    dispatch({
                      type: "UPDATE_PACKAGE",
                      index,
                      payload: { type: opt.value as Package["type"] },
                    })
                  }
                />
              ))}
            </div>
          </div>

          {/* Produces CSS */}
          <div className="flex items-center justify-between rounded-lg bg-fd-muted/10 px-3 py-2">
            <span className="font-mono text-sm text-fd-foreground">
              Produces CSS
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={pkg.producesCSS}
              onClick={() =>
                dispatch({
                  type: "UPDATE_PACKAGE",
                  index,
                  payload: { producesCSS: !pkg.producesCSS },
                })
              }
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
                pkg.producesCSS
                  ? "bg-fd-primary/80"
                  : "bg-fd-muted/30 dark:bg-fd-muted/20",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform dark:bg-fd-foreground",
                  pkg.producesCSS ? "translate-x-4" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* Exports */}
          <ExportsEditor
            exports={pkg.exports}
            onChange={(exports) =>
              dispatch({
                type: "UPDATE_PACKAGE",
                index,
                payload: { exports },
              })
            }
          />
        </div>
      )}
    </div>
  );
}

// ─── Add Package Form ─────────────────────────────────────────────────────────

function AddPackageForm({
  existingNames,
  onAdd,
  onCancel,
}: {
  existingNames: string[];
  onAdd: (pkg: Package) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Package["type"]>("library");

  const nameError =
    name.length === 0
      ? null
      : !/^[a-z0-9-]+$/.test(name)
        ? "Lowercase alphanumeric and hyphens only"
        : existingNames.includes(name)
          ? "Name already in use"
          : null;

  const canSubmit = name.length > 0 && !nameError;

  return (
    <div className="mt-3 rounded-lg border border-fd-primary/30 bg-fd-primary/5 p-4 space-y-3">
      <p className="font-mono text-sm font-medium text-fd-foreground">
        Add New Package
      </p>

      <label className="flex flex-col">
        <span className="mb-1 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
          Name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
          placeholder="shared-utils"
          className={cn(
            "w-64 rounded-lg border bg-fd-background px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:outline-none",
            nameError
              ? "border-red-500"
              : "border-fd-border/60 focus:border-fd-primary",
          )}
        />
        {nameError && (
          <span className="mt-1 text-[11px] text-red-400">{nameError}</span>
        )}
      </label>

      <div>
        <p className="mb-2 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
          Type
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PACKAGE_FIELDS.type.options?.map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              description={opt.description}
              selected={type === opt.value}
              onClick={() => setType(opt.value as Package["type"])}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            onAdd({
              name,
              type,
              producesCSS: type === "ui",
              exports: ["."],
            })
          }
          className="rounded-md bg-fd-primary px-3 py-1.5 font-mono text-xs text-fd-primary-foreground transition-colors hover:bg-fd-primary/90 disabled:opacity-50"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-fd-muted/20 px-3 py-1.5 font-mono text-xs text-fd-muted-foreground transition-colors hover:bg-fd-muted/30"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Exports Editor ──────────────────────────────────────────────────────────

function ExportsEditor({
  exports: exportsList,
  onChange,
}: {
  exports: string[];
  onChange: (exports: string[]) => void;
}) {
  const [newExport, setNewExport] = useState("");

  const addExportError =
    newExport.length === 0
      ? null
      : !newExport.startsWith("./")
        ? 'Must start with "./"'
        : exportsList.includes(newExport)
          ? "Already exists"
          : null;

  const handleAdd = () => {
    if (!newExport || addExportError) return;
    onChange([...exportsList, newExport]);
    setNewExport("");
  };

  return (
    <div>
      <p className="mb-2 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
        Export Subpaths
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {exportsList.map((exp) => (
          <span
            key={exp}
            className="inline-flex items-center gap-1 rounded-md bg-fd-muted/20 px-2 py-0.5 font-mono text-xs text-fd-foreground ring-1 ring-fd-border/30"
          >
            {exp}
            {exp !== "." && (
              <button
                type="button"
                onClick={() => onChange(exportsList.filter((e) => e !== exp))}
                className="text-fd-muted-foreground hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newExport}
          onChange={(e) => setNewExport(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="./client"
          className={cn(
            "w-36 rounded-md border bg-fd-background px-2 py-1 font-mono text-xs text-fd-foreground focus:outline-none",
            addExportError
              ? "border-red-500"
              : "border-fd-border/60 focus:border-fd-primary",
          )}
        />
        <button
          type="button"
          disabled={!newExport || !!addExportError}
          onClick={handleAdd}
          className="rounded-md bg-fd-muted/20 px-2 py-1 font-mono text-[11px] text-fd-muted-foreground transition-colors hover:bg-fd-muted/30 disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      {addExportError && (
        <span className="mt-1 block text-[11px] text-red-400">
          {addExportError}
        </span>
      )}
    </div>
  );
}
