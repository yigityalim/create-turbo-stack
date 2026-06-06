"use client";

import {
  INTEGRATION_OPTION_CATEGORIES,
  INTEGRATION_PACKAGE_NAMES,
  integrationPackageName,
} from "@create-turbo-stack/schema";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  FolderOpen,
  Plus,
  Power,
  Settings,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { FileIcon } from "./icons";

/**
 * Auto-package names — the two structural builtins plus every integration
 * category's workspace package (db, api, auth, monitoring, rate-limit, cache,
 * …). Derived from the schema's `INTEGRATION_PACKAGE_NAMES` map, so a new
 * integration category appears here without edits.
 */
const AUTO_PACKAGE_NAMES = new Set<string>([
  "typescript-config",
  "env",
  ...Object.values(INTEGRATION_PACKAGE_NAMES),
]);

/**
 * Reverse lookup `<auto-package-name> → integrations.* key` for the optional
 * categories — the only auto-packages where switching to "none" is meaningful
 * (auth/db/api are required, so no "Disable" affordance for those). Derived
 * from `INTEGRATION_OPTION_CATEGORIES` so a new optional integration shows up
 * here without edits.
 */
const DISABLEABLE_PKG_TO_CATEGORY = new Map<string, string>(
  INTEGRATION_OPTION_CATEGORIES.map((cat) => [
    integrationPackageName(cat),
    cat,
  ]),
);

export type TreeNode = {
  name: string;
  path: string;
  isDirectory: boolean;
  content?: string;
  children: TreeNode[];
};

export type ContextMenuAction =
  | { type: "add-app" }
  | { type: "add-package" }
  /**
   * Internal markers: when the user picks "New package/app in <dir>/" from a
   * tree right-click, file-explorer intercepts this and opens a VSCode-style
   * inline input in the tree instead of forwarding to PreviewView. Same
   * pattern for "New file/folder" inside an existing package, which writes
   * to `packageOverrides.extraFiles` for that package. None of these need
   * caller handling — they all stay inside the file-explorer.
   */
  | { type: "_inline-add-package"; location: string }
  | { type: "_inline-add-app"; location: string }
  | {
      type: "_inline-new-file";
      dirPath: string;
      packageName: string;
      relativePath: string;
    }
  | {
      type: "_inline-new-folder";
      dirPath: string;
      packageName: string;
      relativePath: string;
    }
  | { type: "remove-app"; name: string }
  | { type: "remove-package"; name: string }
  | { type: "configure-app"; name: string }
  | { type: "configure-package"; name: string }
  /**
   * Right-click on a file inside a (user or auto) package → jump to its
   * configure card / WorkspaceLayout row with the Customize accordion in
   * focus. The full inline editor lives in the next iteration.
   */
  | { type: "edit-package-file"; name: string }
  /**
   * Disable an integration auto-package by flipping its `integrations.*` slot
   * to "none". Only surfaced for the optional categories (analytics,
   * errorTracking, email, rateLimit, ai, cache); structural ones (auth/db/api)
   * never expose this. The handler dispatches `SET_INTEGRATIONS` which causes
   * the resolver to drop the package on the next build.
   */
  | { type: "disable-auto-package"; name: string; category: string };

type FileExplorerProps = {
  root: TreeNode;
  selectedPath: string | null;
  onSelectFile: (node: TreeNode) => void;
  onContextAction?: (action: ContextMenuAction) => void;
  addedPaths?: Set<string>;
  removedPaths?: Set<string>;
  searchQuery?: string;
  /**
   * Map of workspace-member root directories → kind+name. Schema-driven —
   * the caller (preview-view) derives this from the preset so the explorer
   * doesn't have to guess from path depth. With custom locations a member
   * can live anywhere (`tooling/foo`, `packages/billing/p1`); depth-based
   * detection would either over- or under-match.
   */
  memberPaths?: Map<string, { kind: "app" | "package"; name: string }>;
  /**
   * Top-level "add" target directories — `apps/`, `packages/`, plus any
   * custom collection (`tooling/`, `infrastructure/`, …). Right-clicking
   * one of these surfaces an "Add …" action. Derived by the caller from
   * the same source as `memberPaths`.
   */
  collectionPaths?: Set<string>;
  /**
   * VSCode-style inline creation: when the user right-clicks a workspace
   * collection in the tree, an input row appears inline (no jump to the
   * configure pane). On Enter, this callback fires with `(kind, location,
   * name)` and the caller dispatches the right ADD action with sensible
   * defaults (type, port, exports, …). On Esc / blur the input cancels.
   */
  onTreeCreate?: (
    kind: "app" | "package",
    location: string,
    name: string,
  ) => void;
  /**
   * Append a file to `packageOverrides[<pkgName>].extraFiles`. Used by the
   * tree-inline "New file" / "New folder" right-click actions. `path` is
   * package-relative (no leading slash). For folders, the caller has already
   * suffixed `/.gitkeep` so the directory shows up in the resolved tree.
   */
  onTreeExtraFile?: (packageName: string, path: string) => void;
};

