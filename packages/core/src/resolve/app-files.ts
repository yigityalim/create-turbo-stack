import type { App, FileTreeNode, PackageRegistryItem, Preset } from "@create-turbo-stack/schema";
import { materializeAsApp } from "../registry/app-adapter";
import { selectRegistryItems } from "../registry/select";
import { appDirOf } from "../utils/package-path";
import { listSupportedAppTypes } from "./app-types";

/**
 * App types that have a registered scaffold implementation.
 * Driven from the registry — adding `app-types/nuxt.ts` automatically
 * makes `nuxt` show up here.
 *
 * The schema accepts a wider set (see AppTypeSchema). Anything in the
 * schema but missing from the registry will throw UnsupportedAppTypeError
 * at scaffold time.
 */
export const SUPPORTED_APP_TYPES: readonly App["type"][] = listSupportedAppTypes();
export type SupportedAppType = (typeof SUPPORTED_APP_TYPES)[number];

export class UnsupportedAppTypeError extends Error {
  constructor(
    public readonly appType: string,
    public readonly appName: string,
  ) {
    super(
      `App type "${appType}" is declared in the schema but has no scaffold implementation yet (app: "${appName}"). ` +
        `Supported types: ${SUPPORTED_APP_TYPES.join(", ")}.`,
    );
    this.name = "UnsupportedAppTypeError";
  }
}

/**
 * Resolve the FileTreeNode[] for a single app. Looks up the
 * (slot: "app", variant: app.type) request in `items` and materializes
 * through `materializeAsApp`. When no matching item is provided, the app
 * produces no files — the registry-first migration is complete and there's
 * no Eta fallback left to serve content.
 */
export function resolveAppFiles(
  preset: Preset,
  app: App,
  items: ReadonlyArray<PackageRegistryItem> = [],
): FileTreeNode[] {
  // Match the selector's app request to the available items.
  const request = selectRegistryItems(preset).find(
    (r) => r.slot === "app" && r.pkgName === app.name,
  );
  if (!request) return [];
  const item = items.find((i) => i.slot === request.slot && i.variant === request.variant);
  if (!item) return [];

  const base = appDirOf(app);
  return materializeAsApp(preset, app, base, item);
}
