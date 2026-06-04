"use client";

import { BUILTIN_REGISTRY_ITEMS } from "@create-turbo-stack/core";
import type { Preset } from "@create-turbo-stack/schema";
import { Database, Palette, Puzzle, Settings, Shield, Zap } from "lucide-react";
import type { ValidationError } from "@/lib/hooks/use-preset-builder";
import type { PresetAction } from "@/lib/preset/reducer";
import type { CategoryMeta, FieldMeta } from "@/lib/preset/schema-meta";
import { ProviderIcon } from "./icons";
import { OptionCard } from "./option-card";
import { Toggle } from "./toggle";

/**
 * Maps (schema group, value) → registry (slot, variant)[] pairs.
 * null  = no registry item needed (built-in behaviour, always available)
 * empty = unknown option, treat as available
 */
const REGISTRY_MAP: Record<string, Record<string, [string, string][] | null>> = {
  database: {
    none: null,
    supabase: [["db", "supabase"]],
    drizzle: [["db", "drizzle-postgres"], ["db", "drizzle-mysql"], ["db", "drizzle-sqlite"]],
    prisma: [["db", "prisma-postgres"], ["db", "prisma-mysql"], ["db", "prisma-sqlite"]],
  },
  driver: {
    postgres: null, turso: null, neon: null, planetscale: null,
    mysql: null, sqlite: null,
  },
  api: {
    none: null,
    trpc: [["api", "trpc"]],
    hono: [["api", "hono-route"], ["api", "hono-standalone"]],
    "rest-nextjs": null, // Built into Next.js — no separate registry item
  },
  auth: {
    none: null,
    "better-auth": [["auth", "better-auth"]],
    clerk: [["auth", "clerk"]],
    "supabase-auth": [["auth", "supabase-auth"]],
    "next-auth": [["auth", "authjs"]],
    lucia: null, // Deprecated
  },
  css: { tailwind4: null, vanilla: null, "css-modules": null },
  ui: {
    none: null,
    shadcn: [["ui", "shadcn-starter"]],
    "radix-raw": null,
  },
  analytics: {
    none: null,
    posthog: [["analytics", "posthog"]],
    "vercel-analytics": [["analytics", "vercel-analytics"]],
    plausible: [["analytics", "plausible"]],
  },
  errorTracking: {
    none: null,
    sentry: [["monitoring", "sentry"]],
    bugsnag: [["monitoring", "bugsnag"]],
  },
  email: {
    none: null,
    "react-email-resend": [["email", "resend"]],
    nodemailer: [["email", "nodemailer"]],
  },
  rateLimit: {
    none: null,
    upstash: [["rate-limit", "upstash-ratelimit"]],
  },
  ai: {
    none: null,
    "vercel-ai-sdk": [["ai", "vercel-ai-sdk"]],
    langchain: [["ai", "langchain"]],
  },
  cache: {
    none: null,
    upstash: [["cache", "upstash-redis"]],
  },
};

// Build a Set of "slot:variant" keys that have real file content.
// Computed once at module load — no per-render cost.
const BUILT_KEYS = new Set(
  BUILTIN_REGISTRY_ITEMS
    .filter((item) => (item.files?.length ?? 0) > 0)
    .map((item) => `${item.slot}:${item.variant}`),
);

/**
 * Returns true when the (group, value) pair is covered by at least one
 * built registry item, or when no registry item is needed for it.
 */
function isAvailable(group: string | undefined, value: string): boolean {
  if (!group) return true; // Fields without a group don't gate on registry
  const pairs = REGISTRY_MAP[group]?.[value];
  if (pairs === null) return true; // Explicitly "no item needed"
  if (pairs === undefined) return true; // Unknown option → don't block
  return pairs.some(([slot, variant]) => BUILT_KEYS.has(`${slot}:${variant}`));
}

const ICON_MAP: Record<string, React.ElementType> = {
  Settings,
  Database,
  Zap,
  Shield,
  Palette,
  Puzzle,
};

type ConfigureSectionProps = {
  category: CategoryMeta;
  preset: Preset;
  dispatch: (action: PresetAction) => void;
  errors: ValidationError[];
};

