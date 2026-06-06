import { describe, expect, it } from "vitest";
import { makePreset, UI_PKG, UTILS_PKG, WEB_APP } from "../preset-factory";
import { computeCssSourceMap } from "./css-source";

// ─── No CSS-capable apps ───────────────────────────────────────────────────────

describe("computeCssSourceMap — no CSS-capable apps", () => {
  it("returns an empty map when there are no apps", () => {
    const map = computeCssSourceMap(makePreset());
    expect(Object.keys(map)).toHaveLength(0);
  });

  it("does not include hono-standalone (not CSS-capable)", () => {
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
    const map = computeCssSourceMap(preset);
    expect(map.api).toBeUndefined();
  });

  it("does not include expo app", () => {
    const preset = makePreset({
      apps: [
        { name: "mobile", type: "expo", location: "apps", port: 8081, i18n: false, consumes: [] },
      ],
    });
    const map = computeCssSourceMap(preset);
    expect(map.mobile).toBeUndefined();
  });
});

// ─── CSS-capable app, no consumed CSS packages ─────────────────────────────────

describe("computeCssSourceMap — app with no CSS packages consumed", () => {
  it("returns empty sources array for the app", () => {
    const preset = makePreset({ apps: [WEB_APP], packages: [UI_PKG] });
    // WEB_APP.consumes is [], so even though UI_PKG exists, nothing is linked
    const map = computeCssSourceMap(preset);
    expect(map.web).toEqual([]);
  });

  it("ignores non-CSS packages even when consumed", () => {
    const preset = makePreset({
      apps: [{ ...WEB_APP, consumes: ["utils"] }],
      packages: [UTILS_PKG], // UTILS_PKG.producesCSS = false
    });
    const map = computeCssSourceMap(preset);
    expect(map.web).toEqual([]);
  });
});

// ─── CSS-capable app consuming a CSS package ──────────────────────────────────

describe("computeCssSourceMap — app consuming CSS package", () => {
  const preset = makePreset({
    apps: [{ ...WEB_APP, consumes: ["ui"] }],
    packages: [UI_PKG], // UI_PKG.producesCSS = true
  });

  it("includes a @source path for the consumed CSS package", () => {
    const map = computeCssSourceMap(preset);
    expect(map.web).toHaveLength(1);
    expect(map.web[0]).toContain("ui");
  });

  it("@source path is relative (no leading slash, uses '../')", () => {
    const map = computeCssSourceMap(preset);
    const src = map.web[0];
    expect(src).not.toMatch(/^\//);
    expect(src).toMatch(/\.\./);
  });

  it("@source path ends with '/src'", () => {
    const map = computeCssSourceMap(preset);
    expect(map.web[0]).toMatch(/\/src$/);
  });
});

// ─── Multiple CSS packages ────────────────────────────────────────────────────

describe("computeCssSourceMap — multiple CSS packages", () => {
  it("includes one @source path per CSS package consumed", () => {
    const billingPkg = {
      ...UI_PKG,
      name: "billing",
      producesCSS: true,
    };
    const preset = makePreset({
      apps: [{ ...WEB_APP, consumes: ["ui", "billing"] }],
      packages: [UI_PKG, billingPkg],
    });
    const map = computeCssSourceMap(preset);
    expect(map.web).toHaveLength(2);
  });
});

// ─── Multiple apps ────────────────────────────────────────────────────────────

describe("computeCssSourceMap — multiple apps", () => {
  it("computes sources independently per app", () => {
    const adminApp = {
      name: "admin",
      type: "nextjs" as const,
      location: "apps",
      port: 3001,
      i18n: false,
      consumes: [] as string[],
    };
    const preset = makePreset({
      apps: [{ ...WEB_APP, consumes: ["ui"] }, adminApp],
      packages: [UI_PKG],
    });
    const map = computeCssSourceMap(preset);
    expect(map.web).toHaveLength(1);
    expect(map.admin).toHaveLength(0);
  });

  it("non-CSS app is absent from the map entirely", () => {
    const apiApp = {
      name: "api",
      type: "hono-standalone" as const,
      location: "apps",
      port: 3001,
      i18n: false,
      consumes: [] as string[],
    };
    const preset = makePreset({
      apps: [{ ...WEB_APP, consumes: ["ui"] }, apiApp],
      packages: [UI_PKG],
    });
    const map = computeCssSourceMap(preset);
    expect(Object.keys(map)).toContain("web");
    expect(Object.keys(map)).not.toContain("api");
  });
});

// ─── Custom locations ─────────────────────────────────────────────────────────

describe("computeCssSourceMap — custom locations", () => {
  it("adapts @source path when package is in a non-default location", () => {
    const customUiPkg = { ...UI_PKG, location: "libs" };
    const preset = makePreset({
      apps: [{ ...WEB_APP, consumes: ["ui"] }],
      packages: [customUiPkg],
    });
    const defaultPreset = makePreset({
      apps: [{ ...WEB_APP, consumes: ["ui"] }],
      packages: [UI_PKG],
    });
    const customMap = computeCssSourceMap(preset);
    const defaultMap = computeCssSourceMap(defaultPreset);
    // Path must change when package moves from packages/ to libs/
    expect(customMap.web[0]).not.toBe(defaultMap.web[0]);
    expect(customMap.web[0]).toContain("libs");
  });
});
