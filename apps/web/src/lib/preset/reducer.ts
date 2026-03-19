/**
 * Preset reducer — single source of truth for builder state.
 *
 * Pure function, no side effects. UI dispatches actions,
 * reducer produces new Preset. Validation runs separately.
 */
import type {
  Api,
  App,
  Auth,
  Css,
  Database,
  Integrations,
  Package,
  Preset,
} from "@create-turbo-stack/schema";

// ─── Actions ──────────────────────────────────────────────────────────────────

export type PresetAction =
  | { type: "SET_NAME"; payload: string }
  | { type: "SET_META"; payload: { name?: string; description?: string } }
  | { type: "SET_BASICS"; payload: Partial<Preset["basics"]> }
  | { type: "SET_DATABASE"; payload: Database }
  | { type: "SET_API"; payload: Api }
  | { type: "SET_AUTH"; payload: Partial<Auth> }
  | { type: "SET_CSS"; payload: Partial<Css> }
  | { type: "SET_INTEGRATIONS"; payload: Partial<Integrations> }
  | { type: "ADD_APP"; payload: App }
  | { type: "UPDATE_APP"; index: number; payload: Partial<App> }
  | { type: "REMOVE_APP"; index: number }
  | { type: "ADD_PACKAGE"; payload: Package }
  | { type: "UPDATE_PACKAGE"; index: number; payload: Partial<Package> }
  | { type: "REMOVE_PACKAGE"; index: number }
  | { type: "LOAD_PRESET"; payload: Preset }
  | { type: "RESET"; payload: Preset };

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function presetReducer(state: Preset, action: PresetAction): Preset {
  switch (action.type) {
    case "SET_NAME":
      return {
        ...state,
        name: action.payload,
        basics: { ...state.basics, projectName: action.payload },
      };

    case "SET_META":
      return {
        ...state,
        ...(action.payload.name != null ? { name: action.payload.name } : {}),
        ...(action.payload.description != null
          ? { description: action.payload.description }
          : {}),
      };

    case "SET_BASICS":
      return {
        ...state,
        basics: { ...state.basics, ...action.payload },
        // Keep name in sync with projectName
        ...(action.payload.projectName != null
          ? { name: action.payload.projectName }
          : {}),
      };

    case "SET_DATABASE":
      // Full replacement — discriminated union switching drops old fields
      return { ...state, database: action.payload };

    case "SET_API":
      // Full replacement — discriminated union
      return { ...state, api: action.payload };

    case "SET_AUTH":
      return { ...state, auth: { ...state.auth, ...action.payload } };

    case "SET_CSS":
      return { ...state, css: { ...state.css, ...action.payload } };

    case "SET_INTEGRATIONS":
      return {
        ...state,
        integrations: { ...state.integrations, ...action.payload },
      };

    case "ADD_APP": {
      // Prevent duplicate app names
      const appNameExists = state.apps.some(
        (a) => a.name === action.payload.name,
      );
      if (appNameExists) return state;
      return { ...state, apps: [...state.apps, action.payload] };
    }

    case "UPDATE_APP": {
      const apps = state.apps.map((app, i) =>
        i === action.index ? { ...app, ...action.payload } : app,
      );
      return { ...state, apps };
    }

    case "REMOVE_APP": {
      // Don't allow removing the last app
      if (state.apps.length <= 1) return state;
      const apps = state.apps.filter((_, i) => i !== action.index);
      return { ...state, apps };
    }

    case "ADD_PACKAGE": {
      // Prevent duplicate package names
      const pkgNameExists = state.packages.some(
        (p) => p.name === action.payload.name,
      );
      if (pkgNameExists) return state;
      return { ...state, packages: [...state.packages, action.payload] };
    }

    case "UPDATE_PACKAGE": {
      const packages = state.packages.map((pkg, i) =>
        i === action.index ? { ...pkg, ...action.payload } : pkg,
      );
      // If a package name changed, update consumes references in apps
      const oldName = state.packages[action.index]?.name;
      const newName = action.payload.name;
      if (oldName && newName && oldName !== newName) {
        const updatedApps = packages.length
          ? state.apps.map((app) => ({
              ...app,
              consumes: app.consumes.map((c) => (c === oldName ? newName : c)),
            }))
          : state.apps;
        return { ...state, packages, apps: updatedApps };
      }
      return { ...state, packages };
    }

    case "REMOVE_PACKAGE": {
      const removedName = state.packages[action.index]?.name;
      const packages = state.packages.filter((_, i) => i !== action.index);
      // Clean up consumes references
      const apps = removedName
        ? state.apps.map((app) => ({
            ...app,
            consumes: app.consumes.filter((c) => c !== removedName),
          }))
        : state.apps;
      return { ...state, packages, apps };
    }

    case "LOAD_PRESET":
      return action.payload;

    case "RESET":
      return action.payload;

    default:
      return state;
  }
}
