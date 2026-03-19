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
};

export function OptionCard({
  label,
  description,
  selected,
  disabled = false,
  disabledReason,
  onClick,
}: OptionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative w-full rounded-lg p-3 text-left transition-all duration-150",
        selected
          ? "bg-fd-primary/8 ring-1 ring-fd-primary/40 dark:bg-fd-primary/10 dark:ring-fd-primary/25"
          : disabled
            ? "cursor-not-allowed bg-fd-muted/5 opacity-50 ring-1 ring-red-500/15"
            : "bg-fd-muted/5 ring-1 ring-fd-border/20 hover:ring-fd-border/40 hover:bg-fd-muted/10",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "font-medium text-sm",
            selected ? "text-fd-primary" : "text-fd-foreground",
          )}
        >
          {label}
        </span>
        {selected && (
          <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-fd-primary/15">
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
