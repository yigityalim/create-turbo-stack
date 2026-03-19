import path from "node:path";
import type { Auth } from "@create-turbo-stack/schema";
import type { Detection } from "../types";
import { hasDep, readPackageJson } from "../utils/dep-scanner";

export async function detectAuth(root: string): Promise<Detection<Auth>> {
  const authDir = path.join(root, "packages", "auth");
  const pkg = await readPackageJson(authDir);
  const base: Omit<Auth, "provider"> = { rbac: false, entitlements: false };

  // Check packages/auth deps
  if (pkg) {
    if (hasDep(pkg, "@clerk/nextjs")) {
      return {
        value: { ...base, provider: "clerk" },
        confidence: "certain",
        reason: "@clerk/nextjs found",
      };
    }
    if (hasDep(pkg, "better-auth")) {
      return {
        value: { ...base, provider: "better-auth" },
        confidence: "certain",
        reason: "better-auth found",
      };
    }
    if (hasDep(pkg, "next-auth")) {
      return {
        value: { ...base, provider: "next-auth" },
        confidence: "certain",
        reason: "next-auth found",
      };
    }
    if (hasDep(pkg, "lucia")) {
      return {
        value: { ...base, provider: "lucia" },
        confidence: "certain",
        reason: "lucia found",
      };
    }
  }

  // Check all packages for supabase auth (might be in db package)
  const dbPkg = await readPackageJson(path.join(root, "packages", "db"));
  if (dbPkg && hasDep(dbPkg, "@supabase/ssr")) {
    return {
      value: { ...base, provider: "supabase-auth" },
      confidence: "high",
      reason: "@supabase/ssr suggests Supabase Auth",
    };
  }

  // Check root or app deps
  const rootPkg = await readPackageJson(root);
  if (rootPkg) {
    if (hasDep(rootPkg, "@clerk/nextjs"))
      return {
        value: { ...base, provider: "clerk" },
        confidence: "high",
        reason: "@clerk/nextjs in root",
      };
    if (hasDep(rootPkg, "next-auth"))
      return {
        value: { ...base, provider: "next-auth" },
        confidence: "high",
        reason: "next-auth in root",
      };
  }

  return {
    value: { ...base, provider: "none" },
    confidence: "medium",
    reason: "No auth provider detected",
  };
}
