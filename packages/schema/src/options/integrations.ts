import { z } from "zod";

export const AnalyticsSchema = z.enum(["posthog", "vercel-analytics", "plausible", "none"]);
export type Analytics = z.infer<typeof AnalyticsSchema>;

export const ErrorTrackingSchema = z.enum(["sentry", "bugsnag", "none"]);
export type ErrorTracking = z.infer<typeof ErrorTrackingSchema>;

export const EmailSchema = z.enum(["resend", "sendgrid", "plunk", "none"]);
export type Email = z.infer<typeof EmailSchema>;

export const RateLimitSchema = z.enum(["upstash", "none"]);
export type RateLimit = z.infer<typeof RateLimitSchema>;

export const AiSchema = z.enum(["vercel-ai-sdk", "langchain", "none"]);
export type Ai = z.infer<typeof AiSchema>;

export const CacheSchema = z.enum(["upstash", "none"]);
export type Cache = z.infer<typeof CacheSchema>;

/**
 * Env-validation provider. Promoting from a former boolean (on/off) to an
 * enum lets us swap in different providers (`@t3-oss/env-nextjs` today, a
 * Valibot-backed equivalent tomorrow) without another schema migration.
 */
export const EnvValidationSchema = z.enum(["t3-env", "none"]);
export type EnvValidation = z.infer<typeof EnvValidationSchema>;

export const IntegrationsSchema = z.object({
  analytics: AnalyticsSchema.default("none"),
  errorTracking: ErrorTrackingSchema.default("none"),
  email: EmailSchema.default("none"),
  rateLimit: RateLimitSchema.default("none"),
  ai: AiSchema.default("none"),
  cache: CacheSchema.default("none"),
  envValidation: EnvValidationSchema.default("t3-env"),
});
export type Integrations = z.infer<typeof IntegrationsSchema>;

// ─── Single source of truth for integration ↔ package wiring ────────────────
//
// These three exports let the engine *derive* the per-category boilerplate
// (auto-packages, dispatch, template keys, allowed `consumes`, prompts,
// guardrail tests) instead of repeating it. Adding a new category then means:
// one enum + one field above, one entry here, plus a core defineIntegration
// and its templates — nothing scattered. schema is logic-free, so this is
// plain data; core imports it (never the reverse).

/**
 * Categories selectable under `integrations.*`. Derived from the schema, so
 * adding a field above makes it appear here automatically. Excludes the
 * top-level auth/database/api unions and the `envValidation` flag.
 */
export const INTEGRATION_OPTION_CATEGORIES = Object.keys(IntegrationsSchema.shape).filter(
  (k) => k !== "envValidation",
) as Array<Exclude<keyof Integrations, "envValidation">>;

/**
 * Workspace package each integration category generates. Most match the
 * category name; the listed exceptions don't. Top-level auth/database/api are
 * included so the resolver and the preset validator share one map.
 */
export const INTEGRATION_PACKAGE_NAMES: Record<string, string> = {
  auth: "auth",
  database: "db",
  api: "api",
  analytics: "analytics",
  errorTracking: "monitoring",
  email: "email",
  rateLimit: "rate-limit",
  ai: "ai",
};

/** The workspace package name for a category (defaults to the category name). */
export function integrationPackageName(category: string): string {
  return INTEGRATION_PACKAGE_NAMES[category] ?? category;
}

/**
 * Provider values (incl. "none") per `integrations.*` category. Feeds the
 * registry-sync guardrail and any UI that enumerates providers, so adding a
 * category needs only an entry here — not a test edit.
 */
export const INTEGRATION_PROVIDER_VALUES = {
  analytics: AnalyticsSchema.options,
  errorTracking: ErrorTrackingSchema.options,
  email: EmailSchema.options,
  rateLimit: RateLimitSchema.options,
  ai: AiSchema.options,
  cache: CacheSchema.options,
} as const;
