import type {
  ApiStrategy,
  AuthProvider,
  CssFramework,
  DatabaseStrategy,
  Linter,
  PackageManager,
  Preset,
  TypeScriptStrictness,
} from "@create-turbo-stack/schema";

export type DetectionConfidence = "certain" | "high" | "medium" | "low";

export interface Detection<T> {
  value: T;
  confidence: DetectionConfidence;
  reason: string;
}

export interface AnalysisResult {
  preset: Preset;
  detections: DetectionReport;
}

/**
 * Each scalar stack choice is reported as its real schema enum, not a bare
 * string — so a detector that yields a value outside the enum is a compile
 * error and consumers get autocomplete. `apps` / `packages` / `integrations`
 * stay `string`: their values are names or cross-category provider ids that
 * have no single enum.
 */
export interface DetectionReport {
  packageManager: Detection<PackageManager>;
  linter: Detection<Linter>;
  typescript: Detection<TypeScriptStrictness>;
  database: Detection<DatabaseStrategy>;
  api: Detection<ApiStrategy>;
  auth: Detection<AuthProvider>;
  css: Detection<CssFramework>;
  apps: Detection<string>[];
  packages: Detection<string>[];
  integrations: Record<string, Detection<string>>;
}
