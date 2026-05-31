/**
 * Smoke test for the generated BUILTIN_REGISTRY_ITEMS bundle.
 *
 * The actual items come from `scripts/build-builtin-items.ts` reading
 * `registry/<slot>/<variant>/` at build time, so the set evolves as the
 * agent ships content. This test just pins the SHAPE of the bundle — every
 * item has a slot+variant and at least one file with inlined content —
 * and verifies the count matches the constant export.
 *
 * When an agent ships a slot item and we want to validate engine integration
 * for it specifically, the corresponding `dispatch.test.ts` (or
 * `registry-dispatch.test.ts`) pins the resolver behaviour. This test stays
 * structural.
 */

import { describe, expect, it } from "vitest";
import { BUILTIN_REGISTRY_ITEM_COUNT, BUILTIN_REGISTRY_ITEMS } from "./builtin-items.js";

describe("BUILTIN_REGISTRY_ITEMS — bundle shape", () => {
  it("exports an array whose length matches BUILTIN_REGISTRY_ITEM_COUNT", () => {
    expect(BUILTIN_REGISTRY_ITEMS).toBeInstanceOf(Array);
    expect(BUILTIN_REGISTRY_ITEMS.length).toBe(BUILTIN_REGISTRY_ITEM_COUNT);
  });

  it("every item declares a slot and a variant (add-ons are excluded)", () => {
    for (const item of BUILTIN_REGISTRY_ITEMS) {
      expect(item.slot, `item ${item.name} missing slot`).toBeDefined();
      expect(item.variant, `item ${item.name} missing variant`).toBeDefined();
    }
  });

  it("every item has at least one file with inlined content", () => {
    for (const item of BUILTIN_REGISTRY_ITEMS) {
      expect(item.files.length, `item ${item.name} has no files`).toBeGreaterThan(0);
      for (const file of item.files) {
        expect(file.content, `item ${item.name} file ${file.path} has no content`).toBeDefined();
      }
    }
  });

  it("no two items share the same (slot, variant) pair", () => {
    const seen = new Set<string>();
    for (const item of BUILTIN_REGISTRY_ITEMS) {
      const key = `${item.slot}:${item.variant}`;
      expect(seen.has(key), `duplicate (slot, variant): ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it("names are unique across the bundle", () => {
    const seen = new Set<string>();
    for (const item of BUILTIN_REGISTRY_ITEMS) {
      expect(seen.has(item.name), `duplicate name: ${item.name}`).toBe(false);
      seen.add(item.name);
    }
  });
});
