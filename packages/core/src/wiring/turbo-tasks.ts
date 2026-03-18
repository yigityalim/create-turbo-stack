import type { Preset } from "@create-turbo-stack/schema";

export interface TurboConfig {
  $schema: string;
  ui: string;
  tasks: Record<string, TurboTask>;
  globalDependencies: string[];
  globalEnv: string[];
}

interface TurboTask {
  dependsOn?: string[];
  outputs?: string[];
  cache?: boolean;
  persistent?: boolean;
  inputs?: string[];
}

export function computeTurboConfig(preset: Preset, globalEnv: string[] = []): TurboConfig {
  const tasks: Record<string, TurboTask> = {};

  // Build outputs based on app types
  const buildOutputs: string[] = [];
  if (preset.apps.some((a) => a.type.startsWith("nextjs"))) {
    buildOutputs.push(".next/**", "!.next/cache/**");
  }
  if (
    preset.apps.some((a) =>
      ["vite-react", "vite-vue", "astro", "sveltekit", "remix", "hono-standalone"].includes(a.type),
    )
  ) {
    buildOutputs.push("dist/**");
  }

  tasks.build = {
    dependsOn: ["^build"],
    inputs: ["$TURBO_DEFAULT$", ".env*"],
    outputs: buildOutputs,
  };

  tasks.dev = {
    cache: false,
    persistent: true,
  };

  tasks.lint = {
    dependsOn: ["^lint"],
  };

  tasks["type-check"] = {
    dependsOn: ["^type-check"],
  };

  // DB tasks
  if (preset.database.strategy === "drizzle") {
    tasks["db:generate"] = { cache: false };
    tasks["db:migrate"] = { cache: false };
    tasks["db:push"] = { cache: false };
  } else if (preset.database.strategy === "prisma") {
    tasks["db:generate"] = { cache: false };
    tasks["db:migrate"] = { cache: false };
  }

  return {
    $schema: "https://turborepo.dev/schema.json",
    ui: "tui",
    tasks,
    globalDependencies: [".env.*local"],
    globalEnv,
  };
}
