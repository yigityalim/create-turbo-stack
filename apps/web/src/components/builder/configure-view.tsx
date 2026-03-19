"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { CATEGORIES } from "@/lib/preset/schema-meta";
import { AppsSection } from "./apps-section";
import { useBuilder } from "./builder-provider";
import { ConfigureSection } from "./configure-section";
import { PackagesSection } from "./packages-section";

export function ConfigureView() {
  const { preset, dispatch, validationErrors, scrollTarget } = useBuilder();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
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

  // S — toggle search in configure view
  useHotkeys(
    "s",
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

  useHotkeys("escape", () => {
    if (showSearch) {
      setShowSearch(false);
      setSearchQuery("");
    }
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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 border-fd-border border-b bg-fd-background px-4 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-fd-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories, options..."
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

      {/* Scrollable content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto scroll-smooth"
      >
        <div className="mx-auto max-w-4xl space-y-6 p-4">
          {/* Search toggle hint */}
          {!showSearch && (
            <button
              type="button"
              onClick={() => {
                setShowSearch(true);
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
              className="flex w-full items-center gap-2 rounded-lg bg-fd-muted/5 px-3 py-2 text-fd-muted-foreground/50 ring-1 ring-fd-border/15 transition-colors hover:ring-fd-border/30"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">Search options...</span>
              <kbd className="ml-auto rounded border border-fd-border/30 bg-fd-muted/10 px-1.5 py-0.5 font-mono text-[10px]">
                S
              </kbd>
            </button>
          )}

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

          {normalizedQuery &&
            filteredCategories.length === 0 &&
            !showApps &&
            !showPackages && (
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
