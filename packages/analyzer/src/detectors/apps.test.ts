import { afterEach, describe, expect, it } from "vitest";
import { createFixture, removeFixture } from "../test-utils/fixture";
import { detectApps } from "./apps";

let tmp: string;

afterEach(async () => {
  if (tmp) await removeFixture(tmp);
});

describe("detectApps", () => {
  // App type detection

  it("detects nextjs via next dependency", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { next: "15.0.0" } },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].type).toBe("nextjs");
    expect(r.detections[0].confidence).toBe("certain");
  });

  it("detects hono-standalone via hono + @hono/node-server", async () => {
    tmp = await createFixture({
      "apps/server/package.json": {
        dependencies: { hono: "^4.0.0", "@hono/node-server": "^1.0.0" },
      },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].type).toBe("hono-standalone");
    expect(r.detections[0].confidence).toBe("certain");
  });

  it("detects hono-standalone via hono alone", async () => {
    tmp = await createFixture({
      "apps/api/package.json": { dependencies: { hono: "^4.0.0" } },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].type).toBe("hono-standalone");
  });

  it("detects expo via expo dependency", async () => {
    tmp = await createFixture({
      "apps/mobile/package.json": { dependencies: { expo: "~52.0.0" } },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].type).toBe("expo");
    expect(r.detections[0].confidence).toBe("certain");
  });

  it("defaults to nextjs/low when app type is unknown", async () => {
    tmp = await createFixture({
      "apps/other/package.json": { dependencies: { "some-lib": "^1.0.0" } },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].type).toBe("nextjs");
    expect(r.detections[0].confidence).toBe("low");
  });

  // Port detection

  it("extracts port from -p 3001 in dev script", async () => {
    tmp = await createFixture({
      "apps/web/package.json": {
        dependencies: { next: "15.0.0" },
        scripts: { dev: "next dev -p 3001" },
      },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].port).toBe(3001);
  });

  it("extracts port from --port 4000 in dev script", async () => {
    tmp = await createFixture({
      "apps/api/package.json": {
        dependencies: { hono: "^4.0.0" },
        scripts: { dev: "node server.js --port 4000" },
      },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].port).toBe(4000);
  });

  it("extracts port from -p=8080 style", async () => {
    tmp = await createFixture({
      "apps/web/package.json": {
        dependencies: { next: "15.0.0" },
        scripts: { dev: "next dev -p=8080" },
      },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].port).toBe(8080);
  });

  it("assigns port 3000 + index when no port in script", async () => {
    tmp = await createFixture({
      "apps/web/package.json": {
        dependencies: { next: "15.0.0" },
        scripts: { dev: "next dev" },
      },
      "apps/api/package.json": {
        dependencies: { hono: "^4.0.0" },
        scripts: { dev: "node ." },
      },
    });
    const r = await detectApps(tmp, "@scope");
    // Order depends on fs dir listing, but ports should be 3000 and 3001
    const ports = r.apps.map((a) => a.port).sort();
    expect(ports).toEqual([3000, 3001]);
  });

  it("assigns port 3000 when no scripts field at all", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { next: "15.0.0" } },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].port).toBe(3000);
  });

  // i18n detection

  it("sets i18n: true when next-intl is a dependency", async () => {
    tmp = await createFixture({
      "apps/web/package.json": {
        dependencies: { next: "15.0.0", "next-intl": "^3.0.0" },
      },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].i18n).toBe(true);
  });

  it("sets i18n: false when next-intl is absent", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { next: "15.0.0" } },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].i18n).toBe(false);
  });

  // workspace consumes

  it("populates consumes with workspace deps matching scope", async () => {
    tmp = await createFixture({
      "apps/web/package.json": {
        name: "@scope/web",
        dependencies: {
          next: "15.0.0",
          "@scope/ui": "workspace:*",
          "@scope/utils": "workspace:*",
          "@scope/typescript-config": "workspace:*", // excluded
          "@scope/env": "workspace:*", // excluded
        },
      },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].consumes).toContain("ui");
    expect(r.apps[0].consumes).toContain("utils");
    expect(r.apps[0].consumes).not.toContain("typescript-config");
    expect(r.apps[0].consumes).not.toContain("env");
  });

  it("consumes is empty when no workspace deps", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { next: "15.0.0" } },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].consumes).toEqual([]);
  });

  // Multiple apps

  it("returns all apps when multiple exist", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { next: "15.0.0" } },
      "apps/mobile/package.json": { dependencies: { expo: "~52.0.0" } },
      "apps/server/package.json": { dependencies: { hono: "^4.0.0" } },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps.length).toBe(3);
    expect(r.detections.length).toBe(3);
    const types = r.apps.map((a) => a.type).sort();
    expect(types).toContain("nextjs");
    expect(types).toContain("expo");
    expect(types).toContain("hono-standalone");
  });

  // Edge cases

  it("returns empty arrays when apps dir does not exist", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    tmp = await mkdtemp(`${tmpdir()}/apps-no-dir-`);
    const r = await detectApps(tmp, "@scope");
    expect(r.apps).toEqual([]);
    expect(r.detections).toEqual([]);
  });

  it("skips apps with missing or malformed package.json", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    tmp = await fs.mkdtemp(`${os.tmpdir()}/apps-malform-`);
    await fs.mkdir(`${tmp}/apps/web`, { recursive: true });
    await fs.writeFile(`${tmp}/apps/web/package.json`, "NOT JSON");
    await fs.mkdir(`${tmp}/apps/api`, { recursive: true });
    await fs.writeFile(
      `${tmp}/apps/api/package.json`,
      JSON.stringify({ dependencies: { hono: "^4.0.0" } }),
    );
    const r = await detectApps(tmp, "@scope");
    expect(r.apps.length).toBe(1);
    expect(r.apps[0].type).toBe("hono-standalone");
  });

  it("cms is always none", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { next: "15.0.0" } },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].cms).toBe("none");
  });

  it("app name matches directory name", async () => {
    tmp = await createFixture({
      "apps/my-cool-web/package.json": { dependencies: { next: "15.0.0" } },
    });
    const r = await detectApps(tmp, "@scope");
    expect(r.apps[0].name).toBe("my-cool-web");
  });
});
