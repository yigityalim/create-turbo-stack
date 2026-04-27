"use client";

import type { FileTree, Preset } from "@create-turbo-stack/schema";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolveTreeAction } from "../actions/resolve-tree";

export type FileDiffStatus = "added" | "removed" | "unchanged";

export type UseFileTreeReturn = {
  fileTree: FileTree | null;
  isResolving: boolean;
  error: string | null;
  fileCount: number;
  directoryCount: number;
  /** Paths of files added since last tree */
  addedPaths: Set<string>;
  /** Paths of files removed since last tree */
  removedPaths: Set<string>;
};

export function useFileTree(preset: Preset): UseFileTreeReturn {
  const [fileTree, setFileTree] = useState<FileTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [addedPaths, setAddedPaths] = useState<Set<string>>(new Set());
  const [removedPaths, setRemovedPaths] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevPathsRef = useRef<Set<string>>(new Set());
  const abortRef = useRef(0);

  const presetJson = JSON.stringify(preset);

  // biome-ignore lint/correctness/useExhaustiveDependencies: presetJson is a stable string serialization of preset — using preset directly causes infinite re-renders
  useEffect(() => {
    setIsResolving(true);
    clearTimeout(timerRef.current);

    const callId = ++abortRef.current;

    timerRef.current = setTimeout(async () => {
      try {
        const result = await resolveTreeAction(preset);

        // Stale response — a newer call was made
        if (callId !== abortRef.current) return;

        if (result.error) {
          setError(result.error);
          return;
        }

        const tree = result.tree!;
        const newPaths = new Set(
          tree.nodes.filter((n) => !n.isDirectory).map((n) => n.path),
        );
        const prevPaths = prevPathsRef.current;

        if (prevPaths.size > 0) {
          const added = new Set<string>();
          const removed = new Set<string>();
          for (const p of newPaths) {
            if (!prevPaths.has(p)) added.add(p);
          }
          for (const p of prevPaths) {
            if (!newPaths.has(p)) removed.add(p);
          }
          setAddedPaths(added);
          setRemovedPaths(removed);

          // Clear diff indicators after 8 seconds
          if (added.size > 0 || removed.size > 0) {
            setTimeout(() => {
              setAddedPaths(new Set());
              setRemovedPaths(new Set());
            }, 8000);
          }
        }

        prevPathsRef.current = newPaths;
        setFileTree(tree);
        setError(null);
      } catch (err) {
        if (callId !== abortRef.current) return;
        const msg =
          err instanceof Error ? err.message : "Failed to resolve file tree";
        setError(msg);
        console.error("[useFileTree]", err);
      } finally {
        if (callId === abortRef.current) {
          setIsResolving(false);
        }
      }
    }, 150);

    return () => clearTimeout(timerRef.current);
  }, [presetJson]);

  const { fileCount, directoryCount } = useMemo(() => {
    if (!fileTree) return { fileCount: 0, directoryCount: 0 };

    const dirs = new Set<string>();
    let files = 0;

    for (const node of fileTree.nodes) {
      if (node.isDirectory) {
        dirs.add(node.path);
      } else {
        files++;
        const parts = node.path.split("/");
        for (let i = 1; i < parts.length; i++) {
          dirs.add(parts.slice(0, i).join("/"));
        }
      }
    }

    return { fileCount: files, directoryCount: dirs.size };
  }, [fileTree]);

  return {
    fileTree,
    isResolving,
    error,
    fileCount,
    directoryCount,
    addedPaths,
    removedPaths,
  };
}
