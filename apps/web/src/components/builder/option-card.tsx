"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type OptionCardProps = {
  label: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
  /** Optional brand / type glyph rendered to the left of the label. */
  icon?: React.ReactNode;
};

export function OptionCard({
  label,
  description,
  selected,
  disabled = false,
  disabledReason,
  onClick,
  icon,
}: OptionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative w-full rounded-[3px] border p-3 text-left transition-all duration-150",
        selected
          ? "border-fd-primary bg-fd-primary/10 text-fd-primary"
          : disabled
            ? "cursor-not-allowed border-red-500/30 bg-fd-muted/5 opacity-50"
            : "brutal-hover border-fd-border bg-fd-muted/5 hover:text-fd-foreground",
      )}
    >
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
