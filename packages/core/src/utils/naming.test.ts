import { describe, expect, it } from "vitest";
import { fullPackageName, scopeToName, slugify } from "../../src/utils/naming";

describe("scopeToName", () => {
  it('"@myorg" → "myorg"', () => {
    expect(scopeToName("@myorg")).toBe("myorg");
  });

  it('"myorg" → "myorg" (no @ prefix)', () => {
    expect(scopeToName("myorg")).toBe("myorg");
  });

  it('"@my-org" → "my-org"', () => {
    expect(scopeToName("@my-org")).toBe("my-org");
  });

  it("empty string → empty string", () => {
    expect(scopeToName("")).toBe("");
  });

  it('"@@double" → "@double" (only first @ stripped)', () => {
    expect(scopeToName("@@double")).toBe("@double");
  });
});

describe("fullPackageName", () => {
  it('("@test", "ui") → "@test/ui"', () => {
    expect(fullPackageName("@test", "ui")).toBe("@test/ui");
  });

  it('("@myorg", "utils") → "@myorg/utils"', () => {
    expect(fullPackageName("@myorg", "utils")).toBe("@myorg/utils");
  });

  it("builds correct path for hyphenated name", () => {
    expect(fullPackageName("@scope", "my-lib")).toBe("@scope/my-lib");
  });
});

describe("slugify", () => {
  it('"My Project" → "my-project"', () => {
    expect(slugify("My Project")).toBe("my-project");
  });

  it('"hello---world" → "hello-world" (collapses dashes)', () => {
    expect(slugify("hello---world")).toBe("hello-world");
  });

  it('"--leading--" → "leading" (trims leading/trailing dashes)', () => {
    expect(slugify("--leading--")).toBe("leading");
  });

  it("lowercases input", () => {
    expect(slugify("UPPER")).toBe("upper");
  });

  it("replaces non-alphanumeric with dashes", () => {
    expect(slugify("hello@world!")).toBe("hello-world");
  });

  it("already valid slug passes through", () => {
    expect(slugify("my-package")).toBe("my-package");
  });

  it("numbers preserved", () => {
    expect(slugify("app2024")).toBe("app2024");
  });

  it("empty string → empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("spaces converted to dashes", () => {
    expect(slugify("create turbo stack")).toBe("create-turbo-stack");
  });
});
