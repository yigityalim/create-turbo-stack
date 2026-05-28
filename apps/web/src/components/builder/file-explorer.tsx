"use client";

import { INTEGRATION_PACKAGE_NAMES } from "@create-turbo-stack/schema";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

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
  | { type: "remove-app"; name: string }
  | { type: "remove-package"; name: string }
  | { type: "configure-app"; name: string }
  | { type: "configure-package"; name: string };

type FileExplorerProps = {
  root: TreeNode;
  selectedPath: string | null;
  onSelectFile: (node: TreeNode) => void;
  onContextAction?: (action: ContextMenuAction) => void;
  addedPaths?: Set<string>;
  removedPaths?: Set<string>;
  searchQuery?: string;
};

export function FileExplorer({
  root,
  selectedPath,
  onSelectFile,
  onContextAction,
  addedPaths,
  removedPaths,
  searchQuery,
}: FileExplorerProps) {
  const initialExpanded = useMemo(() => {
    const set = new Set<string>();
    function walk(node: TreeNode, depth: number) {
      if (depth < 2 && node.isDirectory) {
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
      if (!onContextAction || !node.isDirectory) return;

      const items: {
        label: string;
        icon: React.ElementType;
        action: ContextMenuAction;
      }[] = [];

      // "apps" root folder
      if (node.path === "apps") {
        items.push({
          label: "Add App",
          icon: Plus,
          action: { type: "add-app" },
        });
      }
      // "packages" root folder
      else if (node.path === "packages") {
        items.push({
          label: "Add Package",
          icon: Plus,
          action: { type: "add-package" },
        });
      }
      // Direct child of "apps/" (e.g., "apps/web")
      else if (
        node.path.startsWith("apps/") &&
        node.path.split("/").length === 2
      ) {
        const appName = node.path.split("/")[1];
        items.push(
          {
            label: "Configure",
            icon: Settings,
            action: { type: "configure-app", name: appName },
          },
          {
            label: "Remove",
            icon: Trash2,
            action: { type: "remove-app", name: appName },
          },
        );
      }
      // Direct child of "packages/" (e.g., "packages/ui")
      else if (
        node.path.startsWith("packages/") &&
        node.path.split("/").length === 2
      ) {
        const pkgName = node.path.split("/")[1];
        // Auto-packages (cache, monitoring, db, env, …) are derived from preset
        // selections — they have no standalone identity to configure/remove
        // here. Use the integration prompts instead.
        if (!AUTO_PACKAGE_NAMES.has(pkgName)) {
          items.push(
            {
              label: "Configure",
              icon: Settings,
              action: { type: "configure-package", name: pkgName },
            },
            {
              label: "Remove",
              icon: Trash2,
              action: { type: "remove-package", name: pkgName },
            },
          );
        }
      }

      if (items.length === 0) return;

      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, items });
    },
    [onContextAction],
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
        />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenuPopover
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onSelect={(action) => {
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
          {/* Hint for interactive folders */}
          {isInteractive &&
            (node.path === "apps" || node.path === "packages") && (
              <Plus className="ml-auto h-3 w-3 text-fd-muted-foreground/0 transition-colors group-hover:text-fd-muted-foreground/60" />
            )}
        </button>
        {isExpanded && (
          <div className="space-y-0.5">
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
            className="flex shrink-0 items-center py-1 pr-0.5"
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

// ─── File Icon ────────────────────────────────────────────────────────────────

function FileIcon({ name, isSelected }: { name: string; isSelected: boolean }) {
  const colorClass = isSelected ? "text-fd-primary/70" : getFileIconColor(name);
  return <File className={cn("h-4 w-4 shrink-0", colorClass)} />;
}

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

function getFileIconColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "ts":
    case "tsx":
      return "text-blue-400";
    case "js":
    case "jsx":
      return "text-yellow-400";
    case "json":
      return "text-yellow-600 dark:text-yellow-300";
    case "css":
    case "scss":
      return "text-pink-400";
    case "md":
    case "mdx":
      return "text-gray-400";
    default:
      return "text-fd-muted-foreground";
  }
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
