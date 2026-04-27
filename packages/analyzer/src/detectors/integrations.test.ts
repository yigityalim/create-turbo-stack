import { afterEach, describe, expect, it } from "vitest";
import { createFixture, removeFixture } from "../test-utils/fixture";
import { detectIntegrations } from "./integrations";

let tmp: string;

afterEach(async () => {
  if (tmp) await removeFixture(tmp);
});

describe("detectIntegrations", () => {
  // Analytics

  it("detects posthog via posthog-js", async () => {
    tmp = await createFixture({
      "packages/analytics/package.json": {
        dependencies: { "posthog-js": "^1.0.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.analytics).toBe("posthog");
    expect(r.detections.analytics.confidence).toBe("certain");
  });

  it("detects posthog via posthog-node", async () => {
    tmp = await createFixture({
      "packages/analytics/package.json": {
        dependencies: { "posthog-node": "^4.0.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.analytics).toBe("posthog");
  });

  it("detects vercel-analytics via @vercel/analytics", async () => {
    tmp = await createFixture({
      "apps/web/package.json": {
        dependencies: { "@vercel/analytics": "^1.0.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.analytics).toBe("vercel-analytics");
  });

  it("detects plausible via plausible-tracker", async () => {
    tmp = await createFixture({
      "apps/web/package.json": {
        dependencies: { "plausible-tracker": "^0.3.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.analytics).toBe("plausible");
  });

  it("posthog takes priority over vercel-analytics when both present", async () => {
    tmp = await createFixture({
      "packages/analytics/package.json": {
        dependencies: { "posthog-js": "^1.0.0", "@vercel/analytics": "^1.0.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.analytics).toBe("posthog");
  });

  it("returns none analytics when no analytics dep found", async () => {
    tmp = await createFixture({ "package.json": { name: "bare" } });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.analytics).toBe("none");
    expect(r.detections.analytics.confidence).toBe("medium");
  });

  // Error tracking

  it("detects sentry via @sentry/nextjs", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { "@sentry/nextjs": "^8.0.0" } },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.errorTracking).toBe("sentry");
    expect(r.detections.errorTracking.confidence).toBe("certain");
  });

  it("detects sentry via @sentry/node", async () => {
    tmp = await createFixture({
      "packages/api/package.json": {
        dependencies: { "@sentry/node": "^8.0.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.errorTracking).toBe("sentry");
  });

  it("returns none errorTracking when no sentry found", async () => {
    tmp = await createFixture({ "package.json": { name: "bare" } });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.errorTracking).toBe("none");
  });

  // Email

  it("detects react-email-resend via resend", async () => {
    tmp = await createFixture({
      "packages/email/package.json": { dependencies: { resend: "^3.0.0" } },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.email).toBe("react-email-resend");
    expect(r.detections.email.confidence).toBe("certain");
  });

  it("detects react-email-resend via @react-email/components", async () => {
    tmp = await createFixture({
      "packages/email/package.json": {
        dependencies: { "@react-email/components": "^0.0.22" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.email).toBe("react-email-resend");
  });

  it("detects nodemailer via nodemailer", async () => {
    tmp = await createFixture({
      "packages/email/package.json": { dependencies: { nodemailer: "^6.0.0" } },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.email).toBe("nodemailer");
  });

  it("resend takes priority over nodemailer", async () => {
    tmp = await createFixture({
      "packages/email/package.json": {
        dependencies: { resend: "^3.0.0", nodemailer: "^6.0.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.email).toBe("react-email-resend");
  });

  it("returns none email when no email dep", async () => {
    tmp = await createFixture({ "package.json": { name: "bare" } });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.email).toBe("none");
  });

  // Rate limiting

  it("detects upstash via @upstash/ratelimit", async () => {
    tmp = await createFixture({
      "packages/rate-limit/package.json": {
        dependencies: { "@upstash/ratelimit": "^2.0.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.rateLimit).toBe("upstash");
    expect(r.detections.rateLimit.confidence).toBe("certain");
  });

  it("returns none rateLimit when not found", async () => {
    tmp = await createFixture({ "package.json": { name: "bare" } });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.rateLimit).toBe("none");
  });

  // AI

  it("detects vercel-ai-sdk via ai package", async () => {
    tmp = await createFixture({
      "packages/ai/package.json": { dependencies: { ai: "^4.0.0" } },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.ai).toBe("vercel-ai-sdk");
    expect(r.detections.ai.confidence).toBe("certain");
  });

  it("detects vercel-ai-sdk via @ai-sdk/openai", async () => {
    tmp = await createFixture({
      "packages/ai/package.json": {
        dependencies: { "@ai-sdk/openai": "^1.0.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.ai).toBe("vercel-ai-sdk");
  });

  it("detects langchain via langchain package", async () => {
    tmp = await createFixture({
      "packages/ai/package.json": { dependencies: { langchain: "^0.3.0" } },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.ai).toBe("langchain");
  });

  it("vercel-ai-sdk takes priority over langchain", async () => {
    tmp = await createFixture({
      "packages/ai/package.json": {
        dependencies: { ai: "^4.0.0", langchain: "^0.3.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.ai).toBe("vercel-ai-sdk");
  });

  it("returns none ai when no AI dep found", async () => {
    tmp = await createFixture({ "package.json": { name: "bare" } });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.ai).toBe("none");
  });

  // Env validation

  it("detects env validation via @t3-oss/env-nextjs", async () => {
    tmp = await createFixture({
      "apps/web/package.json": {
        dependencies: { "@t3-oss/env-nextjs": "^0.10.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.envValidation).toBe(true);
    expect(r.detections.envValidation.confidence).toBe("certain");
  });

  it("detects env validation via @t3-oss/env-core", async () => {
    tmp = await createFixture({
      "packages/env/package.json": {
        dependencies: { "@t3-oss/env-core": "^0.10.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.envValidation).toBe(true);
  });

  it("returns false envValidation when not found", async () => {
    tmp = await createFixture({ "package.json": { name: "bare" } });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.envValidation).toBe(false);
  });

  // Cross-package scanning

  it("scans root + apps/* + packages/* for deps", async () => {
    tmp = await createFixture({
      // root has ratelimit, apps has sentry, packages has resend
      "package.json": { dependencies: { "@upstash/ratelimit": "^2.0.0" } },
      "apps/web/package.json": { dependencies: { "@sentry/nextjs": "^8.0.0" } },
      "packages/email/package.json": { dependencies: { resend: "^3.0.0" } },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.rateLimit).toBe("upstash");
    expect(r.integrations.errorTracking).toBe("sentry");
    expect(r.integrations.email).toBe("react-email-resend");
  });

  it("detects integrations found only in nested packages (not root)", async () => {
    tmp = await createFixture({
      "packages/observability/package.json": {
        dependencies: { "posthog-node": "^4.0.0" },
      },
    });
    const r = await detectIntegrations(tmp);
    expect(r.integrations.analytics).toBe("posthog");
  });

  // detections shape

  it("returns all 6 detection keys", async () => {
    tmp = await createFixture({ "package.json": { name: "bare" } });
    const r = await detectIntegrations(tmp);
    expect(Object.keys(r.detections).sort()).toEqual(
      ["ai", "analytics", "email", "envValidation", "errorTracking", "rateLimit"].sort(),
    );
  });

  it("every detection has value, confidence, reason fields", async () => {
    tmp = await createFixture({ "package.json": { name: "bare" } });
    const r = await detectIntegrations(tmp);
    for (const [key, detection] of Object.entries(r.detections)) {
      expect(detection, `${key}.value`).toHaveProperty("value");
      expect(detection, `${key}.confidence`).toHaveProperty("confidence");
      expect(detection, `${key}.reason`).toHaveProperty("reason");
    }
  });
});
