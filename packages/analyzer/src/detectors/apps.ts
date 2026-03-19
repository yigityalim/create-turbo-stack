import path from "node:path";
import type { App } from "@create-turbo-stack/schema";
import type { Detection } from "../types";
import { getWorkspaceDeps, hasDep, readPackageJson } from "../utils/dep-scanner";
import { listDirs } from "../utils/file-scanner";

export async function detectApps(
  root: string,
  scope: string,
): Promise<{ apps: App[]; detections: Detection<string>[] }> {
  const appsDir = path.join(root, "apps");
  const appNames = await listDirs(appsDir);
  const apps: App[] = [];
  const detections: Detection<string>[] = [];

  for (const name of appNames) {
    const appDir = path.join(appsDir, name);
    const pkg = await readPackageJson(appDir);
    if (!pkg) continue;

    const type = detectAppType(pkg);
    const port = detectPort(pkg, apps.length);
    const i18n = hasDep(pkg, "next-intl");
    const consumes = getWorkspaceDeps(pkg, scope).filter(
      (d) => d !== "typescript-config" && d !== "env",
    );

    apps.push({
      name,
      type: type.value as App["type"],
      port,
      i18n,
      cms: "none",
      consumes,
    });

    detections.push({
      value: `${name}: ${type.value}`,
      confidence: type.confidence,
      reason: type.reason,
    });
  }

  return { apps, detections };
}

function detectAppType(
  pkg: ReturnType<typeof readPackageJson> extends Promise<infer T> ? NonNullable<T> : never,
): Detection<string> {
  if (hasDep(pkg, "next")) {
    // Check if it has any pages/routes or just API
    return { value: "nextjs", confidence: "certain", reason: "next in dependencies" };
  }
  if (hasDep(pkg, "hono") || hasDep(pkg, "@hono/node-server")) {
    return { value: "hono-standalone", confidence: "certain", reason: "hono in dependencies" };
  }
  if (hasDep(pkg, "expo")) {
    return { value: "expo", confidence: "certain", reason: "expo in dependencies" };
  }
  return { value: "nextjs", confidence: "low", reason: "Unknown app type, defaulting to nextjs" };
}

function detectPort(pkg: { scripts?: Record<string, string> }, index: number): number {
  const devScript = pkg.scripts?.dev ?? "";
  // Match -p 3000 or --port 3000 or -p=3000
  const portMatch = devScript.match(/-p[=\s]+(\d+)|--port[=\s]+(\d+)/);
  if (portMatch) {
    return Number(portMatch[1] ?? portMatch[2]);
  }
  return 3000 + index;
}
