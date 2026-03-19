"use client";

import {
  AlertTriangle,
  FolderTree,
  Info,
  Keyboard,
  Redo2,
  Settings,
  Terminal,
  Undo2,
} from "lucide-react";
import { startTransition, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/lib/cn";
import type { Toast } from "./builder-provider";
import { useBuilder } from "./builder-provider";
import { BuilderSidebar } from "./builder-sidebar";
import { ConfigureView } from "./configure-view";
import { PreviewView } from "./preview-view";

export function BuilderShell() {
  const {
    activeView,
    setActiveView,
    mobileTab,
    setMobileTab,
    undo,
    redo,
    canUndo,
    canRedo,
    toasts,
  } = useBuilder();

  const [showShortcuts, setShowShortcuts] = useState(false);

  // Simple key bindings — only fire when not typing in an input
  const opts = { enableOnFormTags: false as const, preventDefault: true };

  useHotkeys("u", () => undo(), opts);
  useHotkeys("shift+u", () => redo(), opts);
  useHotkeys("1", () => setActiveView("configure"), opts);
  useHotkeys("2", () => setActiveView("preview"), opts);
  useHotkeys("shift+/", () => setShowShortcuts((s) => !s), opts); // ? key
  useHotkeys("escape", () => setShowShortcuts(false));

  return (
    <div className="flex h-[calc(100vh-var(--fd-nav-height,3.5rem))] w-full flex-col overflow-hidden bg-fd-background text-fd-foreground">
      {/* Mobile tab bar */}
      <div className="sticky top-0 z-20 flex items-center gap-2 border-fd-border border-b bg-fd-background/95 px-3 py-2 backdrop-blur-sm sm:hidden">
        <TabGroup>
          <TabButton
            active={mobileTab === "build"}
            onClick={() => setMobileTab("build")}
          >
            <Settings className="h-3 w-3" />
            Build
          </TabButton>
          <TabButton
            active={mobileTab === "preview"}
            onClick={() => setMobileTab("preview")}
          >
            <FolderTree className="h-3 w-3" />
            Preview
          </TabButton>
        </TabGroup>
      </div>

      {/* Desktop: sidebar + main */}
      <div className="hidden h-full flex-1 grid-cols-[24rem_minmax(0,1fr)] overflow-hidden sm:grid">
        <BuilderSidebar />

        <section className="flex min-h-0 flex-col overflow-hidden">
          {/* View toggle + undo/redo */}
          <div className="sticky top-0 z-10 flex items-center gap-2 border-fd-border border-b bg-fd-background px-3 py-2">
            <TabGroup>
              <TabButton
                active={activeView === "configure"}
                onClick={() =>
                  startTransition(() => setActiveView("configure"))
                }
              >
                <Terminal className="h-3 w-3" />
                Configure
              </TabButton>
              <TabButton
                active={activeView === "preview"}
                onClick={() => startTransition(() => setActiveView("preview"))}
              >
                <FolderTree className="h-3 w-3" />
                Preview
              </TabButton>
            </TabGroup>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className="rounded p-1 text-fd-muted-foreground transition-colors hover:text-fd-foreground disabled:opacity-30"
                title="Undo (U)"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                className="rounded p-1 text-fd-muted-foreground transition-colors hover:text-fd-foreground disabled:opacity-30"
                title="Redo (Shift+U)"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
              <div className="mx-1 h-4 w-px bg-fd-border/40" />
              <button
                type="button"
                onClick={() => setShowShortcuts((s) => !s)}
                className="rounded p-1 text-fd-muted-foreground transition-colors hover:text-fd-foreground"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {activeView === "configure" ? <ConfigureView /> : <PreviewView />}
        </section>
      </div>

      {/* Mobile: full-screen tabs */}
      <div className="flex flex-1 flex-col overflow-hidden sm:hidden">
        {mobileTab === "build" ? <ConfigureView /> : <PreviewView />}
      </div>

      {/* Toast notifications */}
      {toasts.length > 0 && <ToastContainer toasts={toasts} />}

      {/* Shortcuts overlay */}
      {showShortcuts && (
        <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}

// ─── Toast Container ─────────────────────────────────────────────────────────

const TOAST_ICONS: Record<Toast["type"], React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertTriangle,
};

const TOAST_STYLES: Record<Toast["type"], string> = {
  info: "border-fd-border bg-fd-background text-fd-foreground",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  error: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
};

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = TOAST_ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom-2 fade-in duration-200",
              TOAST_STYLES[toast.type],
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono text-xs">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shortcuts Overlay ────────────────────────────────────────────────────────

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: "1", description: "Configure view" },
    { key: "2", description: "Preview view" },
    { key: "S", description: "Search options (in configure)" },
    { key: "F", description: "Search files (in preview)" },
    { key: "C", description: "Copy current file code" },
    { key: "U", description: "Undo" },
    { key: "⇧ U", description: "Redo" },
    { key: "?", description: "Toggle this help" },
    { key: "ESC", description: "Close overlay / search" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-xl border border-fd-border bg-fd-background p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-mono text-sm font-semibold text-fd-foreground">
            Keyboard Shortcuts
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-0.5 font-mono text-[11px] text-fd-muted-foreground hover:text-fd-foreground"
          >
            ESC
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-fd-muted-foreground">
                {s.description}
              </span>
              <kbd className="rounded border border-fd-border/60 bg-fd-muted/15 px-2 py-0.5 font-mono text-xs text-fd-foreground">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shared tab primitives ────────────────────────────────────────────────────

function TabGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-fd-muted/20 p-1">
      {children}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors",
        active
          ? "bg-fd-primary/12 text-fd-primary"
          : "text-fd-muted-foreground hover:bg-fd-muted/30",
      )}
    >
      {children}
    </button>
  );
}
