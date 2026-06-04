"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type OptionCardProps = {
  label: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string;
  /** Registry item not yet authored — card is visible but unselectable. */
  comingSoon?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
};

export function OptionCard({
  label,
  description,
  selected,
  disabled = false,
  disabledReason,
  comingSoon = false,
  onClick,
  icon,
}: OptionCardProps) {
  const isBlocked = disabled || comingSoon;

  return (
    <button
      type="button"
      disabled={isBlocked}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative w-full rounded-[3px] border p-3 text-left transition-all duration-150",
        selected
          ? "border-fd-primary bg-fd-primary/10 text-fd-primary"
          : comingSoon
            ? "cursor-default border-fd-border/40 bg-fd-muted/3 opacity-60"
            : disabled
              ? "cursor-not-allowed border-red-500/30 bg-fd-muted/5 opacity-50"
              : "brutal-hover border-fd-border bg-fd-muted/5 hover:text-fd-foreground",
      )}
    >
      {/* Coming soon badge */}
      {comingSoon && (
        <span className="absolute top-1.5 right-1.5 rounded-[2px] bg-fd-muted/30 px-1.5 py-0.5 font-mono text-[8px] tracking-[0.1em] text-fd-muted-foreground/50 uppercase">
          soon
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <span
            className={cn(
              "truncate font-medium text-sm",
              selected ? "text-fd-primary" : "text-fd-foreground",
            )}
          >
            {label}
          </span>
        </div>
        {selected && (
          <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-fd-primary/15">
            <Check className="h-3 w-3 shrink-0 text-fd-primary" />
          </div>
        )}
      </div>
      <p className="mt-1 text-fd-muted-foreground text-xs leading-relaxed">
        {description}
      </p>
      {disabled && disabledReason && (
        <p className="mt-1.5 text-[11px] text-red-400">{disabledReason}</p>
      )}
    </button>
  );
}
