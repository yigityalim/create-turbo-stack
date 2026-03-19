import { describe, expect, it } from "vitest";
import { VERSIONS } from "../../src/wiring/versions";

describe("VERSIONS", () => {
  it("is defined and is an object", () => {
    expect(VERSIONS).toBeDefined();
    expect(typeof VERSIONS).toBe("object");
  });

  it("has more than 30 keys", () => {
    expect(Object.keys(VERSIONS).length).toBeGreaterThan(30);
  });

  it("all values are non-empty strings", () => {
    for (const [key, value] of Object.entries(VERSIONS)) {
      expect(typeof value, `${key} should be string`).toBe("string");
      expect((value as string).length, `${key} should be non-empty`).toBeGreaterThan(0);
    }
  });

  it("all values match semver-compatible pattern (^x.y.z or ~x.y.z or x.y.z)", () => {
    const semverPattern = /^[\^~]?\d+\.\d+\.\d+/;
    for (const [key, value] of Object.entries(VERSIONS)) {
      expect(semverPattern.test(value as string), `${key}: "${value}" not semver`).toBe(true);
    }
  });

  it("contains expected core keys", () => {
    const required = ["typescript", "biome", "next", "react", "zod", "drizzleOrm", "trpcServer"];
    for (const key of required) {
      expect(VERSIONS).toHaveProperty(key);
    }
  });

  it("typescript version starts with ^5", () => {
    expect(VERSIONS.typescript).toMatch(/^\^5/);
  });

  it("next version starts with ^15", () => {
    expect(VERSIONS.next).toMatch(/^\^15/);
  });

  it("react version starts with ^19", () => {
    expect(VERSIONS.react).toMatch(/^\^19/);
  });
});
