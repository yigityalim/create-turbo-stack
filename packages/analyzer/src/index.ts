import path from "node:path";
import type { Preset } from "@create-turbo-stack/schema";
import { detectApi } from "./detectors/api";
import { detectApps } from "./detectors/apps";
import { detectAuth } from "./detectors/auth";
import { detectCss } from "./detectors/css";
import { detectDatabase } from "./detectors/database";
import { detectIntegrations } from "./detectors/integrations";
import { detectLinter } from "./detectors/linter";
import { detectPackageManager } from "./detectors/package-manager";
import { detectPackages } from "./detectors/packages";
import { detectTypescript } from "./detectors/typescript";
import type { AnalysisResult, DetectionReport } from "./types";
import { readPackageJson } from "./utils/dep-scanner";

export type {
  AnalysisResult,
  Detection,
  DetectionConfidence,
  DetectionReport,
} from "./types";

/**
 * Analyze an existing Turborepo project and generate a Preset.
 */
export async function analyze(rootPath: string): Promise<AnalysisResult> {
  const root = path.resolve(rootPath);

  const rootPkg = await readPackageJson(root);
  const scope = detectScope(rootPkg);
  const projectName = rootPkg?.name ?? path.basename(root);

  const [pm, linter, ts, db, api, auth, css, appsResult, pkgsResult, intResult] = await Promise.all(
    [
      detectPackageManager(root),
      detectLinter(root),
      detectTypescript(root),
      detectDatabase(root),
      detectApi(root),
      detectAuth(root),
      detectCss(root),
      detectApps(root, scope),
      detectPackages(root),
      detectIntegrations(root),
    ],
  );

  const preset: Preset = {
    schemaVersion: "1.0",
    name: projectName,
    version: "1.0.0",
    description: `Analyzed from ${projectName}`,
    basics: {
      projectName,
      packageManager: pm.value as Preset["basics"]["packageManager"],
      scope,
      typescript: ts.value as Preset["basics"]["typescript"],
      linter: linter.value as Preset["basics"]["linter"],
      gitInit: true,
    },
    database: db.value,
    api: api.value,
    auth: auth.value,
    css: css.value,
    integrations: intResult.integrations,
    apps:
      appsResult.apps.length > 0
        ? appsResult.apps
        : [
            {
              name: "web",
              type: "nextjs" as const,
              port: 3000,
              i18n: false,
              cms: "none" as const,
              consumes: [],
            },
          ],
    packages: pkgsResult.packages,
  };

  const detections: DetectionReport = {
    packageManager: pm,
    linter,
    typescript: ts,
    database: {
      value: db.value.strategy,
      confidence: db.confidence,
      reason: db.reason,
    },
    api: {
      value: api.value.strategy,
      confidence: api.confidence,
      reason: api.reason,
    },
    auth: {
      value: auth.value.provider,
      confidence: auth.confidence,
      reason: auth.reason,
    },
    css: {
      value: css.value.framework,
      confidence: css.confidence,
      reason: css.reason,
    },
    apps: appsResult.detections,
    packages: pkgsResult.detections,
    integrations: intResult.detections,
  };

  return { preset, detections };
}

function detectScope(pkg: Awaited<ReturnType<typeof readPackageJson>>): string {
  if (!pkg) return "@my-project";

  // Check workspaces for scoped packages
  const name = pkg.name;
  if (name?.startsWith("@")) {
    const scopePart = name.split("/")[0];
    return scopePart;
  }

  // Default
  return `@${name ?? "my-project"}`;
}
