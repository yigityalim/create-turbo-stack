import { ValidatedPresetSchema } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";

const minimal = {
  schemaVersion: "1.0",
  name: "test",
  version: "0.1.0",
  description: "",
  basics: {
    projectName: "test",
    scope: "@test",
    packageManager: "bun",
    typescript: "strict",
    linter: "biome",
  },
  database: { strategy: "none" },
  api: { strategy: "none" },
  auth: { provider: "none", rbac: false, entitlements: false },
  css: { framework: "tailwind4", ui: "none", styling: "css-variables" },
  integrations: {
    analytics: "none",
    errorTracking: "none",
    email: "none",
    rateLimit: "none",
    ai: "none",
    envValidation: "none",
  },
  apps: [{ name: "web", type: "nextjs", port: 3000, i18n: false, location: "apps", consumes: [] }],
  packages: [],
};

describe("preset validate — unknown fields", () => {
  it("strips unknown top-level fields instead of rejecting", () => {
    const withExtra = { ...minimal, unknownField: true, anotherField: { nested: 1 } };
    const result = ValidatedPresetSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      expect("unknownField" in result.data).toBe(false);
    }
  });

  it("strips unknown fields inside basics", () => {
    const withExtra = {
      ...minimal,
      basics: { ...minimal.basics, futureFlag: "yes" },
    };
    const result = ValidatedPresetSchema.safeParse(withExtra);
    expect(result.success).toBe(true);
    if (result.success) {
      expect("futureFlag" in result.data.basics).toBe(false);
    }
  });
});

describe("preset validate — schema error messages", () => {
  it("reports clear error for wrong apps type", () => {
    const bad = { ...minimal, apps: "not-an-array" };
    const result = ValidatedPresetSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      const appIssue = result.error.issues.find((i) => i.path.includes("apps"));
      expect(appIssue).toBeDefined();
    }
  });

  it("reports clear error for missing projectName", () => {
    const bad = {
      ...minimal,
      basics: { ...minimal.basics, projectName: undefined },
    };
    const result = ValidatedPresetSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("projectName"));
      expect(issue).toBeDefined();
    }
  });

  it("reports clear error for drizzle without driver", () => {
    const bad = { ...minimal, database: { strategy: "drizzle" } };
    const result = ValidatedPresetSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});
