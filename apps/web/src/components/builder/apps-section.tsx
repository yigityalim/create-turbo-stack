"use client";

import type { App } from "@create-turbo-stack/schema";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { APP_FIELDS } from "@/lib/preset/schema-meta";
import { useBuilder } from "./builder-provider";
import { OptionCard } from "./option-card";

export function AppsSection() {
  const { preset, dispatch, validationErrors } = useBuilder();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const appErrors = validationErrors.filter((e) => e.path[0] === "apps");

  return (
    <section className="scroll-mt-4">
      <div className="mb-3 flex items-center justify-between border-fd-border border-b pb-2">
        <div className="flex items-center gap-2">
          <h2 className="font-mono font-semibold text-fd-foreground text-sm sm:text-base">
            APPS
          </h2>
          <span className="font-mono text-[11px] text-fd-muted-foreground">
            {preset.apps.length} app{preset.apps.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 rounded-md bg-fd-primary/10 px-2 py-1 font-mono text-[11px] text-fd-primary transition-colors hover:bg-fd-primary/20"
        >
          <Plus className="h-3 w-3" />
          Add App
        </button>
      </div>

      {appErrors.length > 0 && (
        <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
          {appErrors.map((err) => (
            <p key={err.message} className="text-xs text-red-400">
              {err.message}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {preset.apps.map((app, index) => (
          <div key={app.name} data-section={`app-${app.name}`}>
            <AppCard
              app={app}
              index={index}
              expanded={expandedIndex === index}
              onToggle={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
              canRemove={preset.apps.length > 1}
            />
          </div>
        ))}
      </div>

      {showAddForm && (
        <AddAppForm
          existingNames={preset.apps.map((a) => a.name)}
          existingPorts={preset.apps.map((a) => a.port)}
          onAdd={(app) => {
            dispatch({ type: "ADD_APP", payload: app });
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </section>
  );
}

// ─── App Card ─────────────────────────────────────────────────────────────────

function AppCard({
  app,
  index,
  expanded,
  onToggle,
  canRemove,
}: {
  app: App;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  canRemove: boolean;
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
            {app.name}
          </span>
          <span className="rounded bg-fd-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground">
            {app.type}
          </span>
          <span className="font-mono text-[10px] text-fd-muted-foreground">
            :{app.port}
          </span>
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={() => dispatch({ type: "REMOVE_APP", index })}
            className="rounded p-1 text-fd-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-fd-border/40 border-t px-3 py-3 space-y-3">
          {/* App type */}
          <div>
            <p className="mb-2 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
              Type
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {APP_FIELDS.type.options?.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={app.type === opt.value}
                  onClick={() =>
                    dispatch({
                      type: "UPDATE_APP",
                      index,
                      payload: { type: opt.value as App["type"] },
                    })
                  }
                />
              ))}
            </div>
          </div>

          {/* Port */}
          <div>
            <label className="flex flex-col">
              <span className="mb-1 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
                Port
              </span>
              <input
                type="number"
                min={1000}
                max={65535}
                value={app.port}
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_APP",
                    index,
                    payload: { port: Number(e.target.value) },
                  })
                }
                className="w-32 rounded-lg border border-fd-border/60 bg-fd-background px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:border-fd-primary focus:outline-none"
              />
            </label>
          </div>

          {/* i18n */}
          <div className="flex items-center justify-between rounded-lg bg-fd-muted/10 px-3 py-2">
            <span className="font-mono text-sm text-fd-foreground">i18n</span>
            <button
              type="button"
              role="switch"
              aria-checked={app.i18n}
              onClick={() =>
                dispatch({
                  type: "UPDATE_APP",
                  index,
                  payload: { i18n: !app.i18n },
                })
              }
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
                app.i18n
                  ? "bg-fd-primary/80"
                  : "bg-fd-muted/30 dark:bg-fd-muted/20",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform dark:bg-fd-foreground",
                  app.i18n ? "translate-x-4" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* CMS (only for nextjs) */}
          {app.type === "nextjs" && (
            <div>
              <p className="mb-2 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
                CMS
              </p>
              <div className="grid grid-cols-3 gap-2">
                {APP_FIELDS.cms.options?.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={app.cms === opt.value}
                    onClick={() =>
                      dispatch({
                        type: "UPDATE_APP",
                        index,
                        payload: { cms: opt.value as App["cms"] },
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Consumes (package dependencies) */}
          <ConsumesField app={app} index={index} />
        </div>
      )}
    </div>
  );
}

// ─── Consumes Field ───────────────────────────────────────────────────────────

function ConsumesField({ app, index }: { app: App; index: number }) {
  const { preset, dispatch } = useBuilder();

  // Available packages: user packages + auto-packages based on preset config
  const availablePackages = useMemo(() => {
    const pkgs: { name: string; label: string; auto: boolean }[] = [];

    // Auto-packages
    pkgs.push({
      name: "typescript-config",
      label: "typescript-config",
      auto: true,
    });
    if (preset.integrations.envValidation) {
      pkgs.push({ name: "env", label: "env", auto: true });
    }
    if (preset.database.strategy !== "none") {
      pkgs.push({ name: "db", label: "db", auto: true });
    }
    if (preset.api.strategy !== "none") {
      pkgs.push({ name: "api", label: "api", auto: true });
    }
    if (preset.auth.provider !== "none") {
      pkgs.push({ name: "auth", label: "auth", auto: true });
    }

    // User packages
    for (const pkg of preset.packages) {
      pkgs.push({ name: pkg.name, label: pkg.name, auto: false });
    }

    return pkgs;
  }, [preset]);

  function toggleConsume(pkgName: string) {
    const current = app.consumes;
    const next = current.includes(pkgName)
      ? current.filter((c) => c !== pkgName)
      : [...current, pkgName];
    dispatch({ type: "UPDATE_APP", index, payload: { consumes: next } });
  }

  if (availablePackages.length === 0) return null;

  return (
    <div>
      <p className="mb-2 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
        Consumes
      </p>
      <div className="flex flex-wrap gap-1.5">
        {availablePackages.map((pkg) => {
          const isConsumed = app.consumes.includes(pkg.name);
          return (
            <button
              key={pkg.name}
              type="button"
              onClick={() => toggleConsume(pkg.name)}
              className={cn(
                "rounded-md px-2 py-1 font-mono text-[11px] transition-colors ring-1",
                isConsumed
                  ? "bg-fd-primary/10 text-fd-primary ring-fd-primary/30"
                  : "bg-fd-card text-fd-muted-foreground ring-fd-border/30 hover:ring-fd-border/60",
                pkg.auto && "italic",
              )}
            >
              {pkg.auto ? `~${pkg.label}` : pkg.label}
            </button>
          );
        })}
      </div>
      {app.consumes.length > 0 && (
        <p className="mt-1.5 font-mono text-[10px] text-fd-muted-foreground">
          {app.consumes.length} package{app.consumes.length !== 1 ? "s" : ""}{" "}
          consumed
        </p>
      )}
    </div>
  );
}

// ─── Add App Form ─────────────────────────────────────────────────────────────

function AddAppForm({
  existingNames,
  existingPorts,
  onAdd,
  onCancel,
}: {
  existingNames: string[];
  existingPorts: number[];
  onAdd: (app: App) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<App["type"]>("nextjs");
  const [port, setPort] = useState(() => {
    // Find next available port
    let p = 3000;
    while (existingPorts.includes(p)) p += 1000;
    return p;
  });

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
        Add New App
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col">
          <span className="mb-1 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
            Name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            placeholder="api"
            className={cn(
              "rounded-lg border bg-fd-background px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:outline-none",
              nameError
                ? "border-red-500"
                : "border-fd-border/60 focus:border-fd-primary",
            )}
          />
          {nameError && (
            <span className="mt-1 text-[11px] text-red-400">{nameError}</span>
          )}
        </label>

        <label className="flex flex-col">
          <span className="mb-1 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
            Port
          </span>
          <input
            type="number"
            min={1000}
            max={65535}
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            className="rounded-lg border border-fd-border/60 bg-fd-background px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:border-fd-primary focus:outline-none"
          />
        </label>
      </div>

      <div>
        <p className="mb-2 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
          Type
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {APP_FIELDS.type.options?.map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              description={opt.description}
              selected={type === opt.value}
              onClick={() => setType(opt.value as App["type"])}
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
              port,
              i18n: false,
              cms: "none",
              consumes: [],
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
