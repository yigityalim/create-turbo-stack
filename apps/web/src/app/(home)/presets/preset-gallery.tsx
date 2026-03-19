"use client";

import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type RegistryItem = {
  name: string;
  title: string;
  description: string;
  type: string;
  tags: string[];
  preset: string;
  verified?: boolean;
  github?: string;
  addedAt?: string;
};

const TAG_COLORS: Record<string, string> = {
  nextjs: "bg-fd-foreground/10 text-fd-foreground",
  supabase: "bg-green-500/10 text-green-400",
  trpc: "bg-blue-500/10 text-blue-400",
  hono: "bg-orange-500/10 text-orange-400",
  drizzle: "bg-yellow-500/10 text-yellow-400",
  saas: "bg-purple-500/10 text-purple-400",
  tailwind: "bg-cyan-500/10 text-cyan-400",
  minimal: "bg-fd-muted/20 text-fd-muted-foreground",
  fullstack: "bg-pink-500/10 text-pink-400",
  api: "bg-indigo-500/10 text-indigo-400",
  backend: "bg-red-500/10 text-red-400",
};

export function PresetGallery({ items }: { items: RegistryItem[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const item of items) {
      for (const tag of item.tags) tags.add(tag);
    }
    return Array.from(tags).sort();
  }, [items]);

  const filtered = useMemo(
    () => (filter ? items.filter((i) => i.tags.includes(filter)) : items),
    [items, filter],
  );

  const handleCopy = async (item: RegistryItem) => {
    const cmd = `npx create-turbo-stack --preset ${item.preset}`;
    await navigator.clipboard.writeText(cmd);
    setCopiedName(item.name);
    setTimeout(() => setCopiedName(null), 2000);
  };

  return (
    <div>
      {/* Tag filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter(null)}
          className={cn(
            "rounded-full px-3 py-1 font-mono text-xs transition-colors",
            !filter
              ? "bg-fd-primary text-fd-primary-foreground"
              : "bg-fd-muted/10 text-fd-muted-foreground ring-1 ring-fd-border/30 hover:ring-fd-border",
          )}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setFilter(filter === tag ? null : tag)}
            className={cn(
              "rounded-full px-3 py-1 font-mono text-xs transition-colors",
              filter === tag
                ? "bg-fd-primary text-fd-primary-foreground"
                : "bg-fd-muted/10 text-fd-muted-foreground ring-1 ring-fd-border/30 hover:ring-fd-border",
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Preset cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <div
            key={item.name}
            className="group flex flex-col rounded-xl border border-fd-border/40 bg-fd-card p-5 transition-colors hover:border-fd-border"
          >
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-base font-semibold text-fd-foreground">
                {item.title}
              </h3>
              {item.verified ? (
                <span
                  title="Verified preset — reviewed for safety"
                  className="flex items-center gap-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 font-mono text-[10px] text-green-400"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </span>
              ) : (
                <span
                  title="Unverified community preset — use with caution"
                  className="flex items-center gap-0.5 rounded-full bg-yellow-500/10 px-1.5 py-0.5 font-mono text-[10px] text-yellow-400"
                >
                  <ShieldAlert className="h-3 w-3" />
                  Unverified
                </span>
              )}
            </div>
            {item.github && (
              <p className="mt-0.5 font-mono text-[10px] text-fd-muted-foreground">
                by{" "}
                <a
                  href={`https://github.com/${item.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fd-foreground/60 hover:text-fd-foreground"
                >
                  @{item.github}
                </a>
              </p>
            )}
            <p className="mt-1.5 flex-1 font-mono text-xs leading-relaxed text-fd-muted-foreground">
              {item.description}
            </p>

            {/* Tags */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-[10px]",
                    TAG_COLORS[tag] ??
                      "bg-fd-muted/10 text-fd-muted-foreground",
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2 border-t border-fd-border/30 pt-3">
              <Link
                href={`/builder?preset=${item.name}`}
                className="flex items-center gap-1.5 rounded-md bg-fd-primary px-3 py-1.5 font-mono text-xs text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
              >
                Open in Builder
                <ArrowRight className="h-3 w-3" />
              </Link>
              <button
                type="button"
                onClick={() => handleCopy(item)}
                className="flex items-center gap-1.5 rounded-md bg-fd-muted/10 px-3 py-1.5 font-mono text-xs text-fd-muted-foreground ring-1 ring-fd-border/30 transition-colors hover:text-fd-foreground"
                title="Copy CLI command"
              >
                {copiedName === item.name ? (
                  <>
                    <Check className="h-3 w-3 text-green-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    CLI
                  </>
                )}
              </button>
              <a
                href={item.preset}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto rounded-md p-1.5 text-fd-muted-foreground transition-colors hover:text-fd-foreground"
                title="View JSON"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <p className="font-mono text-sm text-fd-muted-foreground">
            No presets match this filter.
          </p>
        </div>
      )}

      {/* Community contribution CTA */}
      <div className="mt-12 rounded-xl border border-fd-border/30 bg-fd-muted/5 p-6 text-center">
        <h3 className="font-mono text-sm font-semibold text-fd-foreground">
          Share Your Stack
        </h3>
        <p className="mx-auto mt-2 max-w-md font-mono text-xs text-fd-muted-foreground">
          Build your stack in the builder, export the preset JSON, and submit a
          PR to the registry. All community presets are reviewed before being
          marked as verified.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link
            href="/builder"
            className="rounded-md bg-fd-primary px-4 py-2 font-mono text-xs text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
          >
            Open Builder
          </Link>
          <a
            href="https://github.com/yigityalim/create-turbo-stack/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-fd-muted/10 px-4 py-2 font-mono text-xs text-fd-muted-foreground ring-1 ring-fd-border/30 transition-colors hover:text-fd-foreground"
          >
            Submission Guide
          </a>
        </div>
        <p className="mx-auto mt-3 max-w-sm font-mono text-[10px] text-fd-muted-foreground/60">
          <ShieldCheck className="mb-0.5 mr-1 inline h-3 w-3 text-green-400" />
          Community presets are schema-validated and checked for template
          injection before approval.
        </p>
      </div>
    </div>
  );
}
