import { defineAppType } from "./types";

export const expoAppType = defineAppType({
  type: "expo",

  buildPackageJson(_preset, app, { appRefs }) {
    return {
      name: app.name,
      version: "1.0.0",
      private: true,
      // Expo's entry registers the root component from index.ts.
      main: "index.ts",
      scripts: {
        start: "expo start",
        android: "expo start --android",
        ios: "expo start --ios",
        web: "expo start --web",
        "type-check": "tsc --noEmit",
      },
      dependencies: {
        ...appRefs,
        expo: "catalog:",
        "expo-status-bar": "catalog:",
        react: "catalog:",
        "react-native": "catalog:",
      },
      // Expo ships its own tsconfig base (expo/tsconfig.base), so it doesn't
      // extend the shared typescript-config package.
      devDependencies: {
        "@types/react": "catalog:",
        typescript: "catalog:",
      },
    };
  },

  buildTsconfig() {
    return {
      extends: "expo/tsconfig.base",
      compilerOptions: { strict: true },
    };
  },
});
