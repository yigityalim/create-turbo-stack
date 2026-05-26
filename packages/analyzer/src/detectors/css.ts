import path from "node:path";
import type { Css } from "@create-turbo-stack/schema";
import type { Detection } from "../types";
import { hasDep, readPackageJson } from "../utils/dep-scanner";
import { fileExists } from "../utils/file-scanner";

export async function detectCss(root: string): Promise<Detection<Css>> {
  const rootPkg = await readPackageJson(root);

  // Check for Tailwind CSS. The schema only models Tailwind 4, so any
  // Tailwind install maps to "tailwind4".
  let hasTailwind = false;

  // Check apps for tailwind
  const { listDirs } = await import("../utils/file-scanner");
  const appNames = await listDirs(path.join(root, "apps"));

  for (const name of appNames) {
    const appPkg = await readPackageJson(path.join(root, "apps", name));
    if (appPkg && (hasDep(appPkg, "tailwindcss") || hasDep(appPkg, "@tailwindcss/postcss"))) {
      hasTailwind = true;
      break;
    }
  }

  if (!hasTailwind && rootPkg && hasDep(rootPkg, "tailwindcss")) {
    hasTailwind = true;
  }

  // Detect UI library
  let ui: Css["ui"] = "none";

  // Check for shadcn — look for components.json or ui.config.ts
  if (await fileExists(path.join(root, "components.json"))) {
    ui = "shadcn";
  } else {
    for (const name of appNames) {
      if (await fileExists(path.join(root, "apps", name, "components.json"))) {
        ui = "shadcn";
        break;
      }
    }
  }

  if (!hasTailwind) {
    return {
      value: { framework: "vanilla", ui: "none", styling: "css-variables" },
      confidence: "medium",
      reason: "No CSS framework detected",
    };
  }

  return {
    value: { framework: "tailwind4", ui, styling: "css-variables" },
    confidence: "certain",
    reason: `Tailwind CSS detected${ui !== "none" ? ` with ${ui}` : ""}`,
  };
}
