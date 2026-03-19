import { describe, expect, it } from "vitest";
import { renderTemplate } from "../../src/render/template-engine";

describe("renderTemplate", () => {
  it("simple interpolation: <%= it.name %> → value", () => {
    expect(renderTemplate("<%= it.name %>", { name: "turbo" })).toBe("turbo");
  });

  it("conditional true branch renders", () => {
    expect(renderTemplate("<% if (it.x) { %>yes<% } %>", { x: true })).toBe("yes");
  });

  it("conditional false branch renders nothing", () => {
    expect(renderTemplate("<% if (it.x) { %>yes<% } %>", { x: false })).toBe("");
  });

  it("loop renders each item", () => {
    const result = renderTemplate("<% for (const i of it.items) { %><%= i %><% } %>", {
      items: ["a", "b", "c"],
    });
    expect(result).toBe("abc");
  });

  it("nested property access: <%= it.a.b.c %>", () => {
    expect(renderTemplate("<%= it.a.b.c %>", { a: { b: { c: "deep" } } })).toBe("deep");
  });

  it("raw output <%~ it.raw %> renders unescaped HTML", () => {
    const result = renderTemplate("<%~ it.raw %>", { raw: "<b>bold</b>" });
    expect(result).toBe("<b>bold</b>");
  });

  it("<%= it.html %> renders raw (autoEscape is false)", () => {
    const result = renderTemplate("<%= it.html %>", {
      html: "<script>alert(1)</script>",
    });
    expect(result).toBe("<script>alert(1)</script>");
  });

  it("empty template → empty string", () => {
    expect(renderTemplate("", {})).toBe("");
  });

  it("template with no interpolation → returns as-is", () => {
    expect(renderTemplate("hello world", {})).toBe("hello world");
  });

  it("multiple interpolations in one template", () => {
    const result = renderTemplate("name: <%= it.name %>, version: <%= it.version %>", {
      name: "pkg",
      version: "1.0.0",
    });
    expect(result).toBe("name: pkg, version: 1.0.0");
  });

  it("numeric context value renders as string", () => {
    expect(renderTemplate("<%= it.port %>", { port: 3000 })).toBe("3000");
  });

  it("boolean context value renders as string", () => {
    expect(renderTemplate("<%= it.flag %>", { flag: true })).toBe("true");
  });

  it("whitespace-only template → returns whitespace", () => {
    expect(renderTemplate("   ", {})).toBe("   ");
  });
});
