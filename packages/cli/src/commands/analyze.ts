import fs from "node:fs/promises";
import path from "node:path";
import * as p from "@clack/prompts";
import { analyze } from "@create-turbo-stack/analyzer";
import { ValidatedPresetSchema } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { readProjectConfig } from "../io/reader";

type AnalyzeOptions = {
  output?: string;
  json?: boolean;
  openBuilder?: boolean;
  diff?: string;
  verbose?: boolean;
};

export async function analyzeCommand(targetPath: string, options: AnalyzeOptions) {
  const root = path.resolve(targetPath || ".");

  if (options.json) {
    const result = await analyze(root);
    process.stdout.write(JSON.stringify(result.preset, null, 2));
    return;
  }

  p.intro(`${pc.bgCyan(pc.black(" analyze "))} ${pc.dim(root)}`);

  const s = p.spinner();
  s.start("Scanning workspace");

  const result = await analyze(root);

  s.stop("Scan complete");

  // Show detections
  p.log.info(`${pc.bold("Basics")}`);
  logDetection("Package Manager", result.detections.packageManager);
  logDetection("Linter", result.detections.linter);
  logDetection("TypeScript", result.detections.typescript);

  p.log.info(`${pc.bold("Stack")}`);
  logDetection("Database", result.detections.database);
  logDetection("API", result.detections.api);
  logDetection("Auth", result.detections.auth);
  logDetection("CSS", result.detections.css);

  if (result.detections.apps.length > 0) {
    p.log.info(`${pc.bold("Apps")} (${result.detections.apps.length})`);
    for (const det of result.detections.apps) {
      logDetection("", det);
    }
  }

  if (result.detections.packages.length > 0) {
    p.log.info(`${pc.bold("Packages")} (${result.detections.packages.length})`);
    for (const det of result.detections.packages) {
      logDetection("", det);
    }
  }

  const integrationKeys = Object.entries(result.detections.integrations);
  const activeIntegrations = integrationKeys.filter(
    ([, d]) => d.value !== "none" && d.value !== "false",
  );
  if (activeIntegrations.length > 0) {
    p.log.info(`${pc.bold("Integrations")}`);
    for (const [key, det] of activeIntegrations) {
      logDetection(key, det);
    }
  }

  const validation = ValidatedPresetSchema.safeParse(result.preset);
  if (validation.success) {
    p.log.success("Generated preset is valid");
  } else {
    p.log.warn(`Generated preset has ${validation.error.issues.length} validation issue(s)`);
    if (options.verbose) {
      for (const issue of validation.error.issues) {
        p.log.warn(`  ${pc.dim(issue.path.join("."))} — ${issue.message}`);
      }
    }
  }

  // Diff mode
  if (options.diff) {
    await runDiff(root, result.preset, options.diff);
  }

  // Output to file
  if (options.output) {
    const outputPath = path.resolve(options.output);
    await fs.writeFile(outputPath, JSON.stringify(result.preset, null, 2), "utf-8");
    p.log.success(`Preset saved to ${pc.cyan(options.output)}`);
  }

  // Open in builder
  if (options.openBuilder) {
    const { compressPreset } = await import("lz-string")
      .then((m) => ({
        compressPreset: (preset: unknown) => {
          const json = JSON.stringify(preset);
          return `v1:${m.compressToEncodedURIComponent(json)}`;
        },
      }))
      .catch(() => ({
        compressPreset: (_preset: unknown) => {
          p.log.warn("lz-string not available, cannot generate builder URL");
          return null;
        },
      }));

    const compressed = compressPreset(result.preset);
    if (compressed) {
      const url = `https://create-turbo-stack.dev/builder?p=${compressed}`;
      p.log.info(`Builder URL: ${pc.cyan(url)}`);

      // when the URL contains a compressed preset payload.
      const openCmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      const { execFile } = await import("node:child_process");
      execFile(openCmd, [url]);
    }
  }

  if (!options.output && !options.openBuilder) {
    p.log.info(
      `Use ${pc.cyan("--output preset.json")} to save, or ${pc.cyan("--open-builder")} to open in browser`,
    );
  }

  p.outro("Done");
}

function logDetection(label: string, det: { value: string; confidence: string; reason: string }) {
  const badge =
    det.confidence === "certain"
      ? pc.green("●")
      : det.confidence === "high"
        ? pc.yellow("●")
        : det.confidence === "medium"
          ? pc.dim("●")
          : pc.red("○");

  const prefix = label ? `${label}: ` : "";
  p.log.info(`  ${badge} ${prefix}${pc.cyan(det.value)} ${pc.dim(`(${det.reason})`)}`);
}

async function runDiff(root: string, analyzedPreset: unknown, diffFile: string) {
  const diffPath = path.resolve(diffFile);
  let existingPreset: unknown;

  try {
    const content = await fs.readFile(diffPath, "utf-8");
    existingPreset = JSON.parse(content);
  } catch {
    // Fall back to .turbo-stack.json
    const config = await readProjectConfig(root);
    if (!config) {
      p.log.warn(`Cannot read ${diffFile} or .turbo-stack.json for diff`);
      return;
    }
    existingPreset = config;
  }

  p.log.info(`${pc.bold("Diff")} — comparing analyzed vs ${pc.dim(diffFile)}`);

  const analyzed = analyzedPreset as Record<string, unknown>;
  const existing = existingPreset as Record<string, unknown>;

  const skipKeys = new Set(["name", "version", "description", "$schema", "author"]);
  const keys = new Set([...Object.keys(analyzed), ...Object.keys(existing)]);
  let diffs = 0;

  for (const key of keys) {
    if (skipKeys.has(key)) continue;
    const a = JSON.stringify(analyzed[key], null, 2);
    const b = JSON.stringify(existing[key], null, 2);
    if (a !== b) {
      diffs++;
      p.log.warn(`  ${pc.yellow("~")} ${pc.bold(key)}`);

      // Show field-level details for objects
      if (
        typeof analyzed[key] === "object" &&
        typeof existing[key] === "object" &&
        !Array.isArray(analyzed[key])
      ) {
        const aObj = analyzed[key] as Record<string, unknown>;
        const bObj = existing[key] as Record<string, unknown>;
        const subKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
        for (const sk of subKeys) {
          const sa = JSON.stringify(aObj[sk]);
          const sb = JSON.stringify(bObj[sk]);
          if (sa !== sb) {
            p.log.info(
              `    ${pc.dim(sk)}: ${pc.red(sb ?? "undefined")} → ${pc.green(sa ?? "undefined")}`,
            );
          }
        }
      } else if (Array.isArray(analyzed[key]) || Array.isArray(existing[key])) {
        p.log.info(`    ${pc.dim("analyzed")}: ${pc.green(a)}`);
        p.log.info(`    ${pc.dim("existing")}: ${pc.red(b)}`);
      } else {
        p.log.info(`    ${pc.red(b ?? "undefined")} → ${pc.green(a ?? "undefined")}`);
      }
    }
  }

  if (diffs === 0) {
    p.log.success("No differences found");
  } else {
    p.log.info(`\n${diffs} section(s) differ`);
  }
}
