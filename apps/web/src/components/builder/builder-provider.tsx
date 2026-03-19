"use client";

import type { FileTree, Preset } from "@create-turbo-stack/schema";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFileTree } from "@/lib/hooks/use-file-tree";
import {
  usePresetBuilder,
  type ValidationError,
} from "@/lib/hooks/use-preset-builder";
import type { EventBus } from "@/lib/preset/events";
import type { PresetAction } from "@/lib/preset/reducer";

// ─── Toast ────────────────────────────────────────────────────────────────────

export type Toast = {
  id: string;
  message: string;
  type: "info" | "warning" | "error";
};

// ─── Context Shape ────────────────────────────────────────────────────────────

type BuilderContextValue = {
  preset: Preset;
  dispatch: (action: PresetAction) => void;
  validationErrors: ValidationError[];
  isValid: boolean;
  eventBus: EventBus;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  fileTree: FileTree | null;
  isResolving: boolean;
  fileTreeError: string | null;
  fileCount: number;
  directoryCount: number;
  addedPaths: Set<string>;
  removedPaths: Set<string>;

  activeView: "configure" | "preview";
  setActiveView: (view: "configure" | "preview") => void;
  selectedFile: string | null;
  setSelectedFile: (path: string | null) => void;
  mobileTab: "build" | "preview";
  setMobileTab: (tab: "build" | "preview") => void;

  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;

  scrollTarget: string | null;
  navigateToSection: (sectionId: string) => void;
};

const BuilderContext = createContext<BuilderContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BuilderProvider({ children }: { children: ReactNode }) {
  const builder = usePresetBuilder();
  const tree = useFileTree(builder.preset);

  const [activeView, setActiveView] = useState<"configure" | "preview">(
    "configure",
  );
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"build" | "preview">("build");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  const navigateToSection = useCallback((sectionId: string) => {
    setActiveView("configure");
    setMobileTab("build");
    // Set scroll target — ConfigureView will pick it up and scroll
    setScrollTarget(sectionId);
    // Clear after a tick so it can be re-triggered
    setTimeout(() => setScrollTarget(null), 500);
  }, []);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = String(++toastIdRef.current);
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  // Show toast when preset is loaded from a source
  useEffect(() => {
    const messages: Record<string, string> = {
      url: "Loaded preset from URL",
      storage: "Restored from browser storage",
      builtin: "Loaded built-in preset",
      file: "Imported preset from file",
    };

    const unsubscribe = builder.eventBus.on("preset:load", ({ source }) => {
      const msg = messages[source];
      if (msg) {
        addToast(msg, "info");
      }
    });

    return unsubscribe;
  }, [builder.eventBus, addToast]);

  // Emit toast on validation errors
  const prevErrorCountRef = useRef(0);
  useEffect(() => {
    const count = builder.validationErrors.length;
    if (count > 0 && count !== prevErrorCountRef.current) {
      addToast(
        count === 1
          ? builder.validationErrors[0].message
          : `${count} validation issues`,
        "warning",
      );
    }
    prevErrorCountRef.current = count;
  }, [builder.validationErrors, addToast]);

  const value: BuilderContextValue = {
    preset: builder.preset,
    dispatch: builder.dispatch,
    validationErrors: builder.validationErrors,
    isValid: builder.isValid,
    eventBus: builder.eventBus,
    undo: builder.undo,
    redo: builder.redo,
    canUndo: builder.canUndo,
    canRedo: builder.canRedo,

    fileTree: tree.fileTree,
    isResolving: tree.isResolving,
    fileTreeError: tree.error,
    fileCount: tree.fileCount,
    directoryCount: tree.directoryCount,
    addedPaths: tree.addedPaths,
    removedPaths: tree.removedPaths,

    activeView,
    setActiveView,
    selectedFile,
    setSelectedFile: (path) => {
      setSelectedFile(path);
      if (path) {
        builder.eventBus.emit("preview:file-select", { path });
      }
    },
    mobileTab,
    setMobileTab,
    toasts,
    addToast,

    scrollTarget,
    navigateToSection,
  };

  return <BuilderContext value={value}>{children}</BuilderContext>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBuilder() {
  const ctx = useContext(BuilderContext);
  if (!ctx) {
    throw new Error("useBuilder must be used within <BuilderProvider>");
  }
  return ctx;
}
