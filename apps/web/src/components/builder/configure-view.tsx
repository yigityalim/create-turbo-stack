"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { CATEGORIES } from "@/lib/preset/schema-meta";
import { AppsSection } from "./apps-section";
import { useBuilder } from "./builder-provider";
import { ConfigureSection } from "./configure-section";
import { PackagesSection } from "./packages-section";
import { RegistrySection } from "./registry-section";
import { WorkspaceLayoutSection } from "./workspace-layout-section";

export function ConfigureView() {
  const { preset, dispatch, validationErrors, scrollTarget } = useBuilder();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to section when navigating from preview
  useEffect(() => {
    if (!scrollTarget || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current.querySelector(
      `[data-section="${scrollTarget}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Flash highlight
      el.classList.add("ring-2", "ring-fd-primary/50");
      setTimeout(
        () => el.classList.remove("ring-2", "ring-fd-primary/50"),
        1500,
      );
    }
  }, [scrollTarget]);

  // S — focus the options filter (it's always visible)
  useHotkeys("s", () => searchInputRef.current?.focus(), {
    enableOnFormTags: false,
    preventDefault: true,
  });

  const normalizedQuery = searchQuery.toLowerCase().trim();

  // Filter categories and their fields by search query
  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return CATEGORIES;
    return CATEGORIES.filter((cat) => {
      // Category name/description match
      if (cat.label.toLowerCase().includes(normalizedQuery)) return true;
      if (cat.description.toLowerCase().includes(normalizedQuery)) return true;
      // Field label match
      if (
        cat.fields?.some((f) => f.label.toLowerCase().includes(normalizedQuery))
      )
        return true;
      // Option label/value match
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
      // Variant fields match
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
    "apps".includes(normalizedQuery) ||
    "applications".includes(normalizedQuery);
  const showPackages =
    !normalizedQuery ||
    "packages".includes(normalizedQuery) ||
    "libraries".includes(normalizedQuery);
  const showRegistry = !normalizedQuery || "registry".includes(normalizedQuery);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Always-on options filter — distinct from the preview's file search */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-fd-border border-b bg-fd-background px-4 py-2.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-fd-muted-foreground" />
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
          className="flex-1 bg-transparent font-mono text-fd-foreground text-xs placeholder:text-fd-muted-foreground/50 focus:outline-none"
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
          <kbd className="rounded-[2px] border border-fd-border bg-fd-muted/10 px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground">
            S
          </kbd>
        )}
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto scroll-smooth"
      >
        <div className="mx-auto max-w-5xl space-y-10 p-6 sm:p-8">
          {filteredCategories.map((category) => (
            <ConfigureSection
              key={category.key}
              category={category}
              preset={preset}
              dispatch={dispatch}
              errors={validationErrors.filter(
                (e) => e.path[0] === category.key,
              )}
            />
          ))}

          {showApps && (
            <div data-section="apps">
              <AppsSection />
            </div>
          )}
          {showPackages && (
            <div data-section="packages">
              <PackagesSection />
            </div>
          )}
          {showPackages && (
            <div data-section="workspace-layout">
              <WorkspaceLayoutSection />
            </div>
          )}
          {showRegistry && <RegistrySection />}

          {normalizedQuery &&
            filteredCategories.length === 0 &&
            !showApps &&
            !showPackages &&
            !showRegistry && (
              <div className="flex items-center justify-center py-12 text-fd-muted-foreground">
                <p className="font-mono text-sm">
                  No matching options for "{searchQuery}"
                </p>
              </div>
            )}

          {/* Scroll padding */}
          <div className="h-10" />
        </div>
      </div>
    </div>
  );
}
