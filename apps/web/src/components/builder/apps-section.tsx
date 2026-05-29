"use client";

import { type App, autoPackageNames } from "@create-turbo-stack/schema";
import {
  AppWindow,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { APP_FIELDS } from "@/lib/preset/schema-meta";
import { useBuilder } from "./builder-provider";
import { ProviderIcon } from "./icons";
import { LocationEditor, validateLocation } from "./location-editor";
import { OptionCard } from "./option-card";
import { Toggle } from "./toggle";
import { WorkspaceTreeView } from "./workspace-tree-view";

/** Group apps by location — `apps` first, then alphabetical. Mirrors `groupByLocation` in packages-section. */
function groupAppsByLocation(apps: App[]) {
  const map = new Map<string, { app: App; originalIndex: number }[]>();
  for (let i = 0; i < apps.length; i++) {
    const a = apps[i];
    if (!a) continue;
    if (!map.has(a.location)) map.set(a.location, []);
    // biome-ignore lint/style/noNonNullAssertion: just set above
    map.get(a.location)!.push({ app: a, originalIndex: i });
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === "apps") return -1;
      if (b === "apps") return 1;
      return a.localeCompare(b);
    })
    .map(([location, entries]) => ({ location, entries }));
}

export function AppsSection() {
  const {
    preset,
    dispatch,
    validationErrors,
    pendingAdd,
    clearPendingAdd,
    expandedSection,
    setExpandedSection,
  } = useBuilder();
  // Apps expansion shares the lifted-up `expandedSection` so Preview ↔
  // Configure navigation can both scroll AND open the row in one call, and
  // so the URL deep-links survive refresh.
  const toggleApp = (name: string) => {
    const id = `app-${name}`;
    setExpandedSection(expandedSection === id ? null : id);
  };
  // Mirrors PackagesSection — group "+" buttons set this so the form opens
  // pre-filled. `null` ⇒ form closed.
  const [pendingLocation, setPendingLocation] = useState<string | null>(null);
  const [showTree, setShowTree] = useState(false);
  const showAddForm = pendingLocation !== null;
  const openAddForm = (loc = "apps") => setPendingLocation(loc);
  const closeAddForm = () => setPendingLocation(null);

  // Pick up cross-section "Add to <location>" requests (file-explorer right-
  // click). Same shape as PackagesSection's listener.
  useEffect(() => {
    if (pendingAdd?.kind === "app") {
      setPendingLocation(pendingAdd.location);
      clearPendingAdd();
    }
  }, [pendingAdd, clearPendingAdd]);

  const appErrors = validationErrors.filter((e) => e.path[0] === "apps");

  return (
    <section className="scroll-mt-4">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-[3px] border border-fd-border bg-fd-card text-fd-primary">
              <AppWindow className="h-4 w-4" />
            </span>
            <h2 className="font-mono font-semibold text-sm uppercase tracking-wide">
              Apps
            </h2>
            <span className="font-mono text-[11px] text-fd-muted-foreground tabular-nums">
              {preset.apps.length}
            </span>
          </div>
          <p className="mt-2 text-fd-muted-foreground text-xs leading-relaxed">
            Applications in the monorepo — each gets its own port and wiring.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowTree(!showTree)}
            className={cn(
              "flex items-center gap-1 rounded-[3px] border px-2.5 py-1.5 font-mono text-[11px] transition-colors",
              showTree
                ? "border-fd-primary bg-fd-primary/10 text-fd-primary"
                : "border-fd-border bg-fd-card text-fd-muted-foreground hover:border-fd-primary hover:text-fd-foreground",
            )}
            title="View workspace tree"
          >
            <Eye className="h-3 w-3" />
            View
          </button>
          {preset.apps.length === 0 && (
            <button
              type="button"
              onClick={() => openAddForm("apps")}
              className="brutal-hover flex items-center gap-1 rounded-[3px] border border-fd-primary bg-fd-primary/10 px-2.5 py-1.5 font-mono text-[11px] text-fd-primary"
            >
              <Plus className="h-3 w-3" />
              Add App
            </button>
          )}
        </div>
      </div>

      {showTree && (
        <div className="mb-4">
          <WorkspaceTreeView
            preset={preset}
            kind="apps"
            onClose={() => setShowTree(false)}
          />
        </div>
      )}

      {appErrors.length > 0 && (
        <div className="mb-3 rounded-[3px] border border-red-500/20 bg-red-500/10 px-3 py-2">
          {appErrors.map((err) => (
            <p key={err.message} className="text-xs text-red-400">
              {err.message}
            </p>
          ))}
        </div>
      )}

      <AppGroupedList
        groups={useMemo(() => groupAppsByLocation(preset.apps), [preset.apps])}
        expandedSection={expandedSection}
        onToggle={toggleApp}
        canRemove={preset.apps.length > 1}
        onRequestAdd={openAddForm}
        pendingLocation={pendingLocation}
        renderForm={(forLocation) => (
          <AddAppForm
            existingNames={preset.apps.map((a) => a.name)}
            existingPorts={preset.apps.map((a) => a.port)}
            initialLocation={forLocation}
            onAdd={(app) => {
              dispatch({ type: "ADD_APP", payload: app });
              closeAddForm();
            }}
            onCancel={closeAddForm}
          />
        )}
      />

      {/* Empty-section form (no apps yet — schema requires apps.min(1), but
          we still defensively support empty UI state for symmetry). */}
      {showAddForm && preset.apps.length === 0 && (
        <div className="mt-3">
          <AddAppForm
            existingNames={[]}
            existingPorts={[]}
            initialLocation={pendingLocation ?? "apps"}
            onAdd={(app) => {
              dispatch({ type: "ADD_APP", payload: app });
              closeAddForm();
            }}
            onCancel={closeAddForm}
          />
        </div>
      )}
    </section>
  );
}

