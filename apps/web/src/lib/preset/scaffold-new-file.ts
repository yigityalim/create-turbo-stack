/**
 * Sample content for files the user creates via the preview tree's
 * "New file" right-click. Empty files feel like a bug — at minimum we
 * stamp an import-path comment so the user sees what the new module's
 * fully-qualified name will be.
 *
 * For TS/JS modules we also drop `export {};` so the file is a valid
 * module from the first save (the resolver wires `verbatimModuleSyntax`
 * everywhere, which would otherwise flag a bare empty .ts).
 *
 * The helper is intentionally pure — no dom, no scope-from-context lookups
 * — so other surfaces (CLI, MCP, snapshot tests) can reuse it.
 */

const TS_EXTS = new Set(["ts", "tsx", "mts", "cts"]);
const JS_EXTS = new Set(["js", "jsx", "mjs", "cjs"]);
const TEST_RE = /\.(test|spec|bench)\.(m?[jt]sx?)$/;

export function scaffoldNewFileContent({
  relativePath,
  packageName,
  scope,
}: {
  /** Package-relative path the user typed, e.g. `client.ts` or `server/route.ts`. */
  relativePath: string;
  /** Package short name (no scope), e.g. `billing-paytr`. */
  packageName: string;
  /** Scope from `preset.basics.scope`, e.g. `@saas`. May be missing on edge presets. */
  scope: string | undefined;
}): string {
  const name = relativePath.split("/").pop() ?? "";

  // Folder marker — leave empty so the engine treats it as a placeholder.
  if (name === ".gitkeep") return "";

  const ext = extensionOf(name);
  const isTs = ext != null && TS_EXTS.has(ext);
  const isJs = ext != null && JS_EXTS.has(ext);

  // Import-path comment: `@scope/pkg/<subpath without extension>`. Used by
  // a few code generators in the broader ecosystem (vscode "Reveal in file
  // explorer" hover, etc.), and makes the file self-documenting at a glance.
  const fqn = `${scope ?? "@local"}/${packageName}/${stripExtension(relativePath)}`;

  if (isTs || isJs) {
    if (TEST_RE.test(name)) {
      const testSubject = stripExtension(name).replace(
        /\.(test|spec|bench)$/,
        "",
      );
      return [
        `// ${fqn}`,
        `import { describe, expect, it } from "vitest";`,
        ``,
        `describe("${testSubject || packageName}", () => {`,
        `  it("works", () => {`,
        `    expect(true).toBe(true);`,
        `  });`,
        `});`,
        ``,
      ].join("\n");
    }
    return [`// ${fqn}`, `export {};`, ``].join("\n");
  }

  if (ext === "md") return `# ${prettyTitle(stripExtension(name))}\n`;
  if (ext === "mdx") return `# ${prettyTitle(stripExtension(name))}\n`;
  if (ext === "json") return `{}\n`;
  if (ext === "css") return `/* ${fqn} */\n`;
  if (ext === "scss") return `// ${fqn}\n`;

  // Unknown extension — emit just the FQN comment if the file looks textual
  // (no clue what comment syntax is appropriate, so keep it empty).
  return "";
}

function extensionOf(name: string): string | null {
  // Dotfile with no further extension (".env", ".gitignore") — treat the
  // bareword as the extension for lookup purposes.
  if (name.startsWith(".") && !name.includes(".", 1)) return name.slice(1);
  const idx = name.lastIndexOf(".");
  if (idx <= 0) return null;
  return name.slice(idx + 1);
}

function stripExtension(path: string): string {
  // Drop only the FINAL extension. `client.test.ts` → `client.test` so the
  // FQN keeps the test/spec/bench distinction intact.
  const idx = path.lastIndexOf(".");
  if (idx <= 0) return path;
  // Don't strip a leading dot — `.env` should stay `.env`.
  const lastSlash = path.lastIndexOf("/");
  if (idx === lastSlash + 1) return path;
  return path.slice(0, idx);
}

function prettyTitle(raw: string): string {
  return raw.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