export function ConfigureSection({
  category,
  preset,
  dispatch,
  errors,
}: ConfigureSectionProps) {
  const Icon = ICON_MAP[category.icon] ?? Settings;
  const sectionData = preset[category.key as keyof Preset];

  // Get the current discriminator value (for database/api)
  const discriminatorValue = category.discriminator
    ? ((sectionData as Record<string, unknown>)?.[
        category.discriminator
      ] as string)
    : undefined;

  // Get active variant fields
  const variantFields =
    category.discriminator && discriminatorValue && category.variants
      ? (category.variants[discriminatorValue] ?? [])
      : [];

  return (
    <section className="scroll-mt-4">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[3px] border border-fd-border bg-fd-card text-fd-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="font-mono font-semibold text-sm uppercase tracking-wide">
            {category.label}
          </h2>
        </div>
        <p className="mt-2 text-fd-muted-foreground text-xs leading-relaxed">
          {category.description}
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-3 rounded-[3px] border border-red-500/20 bg-red-500/10 px-3 py-2">
          {errors.map((err) => (
            <p key={err.message} className="text-xs text-red-400">
              {err.message}
            </p>
          ))}
        </div>
      )}

      {/* Fields */}
      <div className="space-y-5">
        {category.fields?.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={getFieldValue(sectionData, field.key)}
            categoryKey={category.key}
            dispatch={dispatch}
            sectionData={sectionData}
            isDiscriminator={field.key === category.discriminator}
          />
        ))}

        {/* Variant sub-fields (appear after discriminator selection) */}
        {variantFields.length > 0 && (
          <div className="ml-4 space-y-4 border-fd-border border-l pl-4">
            {variantFields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={getFieldValue(sectionData, field.key)}
                categoryKey={category.key}
                dispatch={dispatch}
                sectionData={sectionData}
                isDiscriminator={false}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Field Renderer ───────────────────────────────────────────────────────────

type FieldRendererProps = {
  field: FieldMeta;
  value: unknown;
  categoryKey: string;
  dispatch: (action: PresetAction) => void;
  sectionData: unknown;
  isDiscriminator: boolean;
};

function FieldRenderer({
  field,
  value,
  categoryKey,
  dispatch,
  sectionData,
  isDiscriminator,
}: FieldRendererProps) {
  if (field.type === "boolean") {
    return (
      <BooleanField
        field={field}
        value={value as boolean}
        onChange={(v) => {
          dispatchFieldChange(dispatch, categoryKey, field.key, v, sectionData);
        }}
      />
    );
  }

  if (field.type === "enum" && field.options) {
    return (
      <div>
        <p className="mb-2 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wide">
          {field.label}
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {field.options.map((option) => {
            const available = isAvailable(field.group, option.value);
            return (
              <OptionCard
                key={option.value}
                label={option.label}
                description={option.description}
                selected={value === option.value}
                comingSoon={!available}
                icon={
                  field.group ? (
                    <ProviderIcon group={field.group} value={option.value} />
                  ) : null
                }
                onClick={() => {
                  if (!available) return;
                  if (isDiscriminator) {
                    dispatchDiscriminatorChange(
                      dispatch,
                      categoryKey,
                      field.key,
                      option.value,
                      sectionData,
                    );
                  } else {
                    dispatchFieldChange(
                      dispatch,
                      categoryKey,
                      field.key,
                      option.value,
                      sectionData,
                    );
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Boolean Field ────────────────────────────────────────────────────────────

function BooleanField({
  field,
  value,
  onChange,
}: {
  field: FieldMeta;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[3px] border border-fd-border bg-fd-card px-3 py-2.5">
      <div className="min-w-0">
        <span className="font-mono text-fd-foreground text-sm">
          {field.label}
        </span>
        {field.description && (
          <p className="mt-0.5 text-fd-muted-foreground text-xs leading-relaxed">
            {field.description}
          </p>
        )}
      </div>
      <Toggle checked={value} onChange={onChange} label={field.label} />
    </div>
  );
}

// ─── Dispatch Helpers ─────────────────────────────────────────────────────────

function getFieldValue(sectionData: unknown, key: string): unknown {
  if (sectionData && typeof sectionData === "object") {
    return (sectionData as Record<string, unknown>)[key];
  }
  return undefined;
}

/** Normal field change: merge into current section */
function dispatchFieldChange(
  dispatch: (action: PresetAction) => void,
  categoryKey: string,
  fieldKey: string,
  value: unknown,
  sectionData: unknown,
) {
  const actionType = categoryActionType(categoryKey);
  if (!actionType) return;

  if (actionType === "SET_DATABASE" || actionType === "SET_API") {
    // For discriminated unions, merge field into full object
    dispatch({
      type: actionType,
      payload: {
        ...(sectionData as Record<string, unknown>),
        [fieldKey]: value,
      },
    } as PresetAction);
  } else {
    dispatch({
      type: actionType,
      payload: { [fieldKey]: value },
    } as PresetAction);
  }
}

/** Discriminator change: replace entire section with new variant defaults */
function dispatchDiscriminatorChange(
  dispatch: (action: PresetAction) => void,
  categoryKey: string,
  discriminatorKey: string,
  newValue: string,
  _sectionData: unknown,
) {
  const actionType = categoryActionType(categoryKey);
  if (!actionType) return;

  // Build a clean variant object with just the discriminator
  // Sub-fields will use their defaults from Zod parsing
  const variantDefaults: Record<string, Record<string, unknown>> = {
    database: {
      none: { strategy: "none" },
      supabase: { strategy: "supabase" },
      drizzle: { strategy: "drizzle", driver: "postgres" },
      prisma: { strategy: "prisma" },
    },
    api: {
      none: { strategy: "none" },
      trpc: { strategy: "trpc", version: "v11" },
      hono: { strategy: "hono", mode: "standalone-app" },
      "rest-nextjs": { strategy: "rest-nextjs" },
    },
  };

  const defaults = variantDefaults[categoryKey]?.[newValue];
  if (defaults) {
    dispatch({ type: actionType, payload: defaults } as PresetAction);
  } else {
    dispatch({
      type: actionType,
      payload: { [discriminatorKey]: newValue },
    } as PresetAction);
  }
}

function categoryActionType(key: string): PresetAction["type"] | null {
  const map: Record<string, PresetAction["type"]> = {
    basics: "SET_BASICS",
    database: "SET_DATABASE",
    api: "SET_API",
    auth: "SET_AUTH",
    css: "SET_CSS",
    integrations: "SET_INTEGRATIONS",
  };
  return map[key] ?? null;
}
