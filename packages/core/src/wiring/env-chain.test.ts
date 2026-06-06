import type { PackageRegistryItem } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { makePreset, WEB_APP } from "../preset-factory";
import { computeEnvChain } from "./env-chain";

function item(envVars: Record<string, string>, name = "test-item"): PackageRegistryItem {
  return {
    name,
    type: "registry:package",
    description: "test",
    dependencies: [],
    devDependencies: [],
    registryDependencies: [],
    envVars,
    exports: ["."],
    build: "none",
    categories: [],
    files: [],
  };
}

// ─── Empty state ───────────────────────────────────────────────────────────────

describe("computeEnvChain — empty state", () => {
  it("returns empty base when no items and no apps", () => {
    const chain = computeEnvChain(makePreset());
    expect(chain.base.server).toHaveLength(0);
    expect(chain.base.client).toHaveLength(0);
    expect(chain.allVars).toHaveLength(0);
    expect(chain.globalEnv).toHaveLength(0);
  });

  it("creates an entry for each app even with no env vars", () => {
    const preset = makePreset({ apps: [WEB_APP] });
    const chain = computeEnvChain(preset);
    expect(chain.apps.web).toBeDefined();
  });
});

// ─── Server env vars from items ────────────────────────────────────────────────

describe("computeEnvChain — server env vars", () => {
  it("places non-NEXT_PUBLIC_ vars in base.server", () => {
    const chain = computeEnvChain(makePreset(), [
      item({ DATABASE_URL: "postgres://localhost/test" }),
    ]);
    const names = chain.base.server.map((v) => v.name);
    expect(names).toContain("DATABASE_URL");
    expect(chain.base.client.map((v) => v.name)).not.toContain("DATABASE_URL");
  });

  it("preserves the example value from the item", () => {
    const chain = computeEnvChain(makePreset(), [
      item({ DATABASE_URL: "postgres://localhost/test" }),
    ]);
    const v = chain.base.server.find((v) => v.name === "DATABASE_URL");
    expect(v?.example).toBe("postgres://localhost/test");
  });

  it("defaults zodType to z.string()", () => {
    const chain = computeEnvChain(makePreset(), [item({ MY_SECRET: "abc" })]);
    const v = chain.base.server.find((v) => v.name === "MY_SECRET");
    expect(v?.zodType).toBe("z.string()");
  });
});

// ─── Client env vars from items ────────────────────────────────────────────────

describe("computeEnvChain — client env vars (NEXT_PUBLIC_)", () => {
  it("places NEXT_PUBLIC_ vars in base.client", () => {
    const chain = computeEnvChain(makePreset(), [
      item({ NEXT_PUBLIC_API_URL: "http://localhost:3001" }),
    ]);
    const names = chain.base.client.map((v) => v.name);
    expect(names).toContain("NEXT_PUBLIC_API_URL");
    expect(chain.base.server.map((v) => v.name)).not.toContain("NEXT_PUBLIC_API_URL");
  });
});

// ─── Deduplication ────────────────────────────────────────────────────────────

describe("computeEnvChain — deduplication", () => {
  it("dedupes the same env var from multiple items", () => {
    const chain = computeEnvChain(makePreset(), [
      item({ SUPABASE_URL: "https://a.supabase.co" }, "item-a"),
      item({ SUPABASE_URL: "https://b.supabase.co" }, "item-b"),
    ]);
    const dupes = chain.base.server.filter((v) => v.name === "SUPABASE_URL");
    expect(dupes).toHaveLength(1);
    // First occurrence wins
    expect(dupes[0].example).toBe("https://a.supabase.co");
  });

  it("dedupes across server and does not move a var already added to server", () => {
    const chain = computeEnvChain(makePreset(), [
      item({ API_KEY: "key1" }, "item-a"),
      item({ API_KEY: "key2" }, "item-b"),
    ]);
    const allServerNames = chain.base.server.map((v) => v.name);
    expect(allServerNames.filter((n) => n === "API_KEY")).toHaveLength(1);
  });
});

// ─── App-level vars (Next.js) ──────────────────────────────────────────────────

describe("computeEnvChain — Next.js app vars", () => {
  const preset = makePreset({ apps: [WEB_APP] });

  it("adds NEXT_PUBLIC_APP_URL to the app's client vars", () => {
    const chain = computeEnvChain(preset);
    const appVars = chain.apps.web.client;
    expect(appVars.map((v) => v.name)).toContain("NEXT_PUBLIC_APP_URL");
  });

  it("sets example to http://localhost:{port}", () => {
    const chain = computeEnvChain(preset);
    const v = chain.apps.web.client.find((v) => v.name === "NEXT_PUBLIC_APP_URL");
    expect(v?.example).toBe(`http://localhost:${WEB_APP.port}`);
  });

  it("uses z.string().url() for the app URL", () => {
    const chain = computeEnvChain(preset);
    const v = chain.apps.web.client.find((v) => v.name === "NEXT_PUBLIC_APP_URL");
    expect(v?.zodType).toBe("z.string().url()");
  });

  it("does NOT add NEXT_PUBLIC_APP_URL for hono-standalone", () => {
    const preset = makePreset({
      apps: [
        {
          name: "api",
          type: "hono-standalone",
          location: "apps",
          port: 3001,
          i18n: false,
          consumes: [],
        },
      ],
    });
    const chain = computeEnvChain(preset);
    const names = chain.apps.api.client.map((v) => v.name);
    expect(names).not.toContain("NEXT_PUBLIC_APP_URL");
  });
});

// ─── allVars and globalEnv ────────────────────────────────────────────────────

describe("computeEnvChain — allVars and globalEnv", () => {
  it("allVars includes base server + client + all app vars", () => {
    const chain = computeEnvChain(makePreset({ apps: [WEB_APP] }), [
      item({ DATABASE_URL: "postgres://localhost/test" }),
    ]);
    const names = chain.allVars.map((v) => v.name);
    expect(names).toContain("DATABASE_URL");
    expect(names).toContain("NEXT_PUBLIC_APP_URL");
  });

  it("globalEnv is the string array of all var names", () => {
    const chain = computeEnvChain(makePreset({ apps: [WEB_APP] }), [item({ MY_TOKEN: "tok_123" })]);
    expect(chain.globalEnv).toContain("MY_TOKEN");
    expect(chain.globalEnv).toContain("NEXT_PUBLIC_APP_URL");
    // All values are strings
    for (const name of chain.globalEnv) {
      expect(typeof name).toBe("string");
    }
  });
});
