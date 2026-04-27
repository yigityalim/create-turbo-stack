import { afterEach, describe, expect, it } from "vitest";
import { createFixture, removeFixture } from "../test-utils/fixture";
import { detectDatabase } from "./database";

let tmp: string;

afterEach(async () => {
  if (tmp) await removeFixture(tmp);
});

describe("detectDatabase", () => {
  // Drizzle — packages/db

  it("detects drizzle/postgres via drizzle-orm + postgres in packages/db", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: { "drizzle-orm": "^0.38.0", postgres: "^3.4.0" },
      },
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("drizzle");
    expect((r.value as any).driver).toBe("postgres");
    expect(r.confidence).toBe("certain");
  });

  it("detects drizzle/mysql via drizzle-orm + mysql2", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: { "drizzle-orm": "^0.38.0", mysql2: "^3.0.0" },
      },
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("drizzle");
    expect((r.value as any).driver).toBe("mysql");
  });

  it("detects drizzle/sqlite via drizzle-orm + better-sqlite3", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: { "drizzle-orm": "^0.38.0", "better-sqlite3": "^9.0.0" },
      },
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("drizzle");
    expect((r.value as any).driver).toBe("sqlite");
  });

  it("detects drizzle/sqlite via @libsql/client", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: { "drizzle-orm": "^0.38.0", "@libsql/client": "^0.14.0" },
      },
    });
    const r = await detectDatabase(tmp);
    expect((r.value as any).driver).toBe("sqlite");
  });

  it("detects drizzle/postgres via @neondatabase/serverless", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: {
          "drizzle-orm": "^0.38.0",
          "@neondatabase/serverless": "^0.10.0",
        },
      },
    });
    const r = await detectDatabase(tmp);
    expect((r.value as any).driver).toBe("postgres");
  });

  it("defaults drizzle driver to postgres when no driver package found but drizzle-orm present", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: { "drizzle-orm": "^0.38.0" },
      },
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("drizzle");
    expect((r.value as any).driver).toBe("postgres");
  });

  // Drizzle via drizzle.config.ts dialect

  it("detects drizzle/postgres from drizzle.config.ts 'postgresql' dialect", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: { "drizzle-orm": "^0.38.0" },
      },
      "packages/db/drizzle.config.ts": `export default { dialect: "postgresql" }`,
    });
    const r = await detectDatabase(tmp);
    expect((r.value as any).driver).toBe("postgres");
  });

  it("detects drizzle/mysql from drizzle.config.ts 'mysql' dialect", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: { "drizzle-orm": "^0.38.0" },
      },
      "packages/db/drizzle.config.ts": `export default { dialect: 'mysql' }`,
    });
    const r = await detectDatabase(tmp);
    expect((r.value as any).driver).toBe("mysql");
  });

  it("detects drizzle/sqlite from drizzle.config.ts 'sqlite' dialect", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: { "drizzle-orm": "^0.38.0" },
      },
      "packages/db/drizzle.config.ts": `export default { dialect: 'sqlite' }`,
    });
    const r = await detectDatabase(tmp);
    expect((r.value as any).driver).toBe("sqlite");
  });

  // drizzle.config.ts in root (no packages/db)

  it("detects drizzle/postgres from root drizzle.config.ts — high confidence", async () => {
    tmp = await createFixture({ "drizzle.config.ts": "export default {}" });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("drizzle");
    expect(r.confidence).toBe("high");
  });

  // Prisma

  it("detects prisma via @prisma/client in packages/db", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: { "@prisma/client": "^5.0.0" },
      },
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("prisma");
    expect(r.confidence).toBe("certain");
  });

  it("detects prisma via prisma (cli) in packages/db", async () => {
    tmp = await createFixture({
      "packages/db/package.json": { devDependencies: { prisma: "^5.0.0" } },
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("prisma");
  });

  it("detects prisma via schema.prisma in packages/db/prisma/", async () => {
    tmp = await createFixture({
      "packages/db/prisma/schema.prisma": "datasource db { provider = 'postgresql' }",
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("prisma");
    expect(r.confidence).toBe("certain");
  });

  it("detects prisma via root prisma/schema.prisma", async () => {
    tmp = await createFixture({
      "prisma/schema.prisma": "datasource db { provider = 'postgresql' }",
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("prisma");
  });

  // Supabase

  it("detects supabase via @supabase/supabase-js in packages/db", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: { "@supabase/supabase-js": "^2.0.0" },
      },
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("supabase");
    expect(r.confidence).toBe("certain");
  });

  // Root package.json fallbacks — high

  it("detects drizzle from root deps — high confidence", async () => {
    tmp = await createFixture({
      "package.json": { dependencies: { "drizzle-orm": "^0.38.0" } },
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("drizzle");
    expect(r.confidence).toBe("high");
  });

  it("detects prisma from root deps — high confidence", async () => {
    tmp = await createFixture({
      "package.json": { dependencies: { "@prisma/client": "^5.0.0" } },
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("prisma");
    expect(r.confidence).toBe("high");
  });

  it("detects supabase from root deps — high confidence", async () => {
    tmp = await createFixture({
      "package.json": { dependencies: { "@supabase/supabase-js": "^2.0.0" } },
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("supabase");
    expect(r.confidence).toBe("high");
  });

  // Priority: drizzle wins over prisma when both found

  it("prefers drizzle over prisma when both in packages/db", async () => {
    tmp = await createFixture({
      "packages/db/package.json": {
        dependencies: { "drizzle-orm": "^0.38.0", "@prisma/client": "^5.0.0" },
      },
    });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("drizzle");
  });

  // None

  it("returns none/medium when no database detected", async () => {
    tmp = await createFixture({ "package.json": { name: "bare" } });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("none");
    expect(r.confidence).toBe("medium");
  });

  it("returns none when packages/db is empty directory", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    tmp = await fs.mkdtemp(`${os.tmpdir()}/db-empty-`);
    await fs.mkdir(`${tmp}/packages/db`, { recursive: true });
    const r = await detectDatabase(tmp);
    expect(r.value.strategy).toBe("none");
  });
});