// ─── Grouped list (collapsible folders per location) ────────────────────────

function AppGroupedList({
  groups,
  expandedSection,
  onToggle,
  canRemove,
  onRequestAdd,
  pendingLocation,
  renderForm,
}: {
  groups: ReturnType<typeof groupAppsByLocation>;
  expandedSection: string | null;
  onToggle: (name: string) => void;
  canRemove: boolean;
  onRequestAdd: (location: string) => void;
  pendingLocation: string | null;
  renderForm: (forLocation: string) => React.ReactNode;
}) {
  const hideFolders = groups.length === 1 && groups[0]?.location === "apps";
  const pendingMatchesExisting =
    pendingLocation != null &&
    groups.some((g) => g.location === pendingLocation);
  const showGhostGroup =
    pendingLocation != null && !pendingMatchesExisting && !hideFolders;

  return (
    <div className="space-y-3">
      {groups.map(({ location, entries }) => (
        <AppGroup
          key={location}
          location={location}
          entries={entries}
          hideHeader={hideFolders}
          expandedSection={expandedSection}
          onToggle={onToggle}
          canRemove={canRemove}
          onRequestAdd={onRequestAdd}
          form={pendingLocation === location ? renderForm(location) : null}
        />
      ))}
      {showGhostGroup && (
        <div className="rounded-[3px] border border-fd-primary border-dashed bg-fd-primary/[0.03] p-2">
          <p className="mb-2 px-1 font-mono text-[11px] text-fd-primary uppercase tracking-wider">
            New workspace · {pendingLocation}/
          </p>
          {renderForm(pendingLocation)}
        </div>
      )}
      {!hideFolders && groups.length > 0 && (
        <button
          type="button"
          onClick={() => onRequestAdd("apps")}
          className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-dashed border-fd-border bg-transparent px-3 py-2 font-mono text-[11px] text-fd-muted-foreground transition-colors hover:border-fd-primary hover:bg-fd-primary/[0.04] hover:text-fd-foreground"
        >
          <Plus className="h-3 w-3" />
          Add app
        </button>
      )}
    </div>
  );
}