export function FileExplorer({
  root,
  selectedPath,
  onSelectFile,
  onContextAction,
  addedPaths,
  removedPaths,
  searchQuery,
  memberPaths,
  collectionPaths,
  onTreeCreate,
  onTreeExtraFile,
}: FileExplorerProps) {
  // Inline-add state. Covers all four VSCode-style create flows:
  //   - new app at a collection root (apps / services / demos)
  //   - new package at a collection root (packages / tooling / packages/billing)
  //   - new file inside an existing package's directory
  //   - new folder inside an existing package's directory
  // The first two land via `onTreeCreate`; the file/folder forms land via
  // `onTreeExtraFile` which writes a packageOverrides entry.
  const [inlineAdd, setInlineAdd] = useState<
    | { dirPath: string; kind: "app" | "package" }
    | {
        dirPath: string;
        kind: "file" | "folder";
        packageName: string;
        relativePath: string;
      }
    | null
  >(null);

  const onInlineSubmit = useCallback(
    (name: string) => {
      if (!inlineAdd) return;
      // Discriminated dispatch on `kind`. Switch keeps each case body
      // narrowed to a single union arm — the previous OR / else-if form
      // widened back to the full union and lost `packageName` access.
      switch (inlineAdd.kind) {
        case "app":
        case "package":
          if (onTreeCreate) {
            onTreeCreate(inlineAdd.kind, inlineAdd.dirPath, name);
          }
          break;
        case "file":
        case "folder": {
          // Folder = a `.gitkeep` placeholder so the directory shows up in
          // the tree until the user adds real content. File = the literal
          // name the user typed.
          if (onTreeExtraFile) {
            const joinedRel = inlineAdd.relativePath
              ? `${inlineAdd.relativePath}/${name}`
              : name;
            const path =
              inlineAdd.kind === "folder" ? `${joinedRel}/.gitkeep` : joinedRel;
            onTreeExtraFile(inlineAdd.packageName, path);
          }
          break;
        }
      }
      setInlineAdd(null);
    },
    [inlineAdd, onTreeCreate, onTreeExtraFile],
  );
  const onInlineCancel = useCallback(() => setInlineAdd(null), []);
  const initialExpanded = useMemo(() => {
    const set = new Set<string>();
    function walk(node: TreeNode, depth: number) {
      if (depth < 2 && node.isDirectory) {
        // Dotfile-prefixed directories (`.github/`, `.husky/`, `.vscode/`)
        // are tool / metadata folders — auto-collapse so the structural
        // packages and apps catch the user's eye first. They expand on
        // click like any other directory.
        if (depth > 0 && node.name.startsWith(".")) return;
        set.add(node.path);
        for (const child of node.children) {
          walk(child, depth + 1);
        }
      }
    }
    walk(root, 0);
    return set;
  }, [root]);

  const [expanded, setExpanded] = useState(initialExpanded);
  const normalizedQuery = searchQuery?.toLowerCase().trim() ?? "";
  const isSearching = normalizedQuery.length > 0;

  // When searching, compute which paths match (by path or content) and expand all ancestors
  const searchMatchPaths = useMemo(() => {
    if (!isSearching) return null;
    const matches = new Set<string>();
    function walk(node: TreeNode) {
      if (!node.isDirectory) {
        const pathMatch = node.name.toLowerCase().includes(normalizedQuery);
        const contentMatch =
          !pathMatch &&
          node.content != null &&
          node.content.toLowerCase().includes(normalizedQuery);
        if (pathMatch || contentMatch) {
          matches.add(node.path);
        }
      }
      for (const child of node.children) walk(child);
    }
    walk(root);
    return matches;
  }, [root, normalizedQuery, isSearching]);

  // Paths that matched only by content (not by name)
  const contentOnlyMatches = useMemo(() => {
    if (!isSearching || !searchMatchPaths) return null;
    const matched = searchMatchPaths;
    const set = new Set<string>();
    function walk(node: TreeNode) {
      if (
        !node.isDirectory &&
        matched.has(node.path) &&
        !node.name.toLowerCase().includes(normalizedQuery)
      ) {
        set.add(node.path);
      }
      for (const child of node.children) walk(child);
    }
    walk(root);
    return set;
  }, [root, normalizedQuery, isSearching, searchMatchPaths]);

  // Expand all when searching
  const effectiveExpanded = useMemo(() => {
    if (!isSearching || !searchMatchPaths) return expanded;
    const all = new Set<string>();
    function walk(node: TreeNode) {
      if (node.isDirectory) all.add(node.path);
      for (const child of node.children) walk(child);
    }
    walk(root);
    return all;
  }, [root, expanded, isSearching, searchMatchPaths]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: {
      label: string;
      icon: React.ElementType;
      action: ContextMenuAction;
    }[];
  } | null>(null);

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, node: TreeNode) => {
      if (!onContextAction) return;

      const items: {
        label: string;
        icon: React.ElementType;
        action: ContextMenuAction;
      }[] = [];

      // FILE branch — walk parent paths back to the nearest member directory.
      // Both user packages and engine-owned auto-packages get the action; the
      // handler in PreviewView routes to the right Configure / Workspace
      // Layout target based on which kind of package owns the file.
      if (!node.isDirectory) {
        if (memberPaths) {
          const segs = node.path.split("/");
          for (let i = segs.length - 1; i >= 1; i--) {
            const ancestor = segs.slice(0, i).join("/");
            const m = memberPaths.get(ancestor);
            if (m?.kind === "package") {
              const isAuto = AUTO_PACKAGE_NAMES.has(m.name);
              items.push({
                label: isAuto
                  ? `Customize ${m.name} (auto)`
                  : `Edit content in ${m.name}`,
                icon: Settings,
                action: { type: "edit-package-file", name: m.name },
              });
              break;
            }
          }
        }
        if (items.length === 0) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, items });
        return;
      }

      // Walk up the path to find the nearest package this directory belongs
      // to. If found AND the directory isn't the package root itself, we can
      // offer "New file" / "New folder" inside it via packageOverrides.
      // Skip the package-root case because we already surface Configure/
      // Remove (user) or Customize (auto) there, and a "New file" at the
      // package root has the same effect as right-clicking `src/` after.
      let ownerPkg: { name: string; rootPath: string } | null = null;
      if (memberPaths) {
        const segs = node.path.split("/");
        // Start one segment up — we want strictly ancestor packages so the
        // package's own root row gets its existing menu.
        for (let i = segs.length - 1; i >= 1; i--) {
          const ancestor = segs.slice(0, i).join("/");
          const m = memberPaths.get(ancestor);
          if (m?.kind === "package") {
            ownerPkg = { name: m.name, rootPath: ancestor };
            break;
          }
        }
      }

      // Collection root folder ("apps", "packages", "tooling", "services",
      // "packages/billing", …). VSCode-style inline create: clicking surfaces
      // an input row in the tree itself (no redirect to the configure pane).
      // Apps-shaped collections create apps; everything else creates packages.
      const member = memberPaths?.get(node.path);
      const isCollectionRoot = collectionPaths?.has(node.path) ?? false;
      if (isCollectionRoot && onTreeCreate) {
        const isAppsCollection =
          node.path === "apps" ||
          node.path === "services" ||
          node.path === "demos";
        items.push({
          label: isAppsCollection
            ? `New app in ${node.path}/`
            : `New package in ${node.path}/`,
          icon: Plus,
          action: isAppsCollection
            ? { type: "_inline-add-app", location: node.path }
            : { type: "_inline-add-package", location: node.path },
        });
      } else if (ownerPkg && onTreeCreate) {
        // Inside (not at the root of) a known package — offer file/folder
        // creation. The new content lands in
        // `packageOverrides[<pkgName>].extraFiles` with the right relative
        // path; the engine emits it on the next resolveFileTree pass. Same
        // for user packages and auto-packages (engine treats overrides
        // identically), so the UX stays consistent.
        const relativePath = node.path.slice(ownerPkg.rootPath.length + 1);
        items.push(
          {
            label: "New file",
            icon: Plus,
            action: {
              type: "_inline-new-file",
              dirPath: node.path,
              packageName: ownerPkg.name,
              relativePath,
            },
          },
          {
            label: "New folder",
            icon: Plus,
            action: {
              type: "_inline-new-folder",
              dirPath: node.path,
              packageName: ownerPkg.name,
              relativePath,
            },
          },
        );
      } else if (member?.kind === "app") {
        items.push(
          {
            label: "Configure",
            icon: Settings,
            action: { type: "configure-app", name: member.name },
          },
          {
            label: "Remove",
            icon: Trash2,
            action: { type: "remove-app", name: member.name },
          },
        );
      } else if (member?.kind === "package") {
        const isAuto = AUTO_PACKAGE_NAMES.has(member.name);
        if (isAuto) {
          // Auto-packages are engine-owned — no Remove for structural ones
          // (typescript-config, env, db, auth, api). For optional integration
          // packages (analytics, monitoring, email, rate-limit, ai, cache),
          // surface a "Disable" affordance that flips the relevant
          // `integrations.*` slot to "none" — the resolver drops the package
          // on the next build. Customize still works the same way through
          // packageOverrides for both flavours.
          const disableableCategory = DISABLEABLE_PKG_TO_CATEGORY.get(
            member.name,
          );
          items.push(
            {
              label: `Customize ${member.name} (auto)`,
              icon: Settings,
              action: { type: "edit-package-file", name: member.name },
            },
            {
              label: "New file",
              icon: Plus,
              action: {
                type: "_inline-new-file",
                dirPath: node.path,
                packageName: member.name,
                relativePath: "",
              },
            },
            {
              label: "New folder",
              icon: Plus,
              action: {
                type: "_inline-new-folder",
                dirPath: node.path,
                packageName: member.name,
                relativePath: "",
              },
            },
          );
          if (disableableCategory) {
            items.push({
              label: "Disable (set to none)",
              icon: Power,
              action: {
                type: "disable-auto-package",
                name: member.name,
                category: disableableCategory,
              },
            });
          }
        } else {
          items.push(
            {
              label: "Configure",
              icon: Settings,
              action: { type: "configure-package", name: member.name },
            },
            {
              label: "New file",
              icon: Plus,
              action: {
                type: "_inline-new-file",
                dirPath: node.path,
                packageName: member.name,
                relativePath: "",
              },
            },
            {
              label: "New folder",
              icon: Plus,
              action: {
                type: "_inline-new-folder",
                dirPath: node.path,
                packageName: member.name,
                relativePath: "",
              },
            },
            {
              label: "Remove",
              icon: Trash2,
              action: { type: "remove-package", name: member.name },
            },
          );
        }
      }

      if (items.length === 0) return;

      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, items });
    },
    [onContextAction, memberPaths, collectionPaths, onTreeCreate],
  );

  // Close context menu on click outside or scroll
  useEffect(() => {
    if (!contextMenu) return;

    // Delay adding listeners so the current event doesn't immediately close it
    const id = requestAnimationFrame(() => {
      function close() {
        setContextMenu(null);
      }
      window.addEventListener("click", close, { once: true });
      window.addEventListener("scroll", close, { once: true, capture: true });
    });

    return () => cancelAnimationFrame(id);
  }, [contextMenu]);

  return (
    <div className="relative h-full overflow-auto p-3 text-sm">
      <div className="space-y-0.5">
        <ChildList
          items={root.children}
          depth={0}
          expanded={effectiveExpanded}
          toggleExpand={toggleExpand}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          onContextMenu={handleContextMenu}
          addedPaths={addedPaths}
          removedPaths={removedPaths}
          searchMatchPaths={searchMatchPaths}
          contentOnlyMatches={contentOnlyMatches}
          isSearching={isSearching}
          inlineAdd={inlineAdd}
          onInlineSubmit={onInlineSubmit}
          onInlineCancel={onInlineCancel}
          memberPaths={memberPaths}
        />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenuPopover
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onSelect={(action) => {
            // Inline-add actions are handled locally: pop an input row in the
            // tree at the requested location, auto-expand that directory so
            // the input is visible, and don't propagate to the parent. The
            // parent never sees these markers (they're an explorer concern).
            if (
              action.type === "_inline-add-package" ||
              action.type === "_inline-add-app"
            ) {
              const kind: "app" | "package" =
                action.type === "_inline-add-app" ? "app" : "package";
              setInlineAdd({ dirPath: action.location, kind });
              setExpanded((prev) => {
                const next = new Set(prev);
                next.add(action.location);
                return next;
              });
              setContextMenu(null);
              return;
            }
            if (
              action.type === "_inline-new-file" ||
              action.type === "_inline-new-folder"
            ) {
              setInlineAdd({
                dirPath: action.dirPath,
                kind: action.type === "_inline-new-file" ? "file" : "folder",
                packageName: action.packageName,
                relativePath: action.relativePath,
              });
              setExpanded((prev) => {
                const next = new Set(prev);
                next.add(action.dirPath);
                return next;
              });
              setContextMenu(null);
              return;
            }
            onContextAction?.(action);
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Context Menu Popover ─────────────────────────────────────────────────────

function ContextMenuPopover({
  x,
  y,
  items,
  onSelect,
}: {
  x: number;
  y: number;
  items: {
    label: string;
    icon: React.ElementType;
    action: ContextMenuAction;
  }[];
  onSelect: (action: ContextMenuAction) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      x: x + rect.width > vw ? vw - rect.width - 8 : x,
      y: y + rect.height > vh ? vh - rect.height - 8 : y,
    });
  }, [x, y]);

  return (
    <div
      ref={ref}
      role="menu"
      tabIndex={0}
      className="fixed z-50 min-w-[160px] rounded-[3px] border border-fd-border bg-fd-popover p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100"
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.stopPropagation();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isDestructive = item.action.type.startsWith("remove");
        return (
          <button
            key={item.label}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item.action);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-[2px] px-2.5 py-1.5 text-left font-mono text-xs transition-colors",
              isDestructive
                ? "text-red-400 hover:bg-red-500/10"
                : "text-fd-foreground hover:bg-fd-primary/[0.06] hover:text-fd-primary",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Child List (nest dispatcher) ─────────────────────────────────────────────

type SharedNodeProps = {
  depth: number;
  expanded: Set<string>;
  toggleExpand: (path: string) => void;
  selectedPath: string | null;
  onSelectFile: (node: TreeNode) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  addedPaths?: Set<string>;
  removedPaths?: Set<string>;
  searchMatchPaths?: Set<string> | null;
  contentOnlyMatches?: Set<string> | null;
  isSearching: boolean;
  inlineAdd:
    | { dirPath: string; kind: "app" | "package" }
    | {
        dirPath: string;
        kind: "file" | "folder";
        packageName: string;
        relativePath: string;
      }
    | null;
  onInlineSubmit: (name: string) => void;
  onInlineCancel: () => void;
  /** Threaded down so the directory rows can show an "auto" pill on engine-
   *  owned package roots — visual cue that the row isn't user-editable in the
   *  same way (no Remove, but Customize still works). */
  memberPaths?: Map<string, { kind: "app" | "package"; name: string }>;
};

/**
 * Render a directory's children, respecting upstream sort and collapsing
 * VSCode-style file nesting (index.test.ts under index.ts, lockfiles under
 * package.json, …). During search we flatten — nesting would hide matches
 * whose parent doesn't itself match.
 */
function ChildList({
  items,
  ...shared
}: { items: TreeNode[] } & SharedNodeProps) {
  if (shared.isSearching) {
    return (
      <>
        {items.map((child) => (
          <TreeNodeComponent key={child.path} node={child} {...shared} />
        ))}
      </>
    );
  }
  const { dirs, groups } = splitChildren(items);
  return (
    <>
      {dirs.map((dir) => (
        <TreeNodeComponent key={dir.path} node={dir} {...shared} />
      ))}
      {groups.map(({ parent, nested }) => (
        <TreeNodeComponent
          key={parent.path}
          node={parent}
          nestedChildren={nested}
          {...shared}
        />
      ))}
    </>
  );
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

function TreeNodeComponent({
  node,
  nestedChildren,
  depth,
  expanded,
  toggleExpand,
  selectedPath,
  onSelectFile,
  onContextMenu,
  addedPaths,
  removedPaths,
  searchMatchPaths,
  contentOnlyMatches,
  isSearching,
  inlineAdd,
  onInlineSubmit,
  onInlineCancel,
  memberPaths,
}: {
  node: TreeNode;
  /** File-nesting children (e.g. `index.test.ts` under `index.ts`). */
  nestedChildren?: TreeNode[];
} & SharedNodeProps) {
  const isExpanded = expanded.has(node.path);
  const isSelected = selectedPath === node.path;
  const isAdded = !node.isDirectory && addedPaths?.has(node.path);
  const isContentOnly = !node.isDirectory && contentOnlyMatches?.has(node.path);
  const paddingLeft = depth * 16 + 6;
  const hasNested = !node.isDirectory && (nestedChildren?.length ?? 0) > 0;

  // Search filtering: hide non-matching files (unless a nested child matches).
  if (searchMatchPaths && !node.isDirectory) {
    const selfMatches = searchMatchPaths.has(node.path);
    const nestedMatches = nestedChildren?.some((n) =>
      searchMatchPaths.has(n.path),
    );
    if (!selfMatches && !nestedMatches) return null;
  }
  // Hide directories with no matching descendants
  if (searchMatchPaths && node.isDirectory) {
    const hasMatch = hasMatchingDescendant(node, searchMatchPaths);
    if (!hasMatch) return null;
  }

  // Check if this is an interactive folder (apps, packages, or their direct children)
  const isInteractive =
    node.isDirectory &&
    (node.path === "apps" ||
      node.path === "packages" ||
      (node.path.startsWith("apps/") && node.path.split("/").length === 2) ||
      (node.path.startsWith("packages/") && node.path.split("/").length === 2));

  if (node.isDirectory) {
    return (
      <div>
        <button
          type="button"
          onClick={() => toggleExpand(node.path)}
          onContextMenu={(e) => onContextMenu(e, node)}
          className={cn(
            "group flex w-full items-center gap-1.5 rounded-[2px] px-1.5 py-1 text-left transition-colors hover:bg-fd-primary/[0.06] hover:text-fd-foreground",
            isInteractive && "hover:bg-fd-primary/10",
          )}
          style={{ paddingLeft }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-fd-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fd-muted-foreground" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-fd-primary/80" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-fd-primary/60" />
          )}
          <span className="truncate font-mono text-[13px] text-fd-foreground">
            {node.name}
          </span>
          {/* Auto-package marker — engine-owned (db, env, cache, …). Visual
              cue that the row is read-only-feeling but Customize via right-
              click still works. Keeps users from thinking it's a bug when
              Remove isn't there. */}
          {(() => {
            const m = memberPaths?.get(node.path);
            return m?.kind === "package" && AUTO_PACKAGE_NAMES.has(m.name) ? (
              <span className="ml-auto shrink-0 rounded-[2px] bg-fd-primary/15 px-1 py-px font-mono text-[9px] text-fd-primary/70">
                auto
              </span>
            ) : null;
          })()}
          {/* Hint for interactive folders */}
          {isInteractive &&
            (node.path === "apps" || node.path === "packages") && (
              <Plus className="ml-auto h-3 w-3 text-fd-muted-foreground/0 transition-colors group-hover:text-fd-muted-foreground/60" />
            )}
        </button>
        {isExpanded && (
          <div className="space-y-0.5">
            {inlineAdd?.dirPath === node.path && (
              <InlineAddRow
                depth={depth + 1}
                kind={inlineAdd.kind}
                existing={(node.children ?? []).map((c) => c.name)}
                onSubmit={onInlineSubmit}
                onCancel={onInlineCancel}
              />
            )}
            <ChildList
              items={node.children}
              depth={depth + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              onContextMenu={onContextMenu}
              addedPaths={addedPaths}
              removedPaths={removedPaths}
              searchMatchPaths={searchMatchPaths}
              contentOnlyMatches={contentOnlyMatches}
              isSearching={isSearching}
              inlineAdd={inlineAdd}
              onInlineSubmit={onInlineSubmit}
              onInlineCancel={onInlineCancel}
              memberPaths={memberPaths}
            />
          </div>
        )}
      </div>
    );
  }

  // File with nested companions (index.ts → index.test.ts, package.json → bun.lock, …)
  if (hasNested) {
    return (
      <div>
        <div
          className={cn(
            "group flex w-full items-center rounded-[2px] transition-colors",
            isSelected
              ? "bg-fd-primary/10"
              : isAdded
                ? "bg-green-500/8"
                : "hover:bg-fd-primary/[0.06]",
          )}
          style={{ paddingLeft }}
        >
          <button
            type="button"
            onClick={() => toggleExpand(node.path)}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            // pr-1.5 matches the directory's `gap-1.5` between chevron and
            // folder icon, so nested-parent file icons line up vertically
            // with directory icons and chevronless files (paddingLeft+20).
            className="flex shrink-0 items-center py-1 pr-1.5"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-fd-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-fd-muted-foreground" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onSelectFile(node)}
            onContextMenu={(e) => onContextMenu(e, node)}
            // gap-1.5 here matches the directory's gap; chevron pr-1.5 above
            // already provides the spacing so we don't double up.
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-1.5 text-left"
          >
            <FileIcon name={node.name} isSelected={isSelected} />
            <span
              className={cn(
                "truncate font-mono text-[13px]",
                isSelected
                  ? "text-fd-primary"
                  : isAdded
                    ? "text-green-600 dark:text-green-400"
                    : "text-fd-foreground",
              )}
            >
              {node.name}
            </span>
            {isAdded && (
              <span className="ml-auto shrink-0 rounded-[2px] bg-green-500/15 px-1 font-mono text-[9px] text-green-600 dark:text-green-400">
                NEW
              </span>
            )}
            {isContentOnly && !isAdded && (
              <span className="ml-auto shrink-0 rounded-[2px] bg-blue-500/15 px-1 font-mono text-[9px] text-blue-600 dark:text-blue-400">
                CONTENT
              </span>
            )}
          </button>
        </div>
        {isExpanded && nestedChildren && (
          <div className="space-y-0.5">
            {nestedChildren.map((child) => (
              <TreeNodeComponent
                key={child.path}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                toggleExpand={toggleExpand}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
                onContextMenu={onContextMenu}
                addedPaths={addedPaths}
                removedPaths={removedPaths}
                searchMatchPaths={searchMatchPaths}
                contentOnlyMatches={contentOnlyMatches}
                isSearching={isSearching}
                inlineAdd={inlineAdd}
                onInlineSubmit={onInlineSubmit}
                onInlineCancel={onInlineCancel}
                memberPaths={memberPaths}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectFile(node)}
      onContextMenu={(e) => onContextMenu(e, node)}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-[2px] px-1.5 py-1 text-left transition-colors",
        isSelected
          ? "bg-fd-primary/10 text-fd-primary"
          : isAdded
            ? "bg-green-500/8 text-green-600 dark:text-green-400"
            : "text-fd-foreground hover:bg-fd-primary/[0.06]",
      )}
      style={{ paddingLeft: paddingLeft + 20 }}
    >
      <FileIcon name={node.name} isSelected={isSelected} />
      <span
        className={cn(
          "truncate font-mono text-[13px]",
          isSelected
            ? "text-fd-primary"
            : isAdded
              ? "text-green-600 dark:text-green-400"
              : "text-fd-foreground",
        )}
      >
        {node.name}
      </span>
      {isAdded && (
        <span className="ml-auto shrink-0 rounded-[2px] bg-green-500/15 px-1 font-mono text-[9px] text-green-600 dark:text-green-400">
          NEW
        </span>
      )}
      {isContentOnly && !isAdded && (
        <span className="ml-auto shrink-0 rounded-[2px] bg-blue-500/15 px-1 font-mono text-[9px] text-blue-600 dark:text-blue-400">
          CONTENT
        </span>
      )}
    </button>
  );
}

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function hasMatchingDescendant(
  node: TreeNode,
  matchPaths: Set<string>,
): boolean {
  for (const child of node.children) {
    if (!child.isDirectory && matchPaths.has(child.path)) return true;
    if (child.isDirectory && hasMatchingDescendant(child, matchPaths))
      return true;
  }
  return false;
}

// ─── File-Nesting Helpers ─────────────────────────────────────────────────────
//
// Directory sort is owned upstream (`preview-view.tsx` runs an IDE-style sort:
// dirs → source → styles → data → dotfiles). These helpers ONLY collapse
// auxiliary files under their parent (index.test.ts under index.ts,
// package-lock.json under package.json, …) — they preserve upstream order so
// the smart sort isn't clobbered.

const ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;
function escapeRegex(s: string): string {
  return s.replace(ESCAPE_REGEX, "\\$&");
}

/**
 * VSCode-style file nesting rules. When `isNestedChild(parent, child)` is
 * true, `child` collapses under `parent` in the explorer.
 *
 *   `index.ts`      ← `index.{test,spec,bench,stories,d,module}.{ts,tsx,…}`
 *   `package.json`  ← lockfiles + `.npmrc`
 *   `tsconfig.json` ← `tsconfig.*.json`
 *   `.env` / `.env.example` ← every other `.env.*`
 */
function isNestedChild(parentName: string, childName: string): boolean {
  if (parentName === childName) return false;

  // Same-stem auxiliary files: index.test.ts, index.stories.tsx, …
  const dot = parentName.lastIndexOf(".");
  if (dot > 0) {
    const stem = parentName.slice(0, dot);
    const auxRe = new RegExp(
      `^${escapeRegex(stem)}\\.(test|spec|bench|d|stories?|story|module)\\.(ts|tsx|js|jsx|mjs|cjs|css|scss)$`,
    );
    if (auxRe.test(childName)) return true;
  }

  if (parentName === "package.json") {
    return /^(package-lock\.json|pnpm-lock\.yaml|bun\.lock|bun\.lockb|yarn\.lock|\.npmrc)$/.test(
      childName,
    );
  }
  if (parentName === "tsconfig.json") {
    return /^tsconfig\..+\.json$/.test(childName);
  }
  if (parentName.startsWith(".env")) {
    return childName.startsWith(".env.") && childName !== parentName;
  }

  return false;
}

/**
 * For each file pick its best parent (the shortest matching candidate, so
 * `package.json` beats `package-lock.json` when both could claim
 * `.npmrc`). Order-independent: works whatever order the input list is in,
 * which lets us respect upstream sort. Files without a parent are top-level.
 */
function nestFiles(
  files: TreeNode[],
): Array<{ parent: TreeNode; nested: TreeNode[] }> {
  const parentByPath = new Map<string, TreeNode>();
  for (const child of files) {
    let best: TreeNode | undefined;
    for (const candidate of files) {
      if (candidate.path === child.path) continue;
      if (!isNestedChild(candidate.name, child.name)) continue;
      if (!best || candidate.name.length < best.name.length) best = candidate;
    }
    if (best) parentByPath.set(child.path, best);
  }

  const childrenByParentPath = new Map<string, TreeNode[]>();
  for (const child of files) {
    const parent = parentByPath.get(child.path);
    if (!parent) continue;
    const arr = childrenByParentPath.get(parent.path) ?? [];
    arr.push(child);
    childrenByParentPath.set(parent.path, arr);
  }

  // Iterate `files` in input order so upstream's sort decides the top-level
  // ordering; only files that aren't a nested child of another show up here.
  const groups: Array<{ parent: TreeNode; nested: TreeNode[] }> = [];
  for (const file of files) {
    if (parentByPath.has(file.path)) continue;
    groups.push({
      parent: file,
      nested: childrenByParentPath.get(file.path) ?? [],
    });
  }
  return groups;
}

/** Split a directory's children into (dirs, file-groups) preserving upstream order. */
function splitChildren(children: TreeNode[]): {
  dirs: TreeNode[];
  groups: Array<{ parent: TreeNode; nested: TreeNode[] }>;
} {
  const dirs = children.filter((c) => c.isDirectory);
  const files = children.filter((c) => !c.isDirectory);
  return { dirs, groups: nestFiles(files) };
}

// ─── Inline add row (VSCode-style new file/folder prompt) ───────────────────

/**
 * One-line input that appears at the top of a directory when the user picks
 * "New …" from the right-click menu. Auto-focuses, Enter commits with the
 * parent's `onSubmit`, Esc cancels. Empty or duplicate names cancel too.
 * Four kinds use the same row so VSCode-style creation feels uniform:
 *
 *   - `app` / `package` — names are kebab-case (workspace member); icon is
 *     a folder.
 *   - `file` — name accepts a dot-extension (e.g. `README.md`); icon shifts
 *     to a generic file marker.
 *   - `folder` — kebab-case directory name; folder icon.
 */
function InlineAddRow({
  depth,
  kind,
  existing,
  onSubmit,
  onCancel,
}: {
  depth: number;
  kind: "app" | "package" | "file" | "folder";
  existing: string[];
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Focus on mount — single-line VSCode-style.
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const trimmed = value.trim();
  // Files accept dot-extensions and slashes (path-ish: `lib/helper.ts`);
  // packages/apps/folders are kebab-case only. Keeps inputs predictable.
  const isFile = kind === "file";
  const nameRe = isFile ? /^[a-z0-9./_-]+$/ : /^[a-z0-9-]+$/;
  const error =
    trimmed.length === 0
      ? null
      : !nameRe.test(trimmed)
        ? isFile
          ? "Lowercase, digits, dots, slashes, hyphens, underscores"
          : "Lowercase, digits, and hyphens only"
        : trimmed.includes("..")
          ? "Path traversal not allowed"
          : existing.includes(trimmed)
            ? "Already exists in this folder"
            : null;
  const canSubmit = trimmed.length > 0 && !error;

  const Icon = isFile ? FileCode2 : Folder;
  const placeholder =
    kind === "app"
      ? "new-app"
      : kind === "package"
        ? "new-package"
        : kind === "folder"
          ? "new-folder"
          : "README.md";

  return (
    <div
      className="flex items-center gap-1.5 rounded-[2px] px-1.5 py-1"
      style={{ paddingLeft: depth * 16 + 6 }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-fd-primary/60" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.toLowerCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (canSubmit) onSubmit(trimmed);
            else onCancel();
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
        onBlur={() => {
          if (!canSubmit) onCancel();
        }}
        placeholder={placeholder}
        className={cn(
          "flex-1 rounded-[2px] border bg-fd-background px-1.5 py-0.5 font-mono text-[12px] text-fd-foreground focus:outline-none",
          error ? "border-red-500" : "border-fd-primary",
        )}
      />
      {error && (
        <span
          className="ml-1 truncate font-mono text-[10px] text-red-400"
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  );
}
