import { describe, expect, it } from "vitest";
import { getPmCommands, substitutePm } from "./pm";

describe("getPmCommands", () => {
  it("emits bun commands", () => {
    const c = getPmCommands("bun");
    expect(c.install).toBe("bun install");
    expect(c.add("zod")).toBe("bun add zod");
    expect(c.addDev("vitest")).toBe("bun add -d vitest");
    expect(c.run("dev")).toBe("bun run dev");
    expect(c.exec("shadcn-ui add button")).toBe("bunx shadcn-ui add button");
  });

  it("emits pnpm commands (no `run` for scripts)", () => {
    const c = getPmCommands("pnpm");
    expect(c.install).toBe("pnpm install");
    expect(c.run("dev")).toBe("pnpm dev");
    expect(c.exec("create-something")).toBe("pnpm dlx create-something");
    expect(c.addDev("vitest")).toBe("pnpm add -D vitest");
  });

  it("emits npm commands (needs `run` for scripts)", () => {
    const c = getPmCommands("npm");
    expect(c.install).toBe("npm install");
    expect(c.add("zod")).toBe("npm install zod");
    expect(c.run("dev")).toBe("npm run dev");
    expect(c.exec("create-something")).toBe("npx create-something");
  });

  it("emits yarn commands", () => {
    const c = getPmCommands("yarn");
    expect(c.run("dev")).toBe("yarn dev");
    expect(c.exec("create-something")).toBe("yarn dlx create-something");
  });
});

describe("substitutePm — extraFiles placeholders", () => {
  it("substitutes a README template against bun", () => {
    const md = "# Setup\n\nRun `{{pm-install}}` then `{{pm-run dev}}`.\n";
    expect(substitutePm(md, "bun")).toBe("# Setup\n\nRun `bun install` then `bun run dev`.\n");
  });

  it("substitutes against pnpm (no `run` keyword)", () => {
    const md = "Try `{{pm-run lint}}` or `{{pm-add @scope/foo}}`.";
    expect(substitutePm(md, "pnpm")).toBe("Try `pnpm lint` or `pnpm add @scope/foo`.");
  });

  it("substitutes `{{pm-add-dev}}` distinctly from `{{pm-add}}`", () => {
    const md = "{{pm-add zod}} vs {{pm-add-dev vitest}}";
    expect(substitutePm(md, "npm")).toBe("npm install zod vs npm install -D vitest");
  });

  it("substitutes the bare `{{pm}}` token", () => {
    expect(substitutePm("This project uses {{pm}}.", "yarn")).toBe("This project uses yarn.");
  });

  it("supports `{{pm-exec}}` for one-shot dlx-style commands", () => {
    expect(substitutePm("Try {{pm-exec shadcn-ui add button}}", "pnpm")).toBe(
      "Try pnpm dlx shadcn-ui add button",
    );
  });

  it("is a no-op when content has no placeholders", () => {
    const md = "Plain README with no PM placeholders.";
    expect(substitutePm(md, "bun")).toBe(md);
  });

  it("leaves unrelated `{{…}}` text alone", () => {
    const md = "Template syntax {{user.name}} stays as-is.";
    expect(substitutePm(md, "bun")).toBe(md);
  });

  it("handles multiple placeholders in one file", () => {
    const md = `# Quick start

\`\`\`sh
{{pm-install}}
{{pm-run dev}}
\`\`\`

To add a package: \`{{pm-add @scope/foo}}\`.
`;
    expect(substitutePm(md, "pnpm")).toBe(`# Quick start

\`\`\`sh
pnpm install
pnpm dev
\`\`\`

To add a package: \`pnpm add @scope/foo\`.
`);
  });
});
