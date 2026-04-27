import { afterEach, describe, expect, it } from "vitest";
import {
  clearRegisteredTemplates,
  getRegisteredTemplates,
  listRegisteredCategories,
  registerTemplates,
} from "./template-registry";

afterEach(clearRegisteredTemplates);

describe("template-registry", () => {
  it("returns empty for an unknown category", () => {
    expect(getRegisteredTemplates("nope")).toEqual({});
  });

  it("registers and reads back a category", () => {
    registerTemplates("app/nuxt", { "src/main.ts.eta": "export {};" });
    expect(getRegisteredTemplates("app/nuxt")).toEqual({ "src/main.ts.eta": "export {};" });
  });

  it("re-registering replaces the previous map", () => {
    registerTemplates("auth/acme", { "a.eta": "1" });
    registerTemplates("auth/acme", { "b.eta": "2" });
    expect(getRegisteredTemplates("auth/acme")).toEqual({ "b.eta": "2" });
  });

  it("listRegisteredCategories reflects active entries", () => {
    registerTemplates("app/nuxt", { "x.eta": "" });
    registerTemplates("auth/acme", { "y.eta": "" });
    expect(new Set(listRegisteredCategories())).toEqual(new Set(["app/nuxt", "auth/acme"]));
  });
});
