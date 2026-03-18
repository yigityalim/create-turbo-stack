import type { Preset } from "@create-turbo-stack/schema";

/**
 * For each app/package, compute which workspace packages it should depend on.
 * Returns: targetName → { "@scope/depName": "workspace:*" }
 */
export function computeWorkspaceRefs(preset: Preset): Record<string, Record<string, string>> {
  const refs: Record<string, Record<string, string>> = {};
  const scope = preset.basics.scope;

  for (const app of preset.apps) {
    const appRefs: Record<string, string> = {};

    // Consumed packages
    for (const consumed of app.consumes) {
      appRefs[`${scope}/${consumed}`] = "workspace:*";
    }

    // Auto-consumed based on selections
    if (preset.integrations.envValidation) {
      appRefs[`${scope}/env`] = "workspace:*";
    }
    if (preset.api.strategy !== "none") {
      appRefs[`${scope}/api`] = "workspace:*";
    }
    if (preset.auth.provider !== "none") {
      appRefs[`${scope}/auth`] = "workspace:*";
    }

    refs[app.name] = appRefs;
  }

  // Package cross-references
  if (preset.auth.provider !== "none" && preset.database.strategy !== "none") {
    refs.auth = { ...refs.auth, [`${scope}/db`]: "workspace:*" };
  }
  if (preset.api.strategy !== "none" && preset.database.strategy !== "none") {
    refs.api = { ...refs.api, [`${scope}/db`]: "workspace:*" };
  }

  return refs;
}
