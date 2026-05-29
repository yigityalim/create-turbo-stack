/**
 * Landing-page content derived from the Zod schema (via schema-meta).
 *
 * The whole point: the marketing site must not drift from what the CLI
 * actually supports. Instead of hardcoding "Supabase · Drizzle · Prisma",
 * we read the same `CATEGORIES` the builder reads — which come from the
 * schema's enum `.options`. Add a provider to the schema and it shows up
 * here automatically, same as the builder.
 */
import {
  APP_FIELDS,
  CATEGORIES,
  type OptionMeta,
} from "@/lib/preset/schema-meta";

function category(key: string) {
  return CATEGORIES.find((c) => c.key === key);
}

/** Options for a field, with the "none" sentinel dropped. */
function optionsFor(categoryKey: string, fieldKey: string): OptionMeta[] {
  const field = category(categoryKey)?.fields?.find((f) => f.key === fieldKey);
  return (field?.options ?? []).filter((o) => o.value !== "none");
}

const appTypes = (APP_FIELDS.type.options ?? []).filter(
  (o) => o.value !== "none",
);

export type StackGroup = { label: string; options: OptionMeta[] };

/** Top-level stack choices, in the order they appear in the CLI flow. */
export const stackGroups: StackGroup[] = [
  { label: "Database", options: optionsFor("database", "strategy") },
  { label: "API", options: optionsFor("api", "strategy") },
  { label: "Auth", options: optionsFor("auth", "provider") },
  { label: "CSS", options: optionsFor("css", "framework") },
  { label: "UI", options: optionsFor("css", "ui") },
  { label: "Apps", options: appTypes },
];

/** Per-app integration providers — rendered as a grid of categories. */
export const integrationGroups: StackGroup[] = [
  { label: "Analytics", options: optionsFor("integrations", "analytics") },
  {
    label: "Error Tracking",
    options: optionsFor("integrations", "errorTracking"),
  },
  { label: "Email", options: optionsFor("integrations", "email") },
  { label: "Rate Limit", options: optionsFor("integrations", "rateLimit") },
  { label: "AI", options: optionsFor("integrations", "ai") },
];

/** Headline counts, computed so they can never lie about coverage. */
export const stats = [
  { value: appTypes.length, label: "App types" },
  { value: optionsFor("database", "strategy").length, label: "Databases" },
  { value: optionsFor("auth", "provider").length, label: "Auth providers" },
  {
    value: integrationGroups.reduce((n, g) => n + g.options.length, 0),
    label: "Integrations",
  },
];
