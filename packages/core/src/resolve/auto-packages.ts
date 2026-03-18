import type { Package, Preset } from "@create-turbo-stack/schema";

/**
 * Based on preset selections, determine which packages are automatically created.
 * These are not user-specified — they're generated from choices like database, API, auth.
 */
export function resolveAutoPackages(preset: Preset): Package[] {
  const auto: Package[] = [];

  // Always: typescript-config
  auto.push({
    name: "typescript-config",
    type: "config",
    producesCSS: false,
    exports: ["."],
  });

  // If env validation enabled
  if (preset.integrations.envValidation) {
    auto.push({
      name: "env",
      type: "library",
      producesCSS: false,
      exports: ["."],
    });
  }

  // If database !== none
  if (preset.database.strategy !== "none") {
    auto.push({
      name: "db",
      type: "library",
      producesCSS: false,
      exports: ["."],
    });
  }

  // If api !== none
  if (preset.api.strategy !== "none") {
    auto.push({
      name: "api",
      type: "library",
      producesCSS: false,
      exports: preset.api.strategy === "trpc" ? [".", "./server", "./client"] : ["."],
    });
  }

  // If auth !== none
  if (preset.auth.provider !== "none") {
    auto.push({
      name: "auth",
      type: "library",
      producesCSS: false,
      exports: [".", "./server", "./client", "./middleware"],
    });
  }

  return auto;
}
