import type { Package } from "@create-turbo-stack/schema";
import { describe, expect, it } from "vitest";
import { computeExportsMap } from "../../src/wiring/exports-map";

describe("computeExportsMap", () => {
  it('exports: ["."] → {".":{types,default both ./src/index.ts}}', () => {
    const pkg: Package = {
      name: "ui",
      type: "ui",
      producesCSS: true,
      exports: ["."],
    };
    const map = computeExportsMap(pkg);
    expect(map["."]).toEqual({
      types: "./src/index.ts",
      default: "./src/index.ts",
    });
  });

  it('exports: [".", "./client"] → two entries', () => {
    const pkg: Package = {
      name: "auth",
      type: "library",
      producesCSS: false,
      exports: [".", "./client"],
    };
    const map = computeExportsMap(pkg);
    expect(Object.keys(map)).toHaveLength(2);
    expect(map["./client"]).toEqual({
      types: "./src/client.ts",
      default: "./src/client.ts",
    });
  });

  it('exports: [".", "./server", "./client", "./middleware"] → four entries', () => {
    const pkg: Package = {
      name: "auth",
      type: "library",
      producesCSS: false,
      exports: [".", "./server", "./client", "./middleware"],
    };
    const map = computeExportsMap(pkg);
    expect(Object.keys(map)).toHaveLength(4);
    expect(map["./server"]).toEqual({
      types: "./src/server.ts",
      default: "./src/server.ts",
    });
    expect(map["./middleware"]).toEqual({
      types: "./src/middleware.ts",
      default: "./src/middleware.ts",
    });
  });

  it("subpath resolves correctly: ./utils → src/utils.ts", () => {
    const pkg: Package = {
      name: "core",
      type: "library",
      producesCSS: false,
      exports: ["./utils"],
    };
    const map = computeExportsMap(pkg);
    expect(map["./utils"]).toEqual({
      types: "./src/utils.ts",
      default: "./src/utils.ts",
    });
  });

  it("empty exports array → empty map", () => {
    const pkg: Package = {
      name: "bare",
      type: "library",
      producesCSS: false,
      exports: [],
    };
    expect(computeExportsMap(pkg)).toEqual({});
  });

  it("types and default always point to same file", () => {
    const pkg: Package = {
      name: "ui",
      type: "ui",
      producesCSS: true,
      exports: [".", "./client", "./server"],
    };
    const map = computeExportsMap(pkg);
    for (const entry of Object.values(map)) {
      expect(entry.types).toBe(entry.default);
    }
  });
});
