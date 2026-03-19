import path from "node:path";
import type { Api } from "@create-turbo-stack/schema";
import type { Detection } from "../types";
import { hasDep, readPackageJson } from "../utils/dep-scanner";

export async function detectApi(root: string): Promise<Detection<Api>> {
  const apiDir = path.join(root, "packages", "api");
  const pkg = await readPackageJson(apiDir);

  if (pkg) {
    if (hasDep(pkg, "@trpc/server")) {
      return {
        value: { strategy: "trpc" } as Api,
        confidence: "certain",
        reason: "@trpc/server found in packages/api",
      };
    }
    if (hasDep(pkg, "hono")) {
      return {
        value: { strategy: "hono" } as Api,
        confidence: "certain",
        reason: "hono found in packages/api",
      };
    }
  }

  // Check if any app has Next.js API routes → rest-nextjs
  const appsDir = path.join(root, "apps");
  const { listDirs } = await import("../utils/file-scanner");
  const appNames = await listDirs(appsDir);

  for (const name of appNames) {
    const appPkg = await readPackageJson(path.join(appsDir, name));
    if (appPkg && hasDep(appPkg, "next")) {
      // Has a Next.js app — could have API routes
      // Only mark as rest-nextjs if no other API package exists
      if (!pkg) {
        return {
          value: { strategy: "rest-nextjs" } as Api,
          confidence: "medium",
          reason: "Next.js app found, assuming REST API routes",
        };
      }
    }
  }

  return {
    value: { strategy: "none" } as Api,
    confidence: "medium",
    reason: "No API layer detected",
  };
}
