import { afterEach, describe, expect, it } from "vitest";
import { createFixture, removeFixture } from "../test-utils/fixture";
import { detectCss } from "./css";

let tmp: string;

afterEach(async () => {
  if (tmp) await removeFixture(tmp);
});

describe("detectCss", () => {
  // Tailwind v4 detection

  it("detects tailwind4 when tailwindcss in apps/web with no tailwind.config", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { tailwindcss: "^4.0.0" } },
    });
    const r = await detectCss(tmp);
    expect(r.value.framework).toBe("tailwind4");
    expect(r.confidence).toBe("certain");
  });

  it("detects tailwind4 via @tailwindcss/postcss in apps/web", async () => {
    tmp = await createFixture({
      "apps/web/package.json": {
        dependencies: { "@tailwindcss/postcss": "^4.0.0" },
      },
    });
    const r = await detectCss(tmp);
    expect(r.value.framework).toBe("tailwind4");
  });

  // Tailwind v3 detection (tailwind.config present)

  it("detects tailwind3 when tailwind.config.ts exists in app", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { tailwindcss: "^3.4.0" } },
      "apps/web/tailwind.config.ts": "export default {}",
    });
    const r = await detectCss(tmp);
    expect(r.value.framework).toBe("tailwind3");
  });

  it("detects tailwind3 when tailwind.config.js exists in app", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { tailwindcss: "^3.4.0" } },
      "apps/web/tailwind.config.js": "module.exports = {}",
    });
    const r = await detectCss(tmp);
    expect(r.value.framework).toBe("tailwind3");
  });

  // shadcn UI detection via components.json

  it("detects shadcn when components.json exists at root", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { tailwindcss: "^4.0.0" } },
      "components.json": { style: "default" },
    });
    const r = await detectCss(tmp);
    expect(r.value.ui).toBe("shadcn");
  });

  it("detects shadcn when components.json exists inside app dir", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { tailwindcss: "^4.0.0" } },
      "apps/web/components.json": { style: "default" },
    });
    const r = await detectCss(tmp);
    expect(r.value.ui).toBe("shadcn");
  });

  it("ui is none when no components.json anywhere", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { tailwindcss: "^4.0.0" } },
    });
    const r = await detectCss(tmp);
    expect(r.value.ui).toBe("none");
  });

  // Styling default

  it("always sets styling to css-variables", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { tailwindcss: "^4.0.0" } },
    });
    const r = await detectCss(tmp);
    expect(r.value.styling).toBe("css-variables");
  });

  // Vanilla CSS fallback

  it("returns vanilla/none when no tailwind found anywhere", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { react: "^19.0.0" } },
    });
    const r = await detectCss(tmp);
    expect(r.value.framework).toBe("vanilla");
    expect(r.value.ui).toBe("none");
    expect(r.confidence).toBe("medium");
  });

  it("returns vanilla for completely bare project", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    tmp = await mkdtemp(`${tmpdir()}/css-bare-`);
    const r = await detectCss(tmp);
    expect(r.value.framework).toBe("vanilla");
  });

  // Multiple apps — first app with tailwind wins

  it("detects tailwind when found in second app (first has no tailwind)", async () => {
    tmp = await createFixture({
      "apps/api/package.json": { dependencies: { hono: "^4.0.0" } },
      "apps/web/package.json": { dependencies: { tailwindcss: "^4.0.0" } },
    });
    const r = await detectCss(tmp);
    // listDirs order is filesystem-dependent, but tailwind must be found
    expect(r.value.framework).not.toBe("vanilla");
  });

  // Root tailwind dep (not in apps)

  it("detects tailwind4 from root package.json when apps have none", async () => {
    tmp = await createFixture({
      "package.json": { dependencies: { tailwindcss: "^4.0.0" } },
    });
    const r = await detectCss(tmp);
    // Root fallback: sets hasTailwind but not the version (stays tailwind4 default)
    expect(r.value.framework).toBe("tailwind4");
  });

  // Edge cases

  it("does not crash when apps dir has no package.json", async () => {
    const { mkdir } = await import("node:fs/promises");
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    tmp = await mkdtemp(`${tmpdir()}/css-empty-app-`);
    await mkdir(`${tmp}/apps/web`, { recursive: true });
    // No package.json inside apps/web
    const r = await detectCss(tmp);
    expect(r.value.framework).toBe("vanilla");
  });

  it("handles malformed apps package.json without throwing", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    tmp = await fs.mkdtemp(`${os.tmpdir()}/css-malform-`);
    await fs.mkdir(`${tmp}/apps/web`, { recursive: true });
    await fs.writeFile(`${tmp}/apps/web/package.json`, "INVALID JSON");
    const r = await detectCss(tmp);
    expect(r.value.framework).toBe("vanilla");
  });

  it("reason string is non-empty for all paths", async () => {
    tmp = await createFixture({
      "apps/web/package.json": { dependencies: { tailwindcss: "^4.0.0" } },
      "apps/web/components.json": {},
    });
    const r = await detectCss(tmp);
    expect(r.reason.length).toBeGreaterThan(0);
  });
});
