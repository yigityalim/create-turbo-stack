"use client";

import type { FileTreeNode } from "@create-turbo-stack/schema";
import {
  ChevronLeft,
  FileCode2,
  FolderTree,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/lib/cn";
import { useBuilder } from "./builder-provider";
import { CodeViewer, CodeViewerEmpty } from "./code-viewer";
import {
  type ContextMenuAction,
  FileExplorer,
  type TreeNode,
} from "./file-explorer";

export function PreviewView() {
  const {
    preset,
    dispatch,
    fileTree,
    isResolving,
    fileTreeError,
    fileCount,
    directoryCount,
    selectedFile,
    setSelectedFile,
    navigateToSection,
    addedPaths,
    removedPaths,
  } = useBuilder();

  const [mobileView, setMobileView] = useState<"tree" | "code">("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleContextAction = (action: ContextMenuAction) => {
    switch (action.type) {
      case "add-app":
        navigateToSection("apps");
        break;
      case "add-package":
        navigateToSection("packages");
        break;
      case "remove-app": {
        const appIndex = preset.apps.findIndex((a) => a.name === action.name);
        if (appIndex >= 0 && preset.apps.length > 1) {
          dispatch({ type: "REMOVE_APP", index: appIndex });
        }
        break;
      }
      case "remove-package": {
        const pkgIndex = preset.packages.findIndex(
          (p) => p.name === action.name,
        );
        if (pkgIndex >= 0) {
          dispatch({ type: "REMOVE_PACKAGE", index: pkgIndex });
        }
        break;
      }
      case "configure-app":
        navigateToSection(`app-${action.name}`);
        break;
      case "configure-package":
        navigateToSection(`package-${action.name}`);
        break;
    }
  };

  // Total estimated size
  const totalSize = useMemo(() => {
    if (!fileTree) return null;
    let bytes = 0;
    for (const node of fileTree.nodes) {
      if (!node.isDirectory && node.content) {
        bytes += new Blob([node.content]).size;
      }
    }
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [fileTree]);

  // Build nested tree from flat nodes (includes IDE-style sort — memoized on fileTree)
  const rootNode = useMemo(() => {
    if (!fileTree) return null;
    return buildTreeFromFlat(fileTree.nodes, fileTree.projectName);
  }, [fileTree]);

  // Find selected file node
  const selectedNode = useMemo(() => {
    if (!fileTree || !selectedFile) return null;
    return (
      fileTree.nodes.find((n) => !n.isDirectory && n.path === selectedFile) ??
      null
    );
  }, [fileTree, selectedFile]);

  // ─── Hotkeys (must be after selectedNode is defined) ─────────────────────────

  // F — toggle search
  useHotkeys(
    "f",
    () => {
      if (showSearch) {
        setShowSearch(false);
        setSearchQuery("");
      } else {
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    },
    { enableOnFormTags: false, preventDefault: true },
  );

  // ESC — close search
  useHotkeys("escape", () => {
    if (showSearch) {
      setShowSearch(false);
      setSearchQuery("");
    }
  });

  // C — copy current file content
  const selectedNodeContent = selectedNode?.content;
  useHotkeys(
    "c",
    () => {
      if (selectedNodeContent) {
        navigator.clipboard.writeText(selectedNodeContent).catch(() => {});
      }
    },
    { enableOnFormTags: false, preventDefault: true },
    [selectedNodeContent],
  );

  if (!fileTree && isResolving) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 rounded border border-fd-border bg-fd-muted/20 px-3 py-2 font-mono text-fd-muted-foreground text-xs">
          <Loader2 className="h-4 w-4 animate-spin" />
          Rendering file tree...
        </div>
      </div>
    );
  }

  if (fileTreeError && !fileTree) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-red-400 text-sm">
          {fileTreeError}
        </p>
      </div>
    );
  }

  if (!rootNode) {
    return (
      <div className="flex h-full items-center justify-center text-fd-muted-foreground">
        <p className="font-mono text-sm">Generating preview...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Stats bar */}
      <div className="flex items-center gap-2 border-fd-border border-b bg-fd-muted/10 px-3 py-2 sm:gap-4">
        {/* Mobile back button */}
        {mobileView === "code" && selectedNode && (
          <button
            type="button"
            onClick={() => setMobileView("tree")}
            className="flex items-center gap-1 rounded px-1 py-0.5 font-mono text-xs text-fd-muted-foreground hover:text-fd-foreground sm:hidden"
          >
            <ChevronLeft className="h-4 w-4" />
            Files
          </button>
        )}
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs text-fd-muted-foreground",
            mobileView === "code" && "hidden sm:flex",
          )}
        >
          <FolderTree className="h-3.5 w-3.5" />
          <span>{directoryCount} folders</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs text-fd-muted-foreground",
            mobileView === "code" && "hidden sm:flex",
          )}
        >
          <FileCode2 className="h-3.5 w-3.5" />
          <span>{fileCount} files</span>
          {totalSize && (
            <span className="text-fd-muted-foreground/60">({totalSize})</span>
          )}
        </div>
        {mobileView === "code" && selectedNode && (
          <span className="truncate font-mono text-xs text-fd-foreground sm:hidden">
            {selectedNode.path.split("/").pop()}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch)
                setTimeout(() => searchInputRef.current?.focus(), 0);
              else setSearchQuery("");
            }}
            className="hidden rounded p-1 text-fd-muted-foreground transition-colors hover:text-fd-foreground sm:block"
            title="Search files (Ctrl+P)"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          {isResolving && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-fd-muted-foreground" />
          )}
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 border-fd-border border-b bg-fd-background px-3 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-fd-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="flex-1 bg-transparent font-mono text-xs text-fd-foreground placeholder:text-fd-muted-foreground/50 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-fd-muted-foreground hover:text-fd-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <kbd className="rounded border border-fd-border/50 bg-fd-muted/10 px-1 font-mono text-[10px] text-fd-muted-foreground">
            ESC
          </kbd>
        </div>
      )}

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <div
          className={cn(
            "shrink-0 overflow-hidden border-fd-border sm:border-r",
            "w-full sm:w-48 md:w-56 lg:w-64",
            mobileView === "code" ? "hidden sm:block" : "block",
          )}
        >
          <FileExplorer
            root={rootNode}
            selectedPath={selectedFile}
            onSelectFile={(node) => {
              setSelectedFile(node.path);
              setMobileView("code");
            }}
            onContextAction={handleContextAction}
            addedPaths={addedPaths}
            removedPaths={removedPaths}
            searchQuery={searchQuery}
          />
        </div>

        {/* Code viewer */}
        <div
          className={cn(
            "flex-1 overflow-hidden bg-fd-background/80",
            mobileView === "tree" ? "hidden sm:block" : "block",
          )}
        >
          {selectedNode ? (
            <CodeViewer
              filePath={selectedNode.path}
              content={selectedNode.content ?? ""}
            />
          ) : (
            <CodeViewerEmpty />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tree builder ─────────────────────────────────────────────────────────────

function buildTreeFromFlat(nodes: FileTreeNode[], rootName: string): TreeNode {
  const root: TreeNode = {
    name: rootName,
    path: "",
    isDirectory: true,
    children: [],
  };

  const dirMap = new Map<string, TreeNode>();
  dirMap.set("", root);

  for (const node of nodes) {
    const parts = node.path.split("/");
    const parentPath = parts.slice(0, -1).join("/");

    // Ensure parent directories exist
    let parent = dirMap.get(parentPath);
    if (!parent) {
      let currentPath = "";
      let currentParent = root;
      for (const part of parts.slice(0, -1)) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        let dir = dirMap.get(currentPath);
        if (!dir) {
          dir = {
            name: part,
            path: currentPath,
            isDirectory: true,
            children: [],
          };
          dirMap.set(currentPath, dir);
          currentParent.children.push(dir);
        }
        currentParent = dir;
      }
      parent = currentParent;
    }

    const treeNode: TreeNode = {
      name: parts[parts.length - 1],
      path: node.path,
      isDirectory: node.isDirectory,
      content: node.content,
      children: [],
    };

    if (node.isDirectory) {
      dirMap.set(node.path, treeNode);
    }

    parent.children.push(treeNode);
  }

  // IDE-style sort: folders first (alphabetical), then files (alphabetical)
  // Special files (dotfiles, config) at the bottom of files
  sortTreeRecursive(root);
  return root;
}

/** IDE-style recursive sort: folders first → alphabetical, files → config last */
function sortTreeRecursive(node: TreeNode) {
  if (node.children.length === 0) return;

  node.children.sort((a, b) => {
    // Directories before files
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    // Both directories: alphabetical
    if (a.isDirectory && b.isDirectory) {
      return a.name.localeCompare(b.name);
    }

    // Both files: special sorting
    const aPriority = getFileSortPriority(a.name);
    const bPriority = getFileSortPriority(b.name);
    if (aPriority !== bPriority) return aPriority - bPriority;

    return a.name.localeCompare(b.name);
  });

  for (const child of node.children) {
    if (child.isDirectory) {
      sortTreeRecursive(child);
    }
  }
}

/** Lower = higher in the list. Source files first, config files last. */
function getFileSortPriority(name: string): number {
  // Source code first
  if (/\.(tsx?|jsx?|vue|svelte)$/.test(name)) return 0;
  // Styles
  if (/\.(css|scss|less)$/.test(name)) return 1;
  // Data/content
  if (/\.(json|yaml|yml|toml|md|mdx)$/.test(name)) return 2;
  // Config dotfiles and rc files last
  if (name.startsWith(".") || name.includes("config")) return 3;
  return 2;
}
