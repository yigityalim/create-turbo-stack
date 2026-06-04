"use client";

import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "@/lib/cn";
import { CATEGORIES } from "@/lib/preset/schema-meta";
import { AppsSection } from "./apps-section";
import { useBuilder } from "./builder-provider";
import { ConfigureSection } from "./configure-section";
import { PackagesSection } from "./packages-section";
import { RegistrySection } from "./registry-section";
import { WorkspaceLayoutSection } from "./workspace-layout-section";

// ─── Nav items ────────────────────────────────────────────────────────────────

type NavItem = {
  id: string;
  label: string;
  /** True when this section has a non-default selection. */
  active?: boolean;
  separator?: boolean;
};

function useNavItems() {
  const { preset } = useBuilder();
  return useMemo((): NavItem[] => [
    { id: "basics", label: "Basics", active: true },
    { id: "database", label: "Database", active: preset.database.strategy !== "none" },
    { id: "api", label: "API", active: preset.api.strategy !== "none" },
    { id: "auth", label: "Auth", active: preset.auth.provider !== "none" },
    { id: "css", label: "CSS", active: preset.css.ui !== "none" },
    { id: "integrations", label: "Integrations", active:
        Object.entries(preset.integrations).some(([k, v]) => k !== "envValidation" && v !== "none") },
    { id: "apps", label: "Apps", active: true, separator: true },
    { id: "packages", label: "Packages" },
    { id: "addons", label: "Add-ons" },
  ], [preset]);
}

// ─── Left nav ─────────────────────────────────────────────────────────────────

function SectionNav({
  activeId,
  onNavigate,
  hidden,
}: {
  activeId: string;
  onNavigate: (id: string) => void;
  hidden: boolean;
}) {
  const items = useNavItems();
  if (hidden) return null;

  return (
    <nav className="hidden w-32 shrink-0 flex-col border-fd-border border-r lg:flex">
      <div className="sticky top-0 space-y-0.5 overflow-auto p-2">
        {items.map((item) =>
          item.separator ? (
            <div key={`sep-${item.id}`}>
              <hr className="my-1 border-fd-border/40" />
              <NavButton item={item} active={activeId === item.id} onClick={onNavigate} />
            </div>
          ) : (
            <NavButton key={item.id} item={item} active={activeId === item.id} onClick={onNavigate} />
          )
        )}
      </div>
    </nav>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-left font-mono text-[10px] tracking-wide transition-colors outline-none focus:outline-none focus-visible:outline-none active:outline-none",
        active
          ? "bg-fd-primary/10 text-fd-primary"
          : "text-fd-muted-foreground hover:bg-fd-muted/10 hover:text-fd-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
          item.active ? "bg-fd-primary" : "bg-fd-muted-foreground/20",
        )}
      />
      {item.label}
    </button>
  );
}

// ─── ConfigureView ────────────────────────────────────────────────────────────

export function ConfigureView() {
  const { preset, dispatch, validationErrors, scrollTarget } = useBuilder();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState("basics");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, Element>>(new Map());

  // Register section refs for intersection observer
  const registerSection = useCallback((id: string, el: Element | null) => {
    if (el) sectionRefs.current.set(id, el);
    else sectionRefs.current.delete(id);
  }, []);

  // Intersection observer — track which section is in view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.section;
            if (id) setActiveId(id);
          }
        }
      },
      { root: container, rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    for (const el of sectionRefs.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scroll to section (from preview navigation or left nav click)
  const scrollToSection = useCallback((id: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-section="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-2", "ring-fd-primary/40", "ring-offset-1");
    setTimeout(() => el.classList.remove("ring-2", "ring-fd-primary/40", "ring-offset-1"), 1200);
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
      if (cat.fields?.some((f) => f.label.toLowerCase().includes(normalizedQuery))) return true;
      if (cat.fields?.some((f) =>
        f.options?.some((o) =>
          o.label.toLowerCase().includes(normalizedQuery) ||
          o.value.toLowerCase().includes(normalizedQuery),
        ),
      )) return true;
      if (cat.variants) {
        for (const fields of Object.values(cat.variants)) {
          if (fields.some((f) =>
            f.label.toLowerCase().includes(normalizedQuery) ||
            f.options?.some((o) =>
              o.label.toLowerCase().includes(normalizedQuery) ||
              o.value.toLowerCase().includes(normalizedQuery),
            ),
          )) return true;
        }
      }
      return false;
    });
  }, [normalizedQuery]);

  const showApps = !normalizedQuery || ["apps", "applications", "frontend", "backend"].some((t) => t.includes(normalizedQuery));
  const showPackages = !normalizedQuery || ["packages", "libraries", "workspace"].some((t) => t.includes(normalizedQuery));
  const showRegistry = !normalizedQuery || ["add-ons", "addons", "registry", "cts add"].some((t) => t.includes(normalizedQuery));

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
            if (e.key === "Escape") { setSearchQuery(""); e.currentTarget.blur(); }
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

      {/* Body: left nav + scrollable content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SectionNav
          activeId={activeId}
          onNavigate={scrollToSection}
          hidden={!!normalizedQuery}
        />

        <div ref={scrollContainerRef} className="flex-1 overflow-auto scroll-smooth">
          <div className="divide-y divide-fd-border/50">
            {filteredCategories.map((category) => (
              <div
                key={category.key}
                data-section={category.key}
                ref={(el) => registerSection(category.key, el)}
                className="px-6 py-7 sm:px-8"
              >
                <ConfigureSection
                  category={category}
                  preset={preset}
                  dispatch={dispatch}
                  errors={validationErrors.filter((e) => e.path[0] === category.key)}
                />
              </div>
            ))}

            {showApps && (
              <div
                data-section="apps"
                ref={(el) => registerSection("apps", el)}
                className="px-6 py-7 sm:px-8"
              >
                <AppsSection />
              </div>
            )}

            {showPackages && (
              <div
                data-section="packages"
                ref={(el) => registerSection("packages", el)}
                className="px-6 py-7 sm:px-8"
              >
                <PackagesSection />
              </div>
            )}

            {showPackages && (
              <div
                data-section="workspace-layout"
                ref={(el) => registerSection("workspace-layout", el)}
                className="px-6 py-7 sm:px-8"
              >
                <WorkspaceLayoutSection />
              </div>
            )}

            {showRegistry && (
              <div
                data-section="addons"
                ref={(el) => registerSection("addons", el)}
                className="px-6 py-7 sm:px-8"
              >
                <RegistrySection />
              </div>
            )}

            {noResults && (
              <div className="flex items-center justify-center py-16 text-fd-muted-foreground">
                <p className="font-mono text-sm">No results for "{searchQuery}"</p>
              </div>
            )}

            <div className="h-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
