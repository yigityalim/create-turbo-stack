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
import {
  pushExpandedSectionToURL,
  pushSelectedFileToURL,
  readExpandedSectionFromURL,
  readSelectedFileFromURL,
} from "@/lib/preset/serialization";

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

  /**
   * The currently-expanded section id — matches a `data-section` attribute
   * (`package-ui`, `auto-package-cache`, `app-web`, …). Lifted up here so
   * Preview's "Configure" action can both scroll AND open the accordion in
   * one go, and so the value round-trips through the URL (`?s=…`) for
   * deep-linking. Section components read it to decide which row to
   * unfold, and call the setter when the user toggles a row by hand.
   */
  expandedSection: string | null;
  setExpandedSection: (id: string | null) => void;

  /**
   * Cross-section request to open an add form pre-filled with a workspace
   * location. Set by the file-explorer's right-click → "Add to packages/billing"
   * action; consumed by `PackagesSection` / `AppsSection`'s `useEffect` which
   * opens its form, then clears the request so the same action can fire again.
   */
  pendingAdd: { kind: "app" | "package"; location: string } | null;
  requestAdd: (kind: "app" | "package", location: string) => void;
  clearPendingAdd: () => void;
};

const BuilderContext = createContext<BuilderContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BuilderProvider({ children }: { children: ReactNode }) {
  const builder = usePresetBuilder();
  const tree = useFileTree(builder.preset);

  const [activeView, setActiveView] = useState<"configure" | "preview">(
    "configure",
  );
  // Hydrate from URL on first paint — refresh reopens the same file. After
  // hydration, every `setSelectedFile` also pushes to the URL via the wrapper
  // we expose in the context value (further down).
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const selectedFileHydrated = useRef(false);
  useEffect(() => {
    if (selectedFileHydrated.current) return;
    selectedFileHydrated.current = true;
    const fromURL = readSelectedFileFromURL();
    if (fromURL) {
      setSelectedFile(fromURL);
      // Open the preview pane on hydration so the user lands on the file
      // they had open — otherwise they refresh and see the configure pane.
      setActiveView("preview");
    }
  }, []);
  const [mobileTab, setMobileTab] = useState<"build" | "preview">("build");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  // Expanded section — hydrate from URL on first paint (deep-link support),
  // then keep URL in sync on every change via `setExpandedSection`.
  const [expandedSection, setExpandedSectionState] = useState<string | null>(
    null,
  );
  const expandedSectionHydrated = useRef(false);
  useEffect(() => {
    if (expandedSectionHydrated.current) return;
    expandedSectionHydrated.current = true;
    const fromURL = readExpandedSectionFromURL();
    if (fromURL) setExpandedSectionState(fromURL);
  }, []);
  const setExpandedSection = useCallback((id: string | null) => {
    setExpandedSectionState(id);
    pushExpandedSectionToURL(id);
  }, []);

  const navigateToSection = useCallback(
    (sectionId: string) => {
      setActiveView("configure");
      setMobileTab("build");
      // Set scroll target — ConfigureView will pick it up and scroll
      setScrollTarget(sectionId);
      // Clear after a tick so it can be re-triggered
      setTimeout(() => setScrollTarget(null), 500);
      // Section ids that belong to expandable accordion rows also expand
      // the row — same id round-trips between scroll, expand, and URL.
      if (
        sectionId.startsWith("package-") ||
        sectionId.startsWith("auto-package-") ||
        sectionId.startsWith("app-")
      ) {
        setExpandedSection(sectionId);
      }
    },
    [setExpandedSection],
  );

  const [pendingAdd, setPendingAdd] = useState<{
    kind: "app" | "package";
    location: string;
  } | null>(null);
  const requestAdd = useCallback(
    (kind: "app" | "package", location: string) => {
      // Take the user to the configure pane so the form they're about to see
      // isn't behind the preview tab.
      setActiveView("configure");
      setMobileTab("build");
      setScrollTarget(kind === "app" ? "apps" : "packages");
      setTimeout(() => setScrollTarget(null), 500);
      setPendingAdd({ kind, location });
    },
    [],
  );
  const clearPendingAdd = useCallback(() => setPendingAdd(null), []);

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
      // Mirror into the URL so refresh restores the same file. `null` clears
      // the param. Failures are swallowed inside the helper — non-critical.
      pushSelectedFileToURL(path);
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
    expandedSection,
    setExpandedSection,
    pendingAdd,
    requestAdd,
    clearPendingAdd,
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
