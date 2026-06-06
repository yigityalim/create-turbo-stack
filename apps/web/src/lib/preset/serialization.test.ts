import type { Preset } from "@create-turbo-stack/schema";
import { IntegrationsSchema } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import {
  compressPreset,
  decompressPreset,
  generateCliPresetURL,
  generateShareURL,
} from "./serialization";

function basePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    schemaVersion: "1.0",
    name: "test",
    version: "0.1.0",
    description: "",
    basics: {
      projectName: "test-project",
      scope: "@test",
      packageManager: "bun",
      typescript: "strict",
      linter: "biome",
      gitInit: false,
    },
    database: { strategy: "none" },
    api: { strategy: "none" },
    auth: { provider: "none", rbac: false, entitlements: false },
    css: { framework: "tailwind4", ui: "none", styling: "css-variables" },
    integrations: IntegrationsSchema.parse({ envValidation: "none" }),
    apps: [
      {
        name: "web",
        type: "nextjs",
        port: 3000,
        i18n: false,
        location: "apps",
        consumes: [],
      },
    ],
    packages: [],
    ...overrides,
  };
}

// ─── compressPreset ───────────────────────────────────────────────────────────

describe("compressPreset", () => {
  it("returns a non-empty string", async () => {
    const result = await compressPreset(basePreset());
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("starts with the version prefix 'v1:'", async () => {
    const result = await compressPreset(basePreset());
    expect(result.startsWith("v1:")).toBe(true);
  });

  it("produces URL-safe characters (no +, /, =)", async () => {
    const result = await compressPreset(basePreset());
    expect(result).not.toMatch(/[+/=]/);
  });
});

// ─── decompressPreset ─────────────────────────────────────────────────────────

describe("decompressPreset", () => {
  it("returns null for a non-prefixed string", async () => {
    expect(await decompressPreset("invalid")).toBeNull();
  });

  it("returns null for an empty string", async () => {
    expect(await decompressPreset("")).toBeNull();
  });

  it("returns null for corrupted base64", async () => {
    expect(await decompressPreset("v1:!!!not-valid!!!")).toBeNull();
  });
});

// ─── round-trip ───────────────────────────────────────────────────────────────

describe("compressPreset → decompressPreset round-trip", () => {
  it("reconstructs a minimal preset faithfully", async () => {
    const original = basePreset();
    const compressed = await compressPreset(original);
    const restored = await decompressPreset(compressed);
    expect(restored).not.toBeNull();
    expect(restored?.basics.projectName).toBe("test-project");
    expect(restored?.basics.packageManager).toBe("bun");
  });

  it("preserves database strategy after round-trip", async () => {
    const preset = basePreset({
      database: { strategy: "drizzle", driver: "postgres" },
    });
    const restored = await decompressPreset(await compressPreset(preset));
    expect(restored?.database.strategy).toBe("drizzle");
    expect((restored?.database as { driver?: string })?.driver).toBe(
      "postgres",
    );
  });

  it("preserves integrations after round-trip", async () => {
    const preset = basePreset({
      integrations: IntegrationsSchema.parse({
        analytics: "posthog",
        envValidation: "none",
      }),
    });
    const restored = await decompressPreset(await compressPreset(preset));
    expect(restored?.integrations.analytics).toBe("posthog");
  });

  it("preserves multiple apps after round-trip", async () => {
    const preset = basePreset({
      apps: [
        {
          name: "web",
          type: "nextjs",
          port: 3000,
          i18n: false,
          location: "apps",
          consumes: [],
        },
        {
          name: "api",
          type: "hono-standalone",
          port: 3001,
          i18n: false,
          location: "apps",
          consumes: [],
        },
      ],
    });
    const restored = await decompressPreset(await compressPreset(preset));
    expect(restored?.apps).toHaveLength(2);
    expect(restored?.apps[1]?.name).toBe("api");
  });

  it("round-trip produces valid schema (not null)", async () => {
    const preset = basePreset({
      css: { framework: "tailwind4", ui: "shadcn", styling: "css-variables" },
      auth: { provider: "clerk", rbac: true, entitlements: false },
    });
    const restored = await decompressPreset(await compressPreset(preset));
    expect(restored).not.toBeNull();
    expect(restored?.css.ui).toBe("shadcn");
    expect(restored?.auth.provider).toBe("clerk");
    expect(restored?.auth.rbac).toBe(true);
  });
});

// ─── generateCliPresetURL ─────────────────────────────────────────────────────

describe("generateCliPresetURL", () => {
  it("starts with the provided baseURL + /api/preset?p=", async () => {
    const url = await generateCliPresetURL(basePreset(), "https://example.com");
    expect(url.startsWith("https://example.com/api/preset?p=v1:")).toBe(true);
  });
});

// ─── generateShareURL ─────────────────────────────────────────────────────────

describe("generateShareURL", () => {
  it("starts with the provided baseURL + /builder?p=", async () => {
    const url = await generateShareURL(basePreset(), "https://example.com");
    expect(url.startsWith("https://example.com/builder?p=v1:")).toBe(true);
  });
});
