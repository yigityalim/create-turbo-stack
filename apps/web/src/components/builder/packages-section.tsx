"use client";

import {
  autoPackageNames,
  INTEGRATION_OPTION_CATEGORIES,
  type Integrations,
  integrationPackageName,
  type Package,
} from "@create-turbo-stack/schema";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  Folder,
  FolderOpen,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { PACKAGE_FIELDS } from "@/lib/preset/schema-meta";
import { useBuilder } from "./builder-provider";
import { ProviderIcon } from "./icons";
import { LocationEditor, validateLocation } from "./location-editor";
import { OptionCard } from "./option-card";
import { PackageCustomizeEditor } from "./package-customize-editor";
import { Toggle } from "./toggle";
import { WorkspaceTreeView } from "./workspace-tree-view";

/**
 * Reverse lookup `<auto-package-name> → integrations.* category` for the
 * optional integration categories. Only these auto-packages support a
 * "Disable" affordance — structural ones (typescript-config, env, db, auth,
 * api) are not deactivatable since the engine requires them.
 */
const DISABLEABLE_PKG_TO_CATEGORY = new Map<string, keyof Integrations>(
  INTEGRATION_OPTION_CATEGORIES.map((cat) => [
    integrationPackageName(cat),
    cat as keyof Integrations,
  ]),
);

/**
 * Inverse map auto-package-name → ProviderIcon group / value coords, so the
 * row icon matches the chosen provider rather than a generic puzzle piece.
 * Hand-rolled because the schema's `INTEGRATION_PACKAGE_NAMES` only covers
 * integration categories; the structural builtins (typescript-config, env)
 * use distinct icon groups.
 */
function iconForAutoPackage(
  name: string,
  preset: ReturnType<typeof useBuilder>["preset"],
): { group: string; value: string } | null {
  switch (name) {
    case "typescript-config":
      return { group: "typescript", value: "tsconfig" };
    case "env":
      return { group: "envValidation", value: "t3-env" };
    case "db":
      return { group: "database", value: preset.database.strategy };
    case "api":
      return { group: "api", value: preset.api.strategy };
    case "auth":
      return { group: "auth", value: preset.auth.provider };
    case "monitoring":
      return {
        group: "errorTracking",
        value: preset.integrations.errorTracking,
      };
    case "rate-limit":
      return { group: "rateLimit", value: preset.integrations.rateLimit };
    case "analytics":
    case "email":
    case "ai":
    case "cache":
      return { group: name, value: preset.integrations[name] };
    default:
      return null;
  }
}

type AutoEntry = {
  name: string;
  location: string;
  /** integrations.* key when this auto-package can be disabled, else null. */
  disableableCategory: keyof Integrations | null;
};

/**
 * Group BOTH user packages and auto-packages by their workspace location.
 * Auto-packages take their location from `preset.autoPackageLocations[name]`
 * (default `"packages"`); user packages from `pkg.location`. Inside each
 * group, auto entries come first (alphabetical), then user entries (preset
 * order) — matches the "engine first, your stuff on top" mental model.
 */
function groupByLocation(
  packages: Package[],
  autos: AutoEntry[],
): {
  location: string;
  userEntries: { pkg: Package; originalIndex: number }[];
  autoEntries: AutoEntry[];
}[] {
  const userMap = new Map<string, { pkg: Package; originalIndex: number }[]>();
  for (let i = 0; i < packages.length; i++) {
    const p = packages[i];
    if (!p) continue;
    if (!userMap.has(p.location)) userMap.set(p.location, []);
    // biome-ignore lint/style/noNonNullAssertion: the `has` check above guarantees presence
    userMap.get(p.location)!.push({ pkg: p, originalIndex: i });
  }
  const autoMap = new Map<string, AutoEntry[]>();
  for (const a of autos) {
    if (!autoMap.has(a.location)) autoMap.set(a.location, []);
    // biome-ignore lint/style/noNonNullAssertion: just set above
    autoMap.get(a.location)!.push(a);
  }
  const locations = new Set<string>([...userMap.keys(), ...autoMap.keys()]);
  const sorted = [...locations].sort((a, b) => {
    if (a === "packages") return -1;
    if (b === "packages") return 1;
    return a.localeCompare(b);
  });
  return sorted.map((location) => ({
    location,
    userEntries: userMap.get(location) ?? [],
    autoEntries: (autoMap.get(location) ?? [])
      .slice()
      .sort((x, y) => x.name.localeCompare(y.name)),
  }));
}

