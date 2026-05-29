import type { Preset } from "@create-turbo-stack/schema";
import { appDirOf, packageDirOf } from "../utils/package-path";

export interface TsconfigTarget {
  path: string;
  extends: string;
  compilerOptions: Record<string, unknown>;
  include: string[];
  exclude: string[];
}

function mapPackageTypeToTsconfig(type: string): string {
  switch (type) {
    case "ui":
    case "react-library":
      return "react.json";
    case "library":
    case "utils":
      return "library.json";
    case "config":
      return "base.json";
    default:
      return "base.json";
  }
}

function mapAppTypeToTsconfig(type: string): string {
  switch (type) {
    case "nextjs":
    case "nextjs-api-only":
      return "nextjs.json";
    case "vite-react":
    case "expo":
      return "react.json";
    case "sveltekit":
    case "astro":
      return "base.json";
    default:
      return "base.json";
  }
}

export function computeTsconfigChain(preset: Preset): TsconfigTarget[] {
  const targets: TsconfigTarget[] = [];
  const scope = preset.basics.scope;

  // User-specified packages
  for (const pkg of preset.packages) {
    targets.push({
      path: `${packageDirOf(pkg)}/tsconfig.json`,
      extends: `${scope}/typescript-config/${mapPackageTypeToTsconfig(pkg.type)}`,
      compilerOptions: { outDir: "./dist", rootDir: "./src" },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    });
  }

  for (const app of preset.apps) {
    const isNextjs = app.type === "nextjs" || app.type === "nextjs-api-only";
    targets.push({
      path: `${appDirOf(app)}/tsconfig.json`,
      extends: `${scope}/typescript-config/${mapAppTypeToTsconfig(app.type)}`,
      compilerOptions: isNextjs ? {} : { outDir: "./dist", rootDir: "./src" },
      include: isNextjs
        ? ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
        : ["src/**/*"],
      exclude: ["node_modules", "dist", ".next"],
    });
  }

  return targets;
}
