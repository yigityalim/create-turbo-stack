"use client";

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
        // Skip auto-packages (typescript-config, env, db, api, auth)
        const autoPackages = ["typescript-config", "env", "db", "api", "auth"];
        if (!autoPackages.includes(pkgName)) {
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
        {root.children.map((child) => (
          <TreeNodeComponent
            key={child.path}
            node={child}
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
          />
        ))}
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
      className="fixed z-50 min-w-[160px] rounded-lg border border-fd-border bg-fd-popover p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100"
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
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left font-mono text-xs transition-colors",
              isDestructive
                ? "text-red-400 hover:bg-red-500/10"
                : "text-fd-foreground hover:bg-fd-accent",
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

// ─── Tree Node ────────────────────────────────────────────────────────────────

function TreeNodeComponent({
  node,
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
}: {
  node: TreeNode;
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
}) {
  const isExpanded = expanded.has(node.path);
  const isSelected = selectedPath === node.path;
  const isAdded = !node.isDirectory && addedPaths?.has(node.path);
  const isContentOnly = !node.isDirectory && contentOnlyMatches?.has(node.path);
  const paddingLeft = depth * 16 + 6;

  // Search filtering: hide non-matching files
  if (
    searchMatchPaths &&
    !node.isDirectory &&
    !searchMatchPaths.has(node.path)
  ) {
    return null;
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
            "group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-fd-muted/20",
            isInteractive && "hover:bg-fd-primary/5",
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
            {node.children.map((child) => (
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
        "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors",
        isSelected
          ? "bg-fd-primary/10 text-fd-primary"
          : isAdded
            ? "bg-green-500/8 text-green-600 dark:text-green-400"
            : "text-fd-foreground hover:bg-fd-muted/15",
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
        <span className="ml-auto shrink-0 rounded bg-green-500/15 px-1 font-mono text-[9px] text-green-600 dark:text-green-400">
          NEW
        </span>
      )}
      {isContentOnly && !isAdded && (
        <span className="ml-auto shrink-0 rounded bg-blue-500/15 px-1 font-mono text-[9px] text-blue-600 dark:text-blue-400">
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