function AppGroup({
  location,
  entries,
  hideHeader,
  expandedSection,
  onToggle,
  canRemove,
  onRequestAdd,
  form,
}: {
  location: string;
  entries: { app: App; originalIndex: number }[];
  hideHeader: boolean;
  expandedSection: string | null;
  onToggle: (name: string) => void;
  canRemove: boolean;
  onRequestAdd: (location: string) => void;
  form: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const effectivelyOpen = open || form !== null;

  if (hideHeader) {
    return (
      <div className="space-y-2">
        {entries.map(({ app, originalIndex }) => (
          <div key={app.name} data-section={`app-${app.name}`}>
            <AppCard
              app={app}
              index={originalIndex}
              expanded={expandedSection === `app-${app.name}`}
              onToggle={() => onToggle(app.name)}
              canRemove={canRemove}
            />
          </div>
        ))}
        {form}
        {!form && (
          <button
            type="button"
            onClick={() => onRequestAdd(location)}
            className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-dashed border-fd-border bg-transparent px-3 py-2 font-mono text-[11px] text-fd-muted-foreground transition-colors hover:border-fd-primary hover:bg-fd-primary/[0.04] hover:text-fd-foreground"
          >
            <Plus className="h-3 w-3" />
            Add to {location}/
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[3px] border border-fd-border bg-fd-muted/[0.04]",
        form !== null && "border-fd-primary",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-fd-muted/[0.06]">
        <button
          type="button"
          onClick={() => setOpen(!effectivelyOpen)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {effectivelyOpen ? (
            <ChevronDown className="h-3 w-3 text-fd-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-fd-muted-foreground" />
          )}
          {effectivelyOpen ? (
            <FolderOpen className="h-3.5 w-3.5 text-fd-primary" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-fd-muted-foreground" />
          )}
          <span className="font-mono text-[12px] text-fd-foreground">
            {location}/
          </span>
          <span className="font-mono text-[10px] text-fd-muted-foreground">
            {entries.length} app{entries.length === 1 ? "" : "s"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onRequestAdd(location)}
          title={`Add app to ${location}/`}
          className="rounded-[2px] p-1 text-fd-muted-foreground transition-colors hover:bg-fd-primary/10 hover:text-fd-primary"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {effectivelyOpen && (
        <div className="space-y-2 border-fd-border/40 border-t bg-fd-card/40 p-2">
          {form}
          {entries.map(({ app, originalIndex }) => (
            <div key={app.name} data-section={`app-${app.name}`}>
              <AppCard
                app={app}
                index={originalIndex}
                expanded={expandedSection === `app-${app.name}`}
                onToggle={() => onToggle(app.name)}
                canRemove={canRemove}
              />
            </div>
          ))}
        </div>
      )}
    </div>
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
    <div className="rounded-[3px] border border-fd-border bg-fd-card">
      <div className="flex items-center justify-between px-4 py-2.5">
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
          <span className="rounded-[2px] bg-fd-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground">
            {app.type}
          </span>
          {app.location !== "apps" && (
            <span
              title={`Lives at ${app.location}/${app.name}`}
              className="rounded-[2px] bg-fd-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-fd-primary"
            >
              {app.location}/
            </span>
          )}
          <span className="font-mono text-[10px] text-fd-muted-foreground">
            :{app.port}
          </span>
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={() => dispatch({ type: "REMOVE_APP", index })}
            className="rounded-[2px] p-1 text-fd-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-5 border-fd-border border-t px-4 py-4">
          {/* App type */}
          <div>
            <p className="mb-2 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wider">
              App type
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {APP_FIELDS.type.options?.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={app.type === opt.value}
                  icon={
                    APP_FIELDS.type.group ? (
                      <ProviderIcon
                        group={APP_FIELDS.type.group}
                        value={opt.value}
                      />
                    ) : null
                  }
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

          {/* Location (workspace glob) */}
          <LocationEditor
            value={app.location}
            onChange={(loc) =>
              dispatch({
                type: "UPDATE_APP",
                index,
                payload: { location: loc },
              })
            }
            defaultValue="apps"
            nameForPreview={app.name}
            help="Anything other than 'apps' adds a sibling glob to the workspace declaration (e.g. services/*, demos/*)."
          />

          {/* Port + localization */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col">
              <span className="mb-1.5 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wider">
                Dev port
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
                className="w-full rounded-[3px] border border-fd-border bg-fd-background px-2.5 py-1.5 font-mono text-fd-foreground text-sm focus:border-fd-primary focus:outline-none"
              />
            </label>
            <div className="flex flex-col">
              <span className="mb-1.5 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wider">
                Localization
              </span>
              <div className="flex flex-1 items-center justify-between rounded-[3px] border border-fd-border bg-fd-background px-3 py-1.5">
                <span className="font-mono text-fd-foreground text-sm">
                  i18n
                </span>
                <Toggle
                  checked={app.i18n}
                  onChange={(v) =>
                    dispatch({
                      type: "UPDATE_APP",
                      index,
                      payload: { i18n: v },
                    })
                  }
                  label="i18n"
                />
              </div>
            </div>
          </div>

          {/* Consumes (package dependencies) */}
          <ConsumesField app={app} index={index} />
        </div>
      )}
    </div>
  );
}

// ─── Consumes Field ───────────────────────────────────────────────────────────

/**
 * Packages that `computeWorkspaceRefs` (in @cts/core) adds to an app's
 * package.json automatically when the relevant preset slot is non-"none",
 * regardless of `app.consumes`. Kept in sync by hand because duplicating the
 * tiny rule beats pulling the wiring layer into the browser bundle just for
 * UI affordance.
 *
 *   env  ← integrations.envValidation !== "none"
 *   api  ← api.strategy !== "none"
 *   auth ← auth.provider !== "none"
 */
function implicitlyWiredPackages(
  preset: ReturnType<typeof useBuilder>["preset"],
): Set<string> {
  const set = new Set<string>();
  if (preset.integrations.envValidation !== "none") set.add("env");
  if (preset.api.strategy !== "none") set.add("api");
  if (preset.auth.provider !== "none") set.add("auth");
  return set;
}

function ConsumesField({ app, index }: { app: App; index: number }) {
  const { preset, dispatch } = useBuilder();

  // Auto-packages from schema (single source of truth — same helper the cross-
  // field validator uses) + user-declared packages. Schema-only so no Eta
  // ever reaches the client bundle.
  const availablePackages = useMemo(() => {
    const auto = autoPackageNames(preset).map((name) => ({
      name,
      label: name,
      auto: true,
    }));
    const user = preset.packages.map((p) => ({
      name: p.name,
      label: p.name,
      auto: false,
    }));
    return [...auto, ...user];
  }, [preset]);

  const implicit = useMemo(() => implicitlyWiredPackages(preset), [preset]);

  function toggleConsume(pkgName: string) {
    const current = app.consumes;
    const next = current.includes(pkgName)
      ? current.filter((c) => c !== pkgName)
      : [...current, pkgName];
    dispatch({ type: "UPDATE_APP", index, payload: { consumes: next } });
  }

  if (availablePackages.length === 0) return null;

  // Total packages that will actually land in the emitted package.json:
  // explicit `consumes` ∪ implicit (auto-wired). Matches what the resolver
  // computes so the count agrees with reality on disk.
  const effective = new Set([...app.consumes, ...implicit]);

  return (
    <div>
      <p className="mb-2 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wider">
        Consumes
        <span className="ml-2 text-fd-muted-foreground/60 lowercase tracking-normal">
          ~ = auto-package · dashed = auto-wired (always added)
        </span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {availablePackages.map((pkg) => {
          const isExplicit = app.consumes.includes(pkg.name);
          const isImplicit = implicit.has(pkg.name);
          // Three visual states:
          //   explicit  → solid primary fill (user added it)
          //   implicit  → dashed primary outline (resolver will add it)
          //   neither   → muted card (available but inert)
          return (
            <button
              key={pkg.name}
              type="button"
              onClick={() => toggleConsume(pkg.name)}
              title={
                isImplicit && !isExplicit
                  ? `Auto-wired from integrations; toggling makes it explicit too.`
                  : undefined
              }
              className={cn(
                "rounded-[3px] border px-2 py-1 font-mono text-[11px] transition-colors",
                isExplicit
                  ? "border-fd-primary bg-fd-primary/10 text-fd-primary"
                  : isImplicit
                    ? "border-dashed border-fd-primary/60 bg-fd-primary/[0.04] text-fd-primary/80"
                    : "border-fd-border bg-fd-card text-fd-muted-foreground hover:border-fd-primary hover:bg-fd-primary/[0.06] hover:text-fd-foreground",
                pkg.auto && "italic",
              )}
            >
              {pkg.auto ? `~${pkg.label}` : pkg.label}
            </button>
          );
        })}
      </div>
      {effective.size > 0 && (
        <p className="mt-1.5 font-mono text-[10px] text-fd-muted-foreground">
          {effective.size} package{effective.size !== 1 ? "s" : ""} in
          package.json
          {app.consumes.length !== effective.size && (
            <span className="ml-1 text-fd-muted-foreground/70">
              ({app.consumes.length} explicit +{" "}
              {effective.size - app.consumes.length} auto-wired)
            </span>
          )}
        </p>
      )}
    </div>
  );
}

// ─── Add App Form ─────────────────────────────────────────────────────────────

function AddAppForm({
  existingNames,
  existingPorts,
  initialLocation,
  onAdd,
  onCancel,
}: {
  existingNames: string[];
  existingPorts: number[];
  initialLocation: string;
  onAdd: (app: App) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<App["type"]>("nextjs");
  const [location, setLocation] = useState(initialLocation);
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

  const locationError = validateLocation(location);
  const canSubmit = name.length > 0 && !nameError && !locationError;

  return (
    <div className="mt-3 rounded-[3px] border border-fd-primary bg-fd-primary/5 p-4 space-y-3">
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
              "rounded-[3px] border bg-fd-background px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:outline-none",
              nameError
                ? "border-red-500"
                : "border-fd-border focus:border-fd-primary",
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
            className="rounded-[3px] border border-fd-border bg-fd-background px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:border-fd-primary focus:outline-none"
          />
        </label>
      </div>

      <LocationEditor
        value={location}
        onChange={setLocation}
        defaultValue="apps"
        nameForPreview={name}
        help="Pick anything other than 'apps' to slot this app under a sibling workspace glob (e.g. services, demos)."
      />

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
              icon={
                APP_FIELDS.type.group ? (
                  <ProviderIcon
                    group={APP_FIELDS.type.group}
                    value={opt.value}
                  />
                ) : null
              }
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
              location,
              port,
              i18n: false,
              consumes: [],
            })
          }
          className="rounded-[3px] bg-fd-primary px-3 py-1.5 font-mono text-xs text-fd-primary-foreground transition-colors hover:bg-fd-primary/90 disabled:opacity-50"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[3px] border border-fd-border bg-fd-muted/20 px-3 py-1.5 font-mono text-xs text-fd-muted-foreground transition-colors hover:border-fd-primary hover:bg-fd-primary/[0.06] hover:text-fd-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
