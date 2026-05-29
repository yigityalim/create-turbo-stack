"use client";

import { cn } from "@/lib/cn";

/**
 * Accessible switch. The previous inline switches used `inline-flex` without
 * `items-center` and a thumb with no inset, so the knob sat misaligned (top-
 * left) and clipped at the "on" edge. This centers the knob and insets it on
 * both ends so the travel reads correctly.
 */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
        checked
          ? "border-fd-primary bg-fd-primary"
          : "border-fd-border bg-fd-muted/40 dark:bg-fd-muted/25",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-3.5 rounded-full bg-white shadow-sm transition-transform dark:bg-fd-background",
          checked ? "translate-x-[1.125rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
