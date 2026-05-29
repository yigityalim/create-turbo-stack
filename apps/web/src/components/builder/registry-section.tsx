"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useBuilder } from "./builder-provider";

type RegistryItem = {
  name: string;
  title?: string;
  description: string;
  categories?: string[];
};

/**
 * Pick ready-made registry packages to include. They're carried in the preset
 * as `registryPackages` and materialized by `cts add` after the project is
 * scaffolded — so they don't appear in the file-tree preview (the preview runs
 * in the browser; `cts add` needs the network and disk).
 */
export function RegistrySection() {
  const { preset, dispatch } = useBuilder();
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const selected = new Set(preset.registryPackages ?? []);

  useEffect(() => {
    let active = true;
    fetch("/r/registry.json")
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(String(res.status))),
      )
      .then((data: { items?: RegistryItem[] }) => {
        if (active) setItems(data.items ?? []);
      })
      .catch(() => active && setError("Could not load the registry."));
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="scroll-mt-4" data-section="registry">
      <div className="mb-3 flex items-center justify-between border-fd-border border-b pb-2">
        <div className="flex items-center gap-2">
          <h2 className="font-mono font-semibold text-fd-foreground text-sm sm:text-base">
            REGISTRY
          </h2>
          <span className="font-mono text-[11px] text-fd-muted-foreground">
            {selected.size} selected
          </span>
        </div>
      </div>

      <p className="mb-3 font-mono text-[11px] text-fd-muted-foreground">
        Ready-made packages added with <code>cts add</code> after scaffolding
        (not shown in the preview).
      </p>

      {error && <p className="py-2 font-mono text-xs text-red-400">{error}</p>}
      {!error && items.length === 0 && (
        <p className="py-4 text-center font-mono text-xs text-fd-muted-foreground">
          Loading…
        </p>
      )}

      <div className="space-y-2">
        {items.map((item) => {
          const isOn = selected.has(item.name);
          return (
            <button
              key={item.name}
              type="button"
              onClick={() =>
                dispatch({
                  type: "TOGGLE_REGISTRY_PACKAGE",
                  payload: item.name,
                })
              }
              className={cn(
                "flex w-full items-start gap-3 rounded-[3px] border px-3 py-2 text-left transition-colors",
                isOn
                  ? "border-fd-primary bg-fd-primary/10"
                  : "border-fd-border bg-fd-muted/10 hover:border-fd-primary hover:bg-fd-primary/[0.06]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border",
                  isOn
                    ? "border-fd-primary bg-fd-primary text-fd-primary-foreground"
                    : "border-fd-border",
                )}
              >
                {isOn && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-fd-foreground">
                    {item.title ?? item.name}
                  </span>
                  {item.categories?.length ? (
                    <span className="font-mono text-[10px] text-fd-muted-foreground">
                      {item.categories.join(" · ")}
                    </span>
                  ) : null}
                </span>
                <span className="block text-xs text-fd-muted-foreground">
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
