import type { App } from "@create-turbo-stack/schema";
import {
  INTEGRATION_OPTION_CATEGORIES,
  INTEGRATION_PROVIDER_VALUES,
} from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { categoryLabel, wireConsumes } from "./add";

function makeApp(name: string, consumes: string[] = []): App {
  return {
    name,
    type: "nextjs",
    port: 3000,
    i18n: false,
    location: "apps",
    consumes,
  };
}

// ─── categoryLabel ────────────────────────────────────────────────────────────

describe("categoryLabel — known categories", () => {
  it("labels 'analytics'", () => {
    expect(categoryLabel("analytics")).toBe("Analytics");
  });

  it("labels 'errorTracking'", () => {
    expect(categoryLabel("errorTracking")).toBe("Error Tracking");
  });

  it("labels 'email'", () => {
    expect(categoryLabel("email")).toBe("Email");
  });

  it("labels 'rateLimit'", () => {
    expect(categoryLabel("rateLimit")).toBe("Rate Limiting");
  });

  it("labels 'ai'", () => {
    expect(categoryLabel("ai")).toBe("AI");
  });
});

describe("categoryLabel — unknown categories (humanize camelCase)", () => {
  it("splits camelCase into words", () => {
    expect(categoryLabel("featureFlags")).toBe("Feature Flags");
  });

  it("capitalizes first letter", () => {
    expect(categoryLabel("payments")).toBe("Payments");
  });

  it("handles single-word lowercase", () => {
    expect(categoryLabel("logging")).toBe("Logging");
  });
});

// ─── wireConsumes ─────────────────────────────────────────────────────────────

describe("wireConsumes — adding a package to app consumes", () => {
  it("adds pkg to targeted app's consumes", () => {
    const apps = [makeApp("web"), makeApp("api")];
    const result = wireConsumes(apps, "ui", new Set(["web"]));
    expect(result[0]?.consumes).toContain("ui");
    expect(result[1]?.consumes).not.toContain("ui");
  });

  it("adds pkg to multiple targeted apps", () => {
    const apps = [makeApp("web"), makeApp("api")];
    const result = wireConsumes(apps, "ui", new Set(["web", "api"]));
    expect(result[0]?.consumes).toContain("ui");
    expect(result[1]?.consumes).toContain("ui");
  });

  it("skips apps not in the target set", () => {
    const apps = [makeApp("web"), makeApp("api")];
    const result = wireConsumes(apps, "ui", new Set(["web"]));
    expect(result[1]?.consumes).toHaveLength(0);
  });

  it("does not add duplicate if app already consumes the pkg", () => {
    const apps = [makeApp("web", ["ui"])];
    const result = wireConsumes(apps, "ui", new Set(["web"]));
    expect(result[0]?.consumes.filter((c) => c === "ui")).toHaveLength(1);
  });

  it("does not mutate original apps array", () => {
    const apps = [makeApp("web")];
    wireConsumes(apps, "ui", new Set(["web"]));
    expect(apps[0]?.consumes).toHaveLength(0);
  });

  it("returns unchanged apps when target set is empty", () => {
    const apps = [makeApp("web"), makeApp("api")];
    const result = wireConsumes(apps, "ui", new Set());
    expect(result[0]?.consumes).toHaveLength(0);
    expect(result[1]?.consumes).toHaveLength(0);
  });

  it("preserves existing consumes entries", () => {
    const apps = [makeApp("web", ["db"])];
    const result = wireConsumes(apps, "ui", new Set(["web"]));
    expect(result[0]?.consumes).toContain("db");
    expect(result[0]?.consumes).toContain("ui");
  });
});

// ─── INTEGRATION_PROVIDER_VALUES — schema contract ───────────────────────────

describe("INTEGRATION_PROVIDER_VALUES", () => {
  it("analytics includes 'posthog' and 'none'", () => {
    const values = INTEGRATION_PROVIDER_VALUES.analytics;
    expect(values).toContain("posthog");
    expect(values).toContain("none");
  });

  it("errorTracking includes 'sentry'", () => {
    expect(INTEGRATION_PROVIDER_VALUES.errorTracking).toContain("sentry");
  });

  it("email includes 'resend'", () => {
    expect(INTEGRATION_PROVIDER_VALUES.email).toContain("resend");
  });

  it("unknown category key is undefined", () => {
    expect(
      INTEGRATION_PROVIDER_VALUES["unknown" as keyof typeof INTEGRATION_PROVIDER_VALUES],
    ).toBeUndefined();
  });

  it("every INTEGRATION_OPTION_CATEGORIES key has provider values", () => {
    for (const category of INTEGRATION_OPTION_CATEGORIES) {
      const values =
        INTEGRATION_PROVIDER_VALUES[category as keyof typeof INTEGRATION_PROVIDER_VALUES];
      expect(values, `category "${category}" should have provider values`).toBeDefined();
      expect(
        values!.length,
        `category "${category}" should have at least one value`,
      ).toBeGreaterThan(0);
    }
  });
});

// ─── port conflict logic ──────────────────────────────────────────────────────

describe("port conflict detection (pure predicate)", () => {
  const existingPorts = [3000, 3001];
  const isConflict = (port: number) =>
    Number.isNaN(port) || port < 1024 || port > 65535 || existingPorts.includes(port);

  it("detects an already-used port", () => {
    expect(isConflict(3000)).toBe(true);
    expect(isConflict(3001)).toBe(true);
  });

  it("accepts an unused port", () => {
    expect(isConflict(3002)).toBe(false);
  });

  it("rejects port below 1024", () => {
    expect(isConflict(80)).toBe(true);
    expect(isConflict(1023)).toBe(true);
  });

  it("accepts port 1024", () => {
    expect(isConflict(1024)).toBe(false);
  });

  it("rejects port above 65535", () => {
    expect(isConflict(65536)).toBe(true);
  });

  it("accepts port 65535", () => {
    expect(isConflict(65535)).toBe(false);
  });

  it("rejects NaN", () => {
    expect(isConflict(Number.NaN)).toBe(true);
  });
});
