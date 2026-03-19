import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts"], // test dosyalarını bul
    pool: "forks",
    testTimeout: 15_000, // fs-heavy fixture testleri için
    hookTimeout: 10_000,
    coverage: {
      provider: "v8",
      include: ["src/detectors/**", "src/utils/**", "src/index.ts"],
      exclude: ["src/test-utils/**"],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
