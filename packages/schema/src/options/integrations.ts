import { z } from "zod";

export const AnalyticsSchema = z.enum(["posthog", "vercel-analytics", "plausible", "none"]);
export type Analytics = z.infer<typeof AnalyticsSchema>;

export const ErrorTrackingSchema = z.enum(["sentry", "none"]);
export type ErrorTracking = z.infer<typeof ErrorTrackingSchema>;

export const EmailSchema = z.enum(["react-email-resend", "nodemailer", "none"]);
export type Email = z.infer<typeof EmailSchema>;

export const RateLimitSchema = z.enum(["upstash", "none"]);
export type RateLimit = z.infer<typeof RateLimitSchema>;

export const AiSchema = z.enum(["vercel-ai-sdk", "langchain", "none"]);
export type Ai = z.infer<typeof AiSchema>;

export const IntegrationsSchema = z.object({
  analytics: AnalyticsSchema.default("none"),
  errorTracking: ErrorTrackingSchema.default("none"),
  email: EmailSchema.default("none"),
  rateLimit: RateLimitSchema.default("none"),
  ai: AiSchema.default("none"),
  envValidation: z.boolean().default(true),
});
export type Integrations = z.infer<typeof IntegrationsSchema>;
