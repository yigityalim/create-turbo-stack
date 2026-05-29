/**
 * Workspace location tests — covers the cases the previous flat-only design
 * couldn't express:
 *   - `tooling/`, `infrastructure/`, `services/` as top-level collections
 *   - `packages/billing/*` nested sub-collection (NOT a flat group inside
 *     `packages/*` — Turborepo treats each location as an independent glob)
 *   - mixing custom + default locations
 *   - auto-packages relocated via `autoPackageLocations`
 */

import type { Preset } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { makePreset, UI_PKG, UTILS_PKG, WEB_APP } from "../preset-factory";
import {
  appDirOf,
  autoPackageDir,
  distinctLocations,
  packageDirByName,
  packageDirOf,
  workspaceGlobs,
} from "./package-path";

describe("packageDirOf", () => {
  it("defaults to packages/<name>", () => {
    expect(packageDirOf(UI_PKG)).toBe("packages/ui");
  });

  it("respects a custom location (top-level collection)", () => {
    expect(packageDirOf({ ...UI_PKG, location: "tooling" })).toBe("tooling/ui");
  });

  it("respects a nested location (sub-collection)", () => {
    expect(packageDirOf({ ...UI_PKG, name: "u", location: "packages/billing" })).toBe(
      "packages/billing/u",
    );
  });
});

describe("appDirOf", () => {
  it("defaults to apps/<name>", () => {
    expect(appDirOf(WEB_APP)).toBe("apps/web");
  });

  it("respects a custom location (e.g. services/api)", () => {
    expect(appDirOf({ ...WEB_APP, name: "api", location: "services" })).toBe("services/api");
  });
});

describe("autoPackageDir", () => {
  it("defaults to packages/<name>", () => {
    const preset = makePreset();
    expect(autoPackageDir("typescript-config", preset)).toBe("packages/typescript-config");
  });

  it("uses preset.autoPackageLocations override", () => {
    const preset = makePreset({
      autoPackageLocations: { "typescript-config": "tooling", db: "packages/data" },
    });
    expect(autoPackageDir("typescript-config", preset)).toBe("tooling/typescript-config");
    expect(autoPackageDir("db", preset)).toBe("packages/data/db");
  });
});

describe("packageDirByName", () => {
  it("finds user packages first", () => {
    const preset = makePreset({
      packages: [{ ...UI_PKG, location: "packages/ui-kit" }],
    });
    expect(packageDirByName("ui", preset)).toBe("packages/ui-kit/ui");
  });

  it("falls back to auto-package lookup", () => {
    const preset = makePreset({
      autoPackageLocations: { "typescript-config": "tooling" },
    });
    expect(packageDirByName("typescript-config", preset)).toBe("tooling/typescript-config");
  });
});

describe("distinctLocations", () => {
  it("returns just the defaults when nothing custom is set", () => {
    const preset = makePreset({ apps: [WEB_APP], packages: [UI_PKG] });
    expect(distinctLocations(preset)).toEqual(["apps", "packages"]);
  });

  it("collects every custom location (sorted, deduped)", () => {
    const preset = makePreset({
      apps: [{ ...WEB_APP, location: "services" }],
      packages: [
        { ...UI_PKG, location: "tooling" },
        { ...UTILS_PKG, location: "packages/billing" },
      ],
      // typescript-config (the only default auto-package) → "tooling", so
      // the resolver doesn't add a stray "packages" entry.
      autoPackageLocations: { "typescript-config": "tooling" },
    });
    expect(distinctLocations(preset)).toEqual(["packages/billing", "services", "tooling"]);
  });

  it("default makePreset gives ['apps', 'packages'] when apps exist", () => {
    const preset = makePreset({ apps: [WEB_APP], packages: [UI_PKG] });
    expect(distinctLocations(preset)).toEqual(["apps", "packages"]);
  });

  it("omits 'apps' when there are no apps", () => {
    const preset = makePreset({ apps: [], packages: [UI_PKG] });
    expect(distinctLocations(preset)).toEqual(["packages"]);
  });
});

describe("workspaceGlobs", () => {
  it("emits one glob per distinct location", () => {
    const preset = makePreset({
      apps: [WEB_APP],
      packages: [
        UI_PKG,
        { ...UTILS_PKG, location: "tooling" },
        {
          name: "p2",
          type: "library",
          location: "packages/billing",
          producesCSS: false,
          exports: ["."],
        },
      ],
    });
    expect(workspaceGlobs(preset)).toEqual([
      "apps/*",
      "packages/*",
      "packages/billing/*",
      "tooling/*",
    ]);
  });

  it("treats packages/billing as a sibling of packages, not nested", () => {
    // Sanity: the spec calls out that `packages/billing/*` is its own glob,
    // not a sub-form of `packages/*`. Order in the output is sort-determined.
    const preset = makePreset({
      apps: [],
      packages: [
        {
          name: "b",
          type: "library",
          location: "packages/billing",
          producesCSS: false,
          exports: ["."],
        },
      ],
    });
    const globs = workspaceGlobs(preset);
    expect(globs).toContain("packages/billing/*");
    // `packages/*` is still present because env (auto) defaults there.
    expect(globs).toContain("packages/*");
  });
});

describe("schema collision validation (integration)", () => {
  it("blocks a location that equals an existing member path", async () => {
    const { ValidatedPresetSchema } = await import("@create-turbo-stack/schema");
    const preset: Preset = makePreset({
      apps: [WEB_APP],
      // Package `billing` at `packages/billing` AND another at `packages/billing/p1`
      // would mean `packages/billing/` is both a workspace member and a glob root.
      packages: [
        {
          name: "billing",
          type: "library",
          location: "packages",
          producesCSS: false,
          exports: ["."],
        },
        {
          name: "p1",
          type: "library",
          location: "packages/billing",
          producesCSS: false,
          exports: ["."],
        },
      ],
    });
    const result = ValidatedPresetSchema.safeParse(preset);
    expect(result.success).toBe(false);
    if (!result.success) {
      const collision = result.error.issues.find((i) => i.message.includes("collides"));
      expect(collision).toBeDefined();
    }
  });
});
