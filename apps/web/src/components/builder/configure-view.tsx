"use client";

import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { CATEGORIES } from "@/lib/preset/schema-meta";
import { AppsSection } from "./apps-section";
import { useBuilder } from "./builder-provider";
import { ConfigureSection } from "./configure-section";
import { PackagesSection } from "./packages-section";
import { RegistrySection } from "./registry-section";
import { WorkspaceLayoutSection } from "./workspace-layout-section";

// ─── ConfigureView ────────────────────────────────────────────────────────────

export function ConfigureView() {
  const { preset, dispatch, validationErrors, scrollTarget } = useBuilder();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to section (from preview navigation)
  const scrollToSection = useCallback((id: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-section="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-fd-primary/40", "ring-offset-1");
    setTimeout(
      () =>
        el.classList.remove("ring-2", "ring-fd-primary/40", "ring-offset-1"),
      1200,
    );
  }, []);

  useEffect(() => {
    if (scrollTarget) scrollToSection(scrollTarget);
  }, [scrollTarget, scrollToSection]);

  // S — focus filter
  useHotkeys("s", () => searchInputRef.current?.focus(), {
    enableOnFormTags: false,
    preventDefault: true,
  });

  const normalizedQuery = searchQuery.toLowerCase().trim();

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return CATEGORIES;
    return CATEGORIES.filter((cat) => {
      if (cat.label.toLowerCase().includes(normalizedQuery)) return true;
      if (cat.description.toLowerCase().includes(normalizedQuery)) return true;
      if (
        cat.fields?.some((f) => f.label.toLowerCase().includes(normalizedQuery))
      )
        return true;
      if (
        cat.fields?.some((f) =>
          f.options?.some(
            (o) =>
              o.label.toLowerCase().includes(normalizedQuery) ||
              o.value.toLowerCase().includes(normalizedQuery),
          ),
        )
      )
        return true;
      if (cat.variants) {
        for (const fields of Object.values(cat.variants)) {
          if (
            fields.some(
              (f) =>
                f.label.toLowerCase().includes(normalizedQuery) ||
                f.options?.some(
                  (o) =>
                    o.label.toLowerCase().includes(normalizedQuery) ||
                    o.value.toLowerCase().includes(normalizedQuery),
                ),
            )
          )
            return true;
        }
      }
      return false;
    });
  }, [normalizedQuery]);

  const showApps =
    !normalizedQuery ||
    ["apps", "applications", "frontend", "backend"].some((t) =>
      t.includes(normalizedQuery),
    );
  const showPackages =
    !normalizedQuery ||
    ["packages", "libraries", "workspace"].some((t) =>
      t.includes(normalizedQuery),
    );
  const showRegistry =
    !normalizedQuery ||
    ["add-ons", "addons", "registry", "cts add"].some((t) =>
      t.includes(normalizedQuery),
    );

  const noResults =
    normalizedQuery &&
    filteredCategories.length === 0 &&
    !showApps &&
    !showPackages &&
    !showRegistry;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Search bar */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-fd-border border-b bg-fd-background px-4 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-fd-muted-foreground/60" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setSearchQuery("");
              e.currentTarget.blur();
            }
          }}
          placeholder="Filter options…"
          className="flex-1 bg-transparent font-mono text-fd-foreground text-xs placeholder:text-fd-muted-foreground/40 focus:outline-none"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="rounded-[2px] border border-fd-border bg-fd-muted/10 px-1.5 py-0.5 font-mono text-[9px] text-fd-muted-foreground/60">
            S
          </kbd>
        )}
      </div>

      {/* Body: scrollable content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto scroll-smooth"
        >
          <div className="divide-y divide-fd-border/50">
            {filteredCategories.map((category) => (
              <div
                key={category.key}
                data-section={category.key}
                className="px-6 py-7 sm:px-8"
              >
                <ConfigureSection
                  category={category}
                  preset={preset}
                  dispatch={dispatch}
                  errors={validationErrors.filter(
                    (e) => e.path[0] === category.key,
                  )}
                />
              </div>
            ))}

            {showApps && (
              <div data-section="apps" className="px-6 py-7 sm:px-8">
                <AppsSection />
              </div>
            )}

            {showPackages && (
              <div data-section="packages" className="px-6 py-7 sm:px-8">
                <PackagesSection />
              </div>
            )}

            {showPackages && (
              <div
                data-section="workspace-layout"
                className="px-6 py-7 sm:px-8"
              >
                <WorkspaceLayoutSection />
              </div>
            )}

            {showRegistry && (
              <div data-section="addons" className="px-6 py-7 sm:px-8">
                <RegistrySection />
              </div>
            )}

            {noResults && (
              <div className="flex items-center justify-center py-16 text-fd-muted-foreground">
                <p className="font-mono text-sm">
                  No results for "{searchQuery}"
                </p>
              </div>
            )}

            <div className="h-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
