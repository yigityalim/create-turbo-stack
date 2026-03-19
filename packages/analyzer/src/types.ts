import type { Preset } from "@create-turbo-stack/schema";

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

export interface DetectionReport {
  packageManager: Detection<string>;
  linter: Detection<string>;
  typescript: Detection<string>;
  database: Detection<string>;
  api: Detection<string>;
  auth: Detection<string>;
  css: Detection<string>;
  apps: Detection<string>[];
  packages: Detection<string>[];
  integrations: Record<string, Detection<string>>;
}