export function PackagesSection() {
  const {
    preset,
    dispatch,
    validationErrors,
    pendingAdd,
    clearPendingAdd,
    expandedSection,
    setExpandedSection,
  } = useBuilder();
  // Expansion is keyed by section id (`package-<name>` / `auto-package-<name>`)
  // and lives in BuilderProvider so Preview's "Configure" action can both
  // scroll AND expand in one go, and so the URL deep-links survive refresh.
  const togglePackage = (name: string) => {
    const id = `package-${name}`;
    setExpandedSection(expandedSection === id ? null : id);
  };
  const toggleAutoPackage = (name: string) => {
    const id = `auto-package-${name}`;
    setExpandedSection(expandedSection === id ? null : id);
  };
  // `pendingLocation` is set by the per-group "+" button so the form opens
  // pre-filled with the group's location. `null` means "form closed".
  const [pendingLocation, setPendingLocation] = useState<string | null>(null);
  const [showTree, setShowTree] = useState(false);
  const showAddForm = pendingLocation !== null;
  const openAddForm = (loc = "packages") => setPendingLocation(loc);
  const closeAddForm = () => setPendingLocation(null);

  // Listen for cross-section requests (file-explorer right-click → Add to
  // packages/billing/). When one comes in, open the form pre-filled with the
  // requested location and clear the request so it can fire again later.
  useEffect(() => {
    if (pendingAdd?.kind === "package") {
      setPendingLocation(pendingAdd.location);
      clearPendingAdd();
    }
  }, [pendingAdd, clearPendingAdd]);

  const pkgErrors = validationErrors.filter((e) => e.path[0] === "packages");

  // Auto-packages (engine-generated) are rendered alongside user packages so
  // every workspace member is visible from one place. They take their location
  // from `autoPackageLocations` (default `"packages"`), and integration-backed
  // ones (analytics, monitoring, email, …) expose a Disable button below.
  const autoEntries = useMemo<AutoEntry[]>(() => {
    return autoPackageNames(preset).map((name) => ({
      name,
      location: preset.autoPackageLocations?.[name] ?? "packages",
      disableableCategory: DISABLEABLE_PKG_TO_CATEGORY.get(name) ?? null,
    }));
  }, [preset]);

  const groups = useMemo(
    () => groupByLocation(preset.packages, autoEntries),
    [preset.packages, autoEntries],
  );

  // `count` advertises the TOTAL workspace member count (user + auto) so the
  // header matches the workspace-tree popover. `userCount` is what gates the
  // empty-state copy — the engine always generates ≥ 2 packages (config + env
  // optionally), so the section is never truly "empty" in tree terms.
  const userCount = preset.packages.length;
  const count = userCount + autoEntries.length;

  return (
    <section className="scroll-mt-4">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-[3px] border border-fd-border bg-fd-card text-fd-primary">
              <Boxes className="h-4 w-4" />
            </span>
            <h2 className="font-mono font-semibold text-sm uppercase tracking-wide">
              Packages
            </h2>
            <span className="font-mono text-[11px] text-fd-muted-foreground tabular-nums">
              {count}
            </span>
            {autoEntries.length > 0 && (
              <span
                className="rounded-[2px] bg-fd-muted/15 px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground"
                title={`${userCount} declared + ${autoEntries.length} auto-generated`}
              >
                {userCount}+{autoEntries.length}
              </span>
            )}
          </div>
          <p className="mt-2 text-fd-muted-foreground text-xs leading-relaxed">
            Shared workspace packages — auto-packages are derived from your
            integrations and shown with an{" "}
            <span className="rounded-[2px] bg-fd-primary/10 px-1 font-mono text-[10px] text-fd-primary">
              auto
            </span>{" "}
            badge.
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
          {preset.packages.length === 0 && (
            <button
              type="button"
              onClick={() => openAddForm("packages")}
              className="brutal-hover flex items-center gap-1 rounded-[3px] border border-fd-primary bg-fd-primary/10 px-2.5 py-1.5 font-mono text-[11px] text-fd-primary"
            >
              <Plus className="h-3 w-3" />
              Add Package
            </button>
          )}
        </div>
      </div>

      {showTree && (
        <div className="mb-4">
          <WorkspaceTreeView
            preset={preset}
            kind="packages"
            onClose={() => setShowTree(false)}
          />
        </div>
      )}

      {pkgErrors.length > 0 && (
        <div className="mb-3 rounded-[3px] border border-red-500/20 bg-red-500/10 px-3 py-2">
          {pkgErrors.map((err) => (
            <p key={err.message} className="text-xs text-red-400">
              {err.message}
            </p>
          ))}
        </div>
      )}

      {userCount === 0 && autoEntries.length === 0 && !showAddForm && (
        <p className="py-4 text-center font-mono text-xs text-fd-muted-foreground">
          No packages yet. Pick a database / api / auth strategy in Configure to
          trigger auto-packages, or add a custom one below.
        </p>
      )}

      <PackageGroupedList
        groups={groups}
        expandedSection={expandedSection}
        onToggleUser={togglePackage}
        onToggleAuto={toggleAutoPackage}
        onRequestAdd={openAddForm}
        pendingLocation={pendingLocation}
        renderForm={(forLocation) => (
          <AddPackageForm
            existingNames={preset.packages.map((p) => p.name)}
            initialLocation={forLocation}
            onAdd={(pkg) => {
              dispatch({ type: "ADD_PACKAGE", payload: pkg });
              closeAddForm();
            }}
            onCancel={closeAddForm}
          />
        )}
      />

      {/* Empty-section form (no workspace members at all — sits beneath the
          empty-state message so the action and its target are visible
          together). Rare in practice because auto-packages almost always
          exist; only triggers on a truly bare preset. */}
      {showAddForm && userCount === 0 && autoEntries.length === 0 && (
        <div className="mt-3">
          <AddPackageForm
            existingNames={[]}
            initialLocation={pendingLocation ?? "packages"}
            onAdd={(pkg) => {
              dispatch({ type: "ADD_PACKAGE", payload: pkg });
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

/**
 * Render packages grouped by location with a collapsible folder header per
 * group. When a group has only one location AND that location is the default
 * `packages`, we collapse the header to keep the lone-package view from
 * gaining visual noise — falls back to "looks like before" for the common
 * monorepo where everything lives at `packages/*`.
 */
function PackageGroupedList({
  groups,
  expandedSection,
  onToggleUser,
  onToggleAuto,
  onRequestAdd,
  pendingLocation,
  renderForm,
}: {
  groups: ReturnType<typeof groupByLocation>;
  expandedSection: string | null;
  onToggleUser: (name: string) => void;
  onToggleAuto: (name: string) => void;
  onRequestAdd: (location: string) => void;
  pendingLocation: string | null;
  renderForm: (forLocation: string) => React.ReactNode;
}) {
  const hideFolders = groups.length === 1 && groups[0]?.location === "packages";
  // When pendingLocation points at a brand-new location (not in any existing
  // group), we render a placeholder "ghost group" so the form lives in a
  // labelled container instead of floating at the section level.
  const pendingMatchesExistingGroup =
    pendingLocation != null &&
    groups.some((g) => g.location === pendingLocation);
  const showGhostGroup =
    pendingLocation != null && !pendingMatchesExistingGroup && !hideFolders;

  return (
    <div className="space-y-3">
      {groups.map(({ location, userEntries, autoEntries }) => (
        <PackageGroup
          key={location}
          location={location}
          userEntries={userEntries}
          autoEntries={autoEntries}
          hideHeader={hideFolders}
          expandedSection={expandedSection}
          onToggleUser={onToggleUser}
          onToggleAuto={onToggleAuto}
          onRequestAdd={onRequestAdd}
          // The form belongs to the group whose location matches
          // pendingLocation — that's the only group that should render it.
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
          onClick={() => onRequestAdd("packages")}
          className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-dashed border-fd-border bg-transparent px-3 py-2 font-mono text-[11px] text-fd-muted-foreground transition-colors hover:border-fd-primary hover:bg-fd-primary/[0.04] hover:text-fd-foreground"
        >
          <Plus className="h-3 w-3" />
          Add package
        </button>
      )}
    </div>
  );
}

function PackageGroup({
  location,
  userEntries,
  autoEntries,
  hideHeader,
  expandedSection,
  onToggleUser,
  onToggleAuto,
  onRequestAdd,
  form,
}: {
  location: string;
  userEntries: { pkg: Package; originalIndex: number }[];
  autoEntries: AutoEntry[];
  hideHeader: boolean;
  expandedSection: string | null;
  onToggleUser: (name: string) => void;
  onToggleAuto: (name: string) => void;
  onRequestAdd: (location: string) => void;
  form: React.ReactNode;
}) {
  // Auto-open the group when its form is showing — the user needs to see what
  // they're adding to, and a collapsed folder hiding the new form is wrong.
  const [open, setOpen] = useState(true);
  const effectivelyOpen = open || form !== null;
  const totalCount = userEntries.length + autoEntries.length;

  const autoCards = autoEntries.map((entry) => (
    <div key={`auto-${entry.name}`} data-section={`auto-package-${entry.name}`}>
      <AutoPackageCard
        entry={entry}
        expanded={expandedSection === `auto-package-${entry.name}`}
        onToggle={() => onToggleAuto(entry.name)}
      />
    </div>
  ));
  const userCards = userEntries.map(({ pkg, originalIndex }) => (
    <div key={pkg.name} data-section={`package-${pkg.name}`}>
      <PackageCard
        pkg={pkg}
        index={originalIndex}
        expanded={expandedSection === `package-${pkg.name}`}
        onToggle={() => onToggleUser(pkg.name)}
      />
    </div>
  ));

  if (hideHeader) {
    return (
      <div className="space-y-2">
        {autoCards}
        {userCards}
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
            {totalCount} package{totalCount === 1 ? "" : "s"}
            {autoEntries.length > 0 && userEntries.length > 0 && (
              <span className="ml-1 text-fd-muted-foreground/60">
                ({userEntries.length} declared + {autoEntries.length} auto)
              </span>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onRequestAdd(location)}
          title={`Add package to ${location}/`}
          className="rounded-[2px] p-1 text-fd-muted-foreground transition-colors hover:bg-fd-primary/10 hover:text-fd-primary"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {effectivelyOpen && (
        <div className="space-y-2 border-fd-border/40 border-t bg-fd-card/40 p-2">
          {/* Form sits at the TOP of the group's children — that's where the
              "+" the user just clicked is mentally pointing. */}
          {form}
          {/* Auto-packages first ("engine first"), then user-declared on top. */}
          {autoCards}
          {userCards}
        </div>
      )}
    </div>
  );
}

// ─── Auto Package Card ────────────────────────────────────────────────────────

/**
 * Slim cousin of `PackageCard` for engine-generated packages. Whole row is
 * the accordion trigger; clicking anywhere on it expands/collapses. The
 * inline Disable button (optional integrations only) intentionally stops
 * propagation so the row doesn't toggle alongside the integration flip.
 *
 * Expanded body keeps Location + a slim customize editor (deps / dev /
 * scripts). File content editing is NOT here — that's the upcoming file
 * editor's territory.
 *
 * `type` / `producesCSS` / `exports` editors are absent on purpose: those
 * fields are derived from integration choices and editing them here would
 * confuse the diff.
 */
function AutoPackageCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: AutoEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { preset, dispatch } = useBuilder();
  const icon = useMemo(
    () => iconForAutoPackage(entry.name, preset),
    [entry.name, preset],
  );

  const pkgDir = `${entry.location}/${entry.name}`;

  const handleDisable = (e: React.MouseEvent) => {
    // Stop bubbling so the row-level accordion toggle doesn't fire alongside.
    e.stopPropagation();
    if (!entry.disableableCategory) return;
    dispatch({
      type: "SET_INTEGRATIONS",
      payload: { [entry.disableableCategory]: "none" } as Partial<Integrations>,
    });
  };

  const handleLocationChange = (loc: string) => {
    const next = { ...(preset.autoPackageLocations ?? {}) };
    if (loc === "packages") delete next[entry.name];
    else next[entry.name] = loc;
    dispatch({
      type: "SET_AUTO_PACKAGE_LOCATIONS",
      payload: Object.keys(next).length > 0 ? next : undefined,
    });
  };

  return (
    <div className="rounded-[3px] border border-fd-border bg-fd-card">
      <button
        type="button"
        onClick={onToggle}
        title={expanded ? "Collapse" : "Expand"}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-fd-muted/[0.04]"
      >
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-fd-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-fd-muted-foreground" />
        )}
        {icon && <ProviderIcon group={icon.group} value={icon.value} />}
        <span className="font-mono text-sm font-medium text-fd-foreground">
          {entry.name}
        </span>
        <span
          title="Engine-generated from your integration choices"
          className="rounded-[2px] bg-fd-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-fd-primary"
        >
          auto
        </span>
        {entry.location !== "packages" && (
          <span
            title={`Lives at ${pkgDir}`}
            className="rounded-[2px] bg-fd-muted/15 px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground"
          >
            {entry.location}/
          </span>
        )}
        <span className="flex-1" />
      </button>

      {expanded && (
        <div className="space-y-4 border-fd-border border-t px-4 py-4">
          <LocationEditor
            value={entry.location}
            onChange={handleLocationChange}
            defaultValue="packages"
            nameForPreview={entry.name}
            help="Auto-packages can be relocated like user ones — useful for grouping integration helpers under tooling/, infrastructure/, etc."
          />
          <PackageCustomizeEditor
            override={preset.packageOverrides?.[entry.name]}
            onChange={(next) =>
              dispatch({
                type: "SET_PACKAGE_OVERRIDE",
                name: entry.name,
                payload: next,
              })
            }
          />
        </div>
      )}
    </div>
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
  const { preset, dispatch } = useBuilder();

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
            {pkg.name}
          </span>
          <span className="rounded-[2px] bg-fd-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground">
            {pkg.type}
          </span>
          {pkg.location !== "packages" && (
            <span
              title={`Lives at ${pkg.location}/${pkg.name}`}
              className="rounded-[2px] bg-fd-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-fd-primary"
            >
              {pkg.location}/
            </span>
          )}
          {pkg.producesCSS && (
            <span className="rounded-[2px] bg-fd-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-fd-primary">
              CSS
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "REMOVE_PACKAGE", index })}
          className="rounded-[2px] p-1 text-fd-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="space-y-5 border-fd-border border-t px-4 py-4">
          {/* Type */}
          <div>
            <p className="mb-2 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wider">
              Package type
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {PACKAGE_FIELDS.type.options?.map((opt) => (
                <OptionCard
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={pkg.type === opt.value}
                  icon={
                    PACKAGE_FIELDS.type.group ? (
                      <ProviderIcon
                        group={PACKAGE_FIELDS.type.group}
                        value={opt.value}
                      />
                    ) : null
                  }
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

          {/* Location (workspace glob) */}
          <LocationEditor
            value={pkg.location}
            onChange={(loc) =>
              dispatch({
                type: "UPDATE_PACKAGE",
                index,
                payload: { location: loc },
              })
            }
            defaultValue="packages"
            nameForPreview={pkg.name}
            help="Anything other than 'packages' adds a sibling glob to the workspace declaration (e.g. tooling/*, packages/billing/*)."
          />

          {/* Produces CSS — only relevant for UI-shaped packages. A `utils`
              or `config` package doesn't ship styles, so the toggle would
              just be a noisy default-off field. Hide it. */}
          {(pkg.type === "ui" || pkg.type === "react-library") && (
            <div className="flex items-center justify-between gap-3 rounded-[3px] border border-fd-border bg-fd-background px-3 py-2.5">
              <div className="min-w-0">
                <span className="font-mono text-fd-foreground text-sm">
                  Produces CSS
                </span>
                <p className="mt-0.5 text-fd-muted-foreground text-xs leading-relaxed">
                  Wire this package into Tailwind <code>@source</code> so its
                  classes survive purging.
                </p>
              </div>
              <Toggle
                checked={pkg.producesCSS}
                onChange={(v) =>
                  dispatch({
                    type: "UPDATE_PACKAGE",
                    index,
                    payload: { producesCSS: v },
                  })
                }
                label="Produces CSS"
              />
            </div>
          )}

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

          {/* Customize — extra deps, scripts, files on top of the resolver's
              output. Same surface for user-declared and auto-packages. */}
          <PackageCustomizeEditor
            override={preset.packageOverrides?.[pkg.name]}
            onChange={(next) =>
              dispatch({
                type: "SET_PACKAGE_OVERRIDE",
                name: pkg.name,
                payload: next,
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
  initialLocation,
  onAdd,
  onCancel,
}: {
  existingNames: string[];
  initialLocation: string;
  onAdd: (pkg: Package) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Package["type"]>("library");
  const [location, setLocation] = useState(initialLocation);

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
            "w-64 rounded-[3px] border bg-fd-background px-2.5 py-1.5 font-mono text-sm text-fd-foreground focus:outline-none",
            nameError
              ? "border-red-500"
              : "border-fd-border focus:border-fd-primary",
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
              icon={
                PACKAGE_FIELDS.type.group ? (
                  <ProviderIcon
                    group={PACKAGE_FIELDS.type.group}
                    value={opt.value}
                  />
                ) : null
              }
              onClick={() => setType(opt.value as Package["type"])}
            />
          ))}
        </div>
      </div>

      <LocationEditor
        value={location}
        onChange={setLocation}
        defaultValue="packages"
        nameForPreview={name}
        compact
        help="Pick anything other than 'packages' to slot this package under a sibling workspace glob (e.g. tooling, packages/billing)."
      />

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() =>
            onAdd({
              name,
              type,
              location,
              producesCSS: type === "ui",
              exports: ["."],
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
            className="inline-flex items-center gap-1 rounded-[3px] border border-fd-border bg-fd-muted/20 px-2 py-0.5 font-mono text-xs text-fd-foreground"
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
            "w-36 rounded-[3px] border bg-fd-background px-2 py-1 font-mono text-xs text-fd-foreground focus:outline-none",
            addExportError
              ? "border-red-500"
              : "border-fd-border focus:border-fd-primary",
          )}
        />
        <button
          type="button"
          disabled={!newExport || !!addExportError}
          onClick={handleAdd}
          className="rounded-[3px] border border-fd-border bg-fd-muted/20 px-2 py-1 font-mono text-[11px] text-fd-muted-foreground transition-colors hover:border-fd-primary hover:bg-fd-primary/[0.06] hover:text-fd-foreground disabled:opacity-50"
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
