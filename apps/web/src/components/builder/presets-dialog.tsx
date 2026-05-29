"use client";

import type { Preset } from "@create-turbo-stack/schema";
import { Bookmark, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BUILTIN_PRESETS } from "@/lib/preset/defaults";
import {
  deleteSavedPreset,
  listSavedPresets,
  type SavedPreset,
  saveNamedPreset,
} from "@/lib/preset/saved-presets";
import { useBuilder } from "./builder-provider";

export function PresetsDialog({ onClose }: { onClose: () => void }) {
  const { preset, dispatch, addToast } = useBuilder();
  const [saved, setSaved] = useState<SavedPreset[]>(() => listSavedPresets());
  const [name, setName] = useState("");

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSave() {
    const clean = name.trim();
    if (!clean) return;
    setSaved(saveNamedPreset(clean, preset));
    setName("");
    addToast(`Saved "${clean}"`, "info");
  }

  function load(p: Preset, label: string) {
    dispatch({ type: "LOAD_PRESET", payload: p });
    addToast(`Loaded ${label}`, "info");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close presets"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="relative my-auto w-full max-w-lg rounded-[4px] border border-fd-border bg-fd-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-fd-border border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-fd-primary" />
            <h2 className="font-mono font-semibold text-sm uppercase tracking-wide">
              Presets
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[2px] p-1 text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-5">
          {/* Save current */}
          <div>
            <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-[0.2em]">
              Save current
            </span>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                placeholder="Preset name…"
                maxLength={60}
                className="flex-1 rounded-[3px] border border-fd-border bg-fd-card px-3 py-2 font-mono text-fd-foreground text-sm placeholder:text-fd-muted-foreground/50 focus:border-fd-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!name.trim()}
                className="brutal-hover flex items-center gap-1.5 rounded-[3px] border border-fd-primary bg-fd-primary px-3 py-2 font-medium font-mono text-fd-primary-foreground text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          </div>

          {/* Your presets — distinct treatment, only when some exist */}
          {saved.length > 0 && (
            <div>
              <span className="font-mono text-[11px] text-fd-primary uppercase tracking-[0.2em]">
                Your presets
              </span>
              <ul className="mt-2 space-y-1.5">
                {saved.map((p) => (
                  <li
                    key={p.id}
                    className="group flex items-center gap-2 rounded-[3px] border border-fd-primary/30 bg-fd-primary/[0.05] px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => load(p.preset, p.name)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate font-medium font-mono text-fd-foreground text-sm">
                        {p.name}
                      </div>
                      <div className="font-mono text-[10px] text-fd-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()} ·{" "}
                        {p.preset.apps.length} apps · {p.preset.packages.length}{" "}
                        pkgs
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaved(deleteSavedPreset(p.id))}
                      title="Delete preset"
                      className="rounded-[2px] p-1 text-fd-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Built-in templates */}
          <div>
            <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-[0.2em]">
              Templates
            </span>
            <ul className="mt-2 space-y-1.5">
              {BUILTIN_PRESETS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => load(p.preset, p.name)}
                    className="block w-full rounded-[3px] border border-fd-border bg-fd-card px-3 py-2 text-left transition-colors hover:border-fd-primary hover:bg-fd-primary/[0.06]"
                  >
                    <div className="font-medium font-mono text-sm">
                      {p.name}
                    </div>
                    {p.description && (
                      <div className="text-fd-muted-foreground text-xs">
                        {p.description}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
