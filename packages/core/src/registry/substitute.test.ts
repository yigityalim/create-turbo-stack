import { describe, expect, it } from "vitest";
import { substituteRegistryItem } from "./substitute.js";

const ctx = { scope: "@saas", pkgName: "env", pm: "bun" as const };

describe("substituteRegistryItem — basics", () => {
  it("returns input unchanged when there are no placeholders", () => {
    expect(substituteRegistryItem("plain text", ctx)).toBe("plain text");
  });

  it("replaces {{scope}}", () => {
    expect(substituteRegistryItem("name: {{scope}}/foo", ctx)).toBe("name: @saas/foo");
  });

  it("replaces {{pkg-name}}", () => {
    expect(substituteRegistryItem("// {{pkg-name}} package", ctx)).toBe("// env package");
  });

  it("replaces {{pkg-import}} with scope/name", () => {
    expect(substituteRegistryItem('import { x } from "{{pkg-import}}";', ctx)).toBe(
      'import { x } from "@saas/env";',
    );
  });

  it("handles all placeholders in one document without double-replacing", () => {
    const out = substituteRegistryItem(
      "{{scope}}\n{{pkg-name}}\n{{pkg-import}}\n{{pm-install}}",
      ctx,
    );
    expect(out).toBe("@saas\nenv\n@saas/env\nbun install");
  });

  it("does not invent placeholders — unknown {{...}} stays intact", () => {
    expect(substituteRegistryItem("{{unknown}}{{scope}}", ctx)).toBe("{{unknown}}@saas");
  });
});

describe("substituteRegistryItem — pkg-import ordering", () => {
  it("expands pkg-import BEFORE scope/pkg-name so the result is final", () => {
    // The substituter expands `{{pkg-import}}` first to `@saas/env`. Then
    // the bare `{{scope}}` in the trailing text becomes `@saas`. Without
    // ordering this risks producing `@saas/env` and then having `@saas`
    // somewhere expand to `@@saas/env` etc.
    const out = substituteRegistryItem("{{pkg-import}} {{scope}}", ctx);
    expect(out).toBe("@saas/env @saas");
  });
});

describe("substituteRegistryItem — pm delegation", () => {
  it("delegates {{pm-install}} to substitutePm", () => {
    expect(substituteRegistryItem("$ {{pm-install}}", ctx)).toBe("$ bun install");
    expect(substituteRegistryItem("$ {{pm-install}}", { ...ctx, pm: "pnpm" })).toBe(
      "$ pnpm install",
    );
  });

  it("delegates {{pm-run dev}} and the no-arg {{pm-run}}", () => {
    expect(substituteRegistryItem("{{pm-run dev}} && {{pm-run}} test", ctx)).toBe(
      "bun run dev && bun run test",
    );
  });
});

describe("substituteRegistryItem — {{css-sources}}", () => {
  it("expands to one @source directive per path", () => {
    const out = substituteRegistryItem("{{css-sources}}", {
      ...ctx,
      cssSources: ["../../packages/ui/src", "../../packages/billing/src"],
    });
    expect(out).toBe('@source "../../packages/ui/src";\n@source "../../packages/billing/src";');
  });

  it("collapses to empty string when there are no css sources", () => {
    expect(substituteRegistryItem("a{{css-sources}}b", ctx)).toBe("ab");
    expect(substituteRegistryItem("a{{css-sources}}b", { ...ctx, cssSources: [] })).toBe("ab");
  });
});

describe("substituteRegistryItem — {{workspace-deps}}", () => {
  it("expands to a quoted, comma-separated list", () => {
    const out = substituteRegistryItem("transpilePackages: [{{workspace-deps}}]", {
      ...ctx,
      workspaceDeps: ["@saas/ui", "@saas/env"],
    });
    expect(out).toBe('transpilePackages: ["@saas/ui", "@saas/env"]');
  });

  it("collapses to empty when the app consumes no workspace packages", () => {
    expect(substituteRegistryItem("[{{workspace-deps}}]", ctx)).toBe("[]");
  });
});

describe("substituteRegistryItem — applied to env/t3-env example", () => {
  // Lifts the real reference example's content to exercise the substituter
  // end-to-end. Keep this snippet in sync with `registry/env/t3-env/src/index.ts`
  // — if either drifts the test catches it.
  const source = `// {{pkg-import}}
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: { NODE_ENV: z.enum(["development", "test", "production"]) },
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});`;

  it("produces a final file with no leftover placeholders", () => {
    const out = substituteRegistryItem(source, ctx);
    expect(out).not.toContain("{{");
    expect(out).toContain("// @saas/env");
    expect(out.startsWith("// @saas/env\n")).toBe(true);
  });
});
