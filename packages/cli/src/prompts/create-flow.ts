import * as p from "@clack/prompts";
import type { Preset } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { CLI_VERSION } from "../version";

function cancel(): never {
  p.cancel("Operation cancelled.");
  process.exit(0);
}

function onCancel<T>(value: T | symbol): T {
  if (p.isCancel(value)) cancel();
  return value as T;
}

export async function runCreatePrompts(projectName?: string): Promise<Preset> {
  // Banner
  p.intro(`${pc.bgCyan(pc.black(" create-turbo-stack "))} ${pc.dim(`v${CLI_VERSION}`)}`);

  // 1. Project name
  const name =
    projectName ??
    onCancel(
      await p.text({
        message: "Project name",
        placeholder: "my-project",
        validate: (v) => {
          if (!v) return "Project name is required";
          if (!/^[a-z0-9-]+$/.test(v)) return "Lowercase letters, numbers, and hyphens only";
        },
      }),
    );

  // 2. Package manager
  const packageManager = onCancel(
    await p.select({
      message: "Package manager",
      options: [
        { value: "bun", label: "bun", hint: "recommended" },
        { value: "pnpm", label: "pnpm" },
        { value: "npm", label: "npm" },
        { value: "yarn", label: "yarn" },
      ],
      initialValue: "bun",
    }),
  );

  // 3. Scope
  const scope = onCancel(
    await p.text({
      message: "Organization scope",
      placeholder: `@${name}`,
      defaultValue: `@${name}`,
      validate: (v) => {
        if (!v || !v.startsWith("@")) return "Scope must start with @";
        if (!/^@[a-z0-9-]+$/.test(v)) return "Lowercase letters, numbers, and hyphens only";
      },
    }),
  );

  // 4. Database
  const dbStrategy = onCancel(
    await p.select({
      message: "Database strategy",
      options: [
        { value: "supabase", label: "Supabase", hint: "Postgres + Auth + Realtime" },
        { value: "drizzle", label: "Drizzle ORM" },
        { value: "prisma", label: "Prisma" },
        { value: "none", label: "None" },
      ],
      initialValue: "none",
    }),
  );

  let database: Preset["database"];
  if (dbStrategy === "drizzle") {
    const driver = onCancel(
      await p.select({
        message: "Drizzle driver",
        options: [
          { value: "postgres", label: "PostgreSQL" },
          { value: "mysql", label: "MySQL" },
          { value: "sqlite", label: "SQLite" },
          { value: "turso", label: "Turso" },
          { value: "neon", label: "Neon" },
          { value: "planetscale", label: "PlanetScale" },
        ],
      }),
    );
    database = { strategy: "drizzle", driver } as Preset["database"];
  } else {
    database = { strategy: dbStrategy } as Preset["database"];
  }

  // 5. API
  const apiStrategy = onCancel(
    await p.select({
      message: "API layer",
      options: [
        { value: "trpc", label: "tRPC v11", hint: "type-safe, recommended" },
        { value: "hono", label: "Hono", hint: "lightweight REST" },
        { value: "rest-nextjs", label: "Next.js API Routes" },
        { value: "none", label: "None" },
      ],
      initialValue: "none",
    }),
  );

  let api: Preset["api"];
  if (apiStrategy === "hono") {
    const mode = onCancel(
      await p.select({
        message: "Hono mode",
        options: [
          { value: "standalone-app", label: "Standalone app" },
          { value: "nextjs-route", label: "Embedded in Next.js" },
        ],
      }),
    );
    api = { strategy: "hono", mode } as Preset["api"];
  } else if (apiStrategy === "trpc") {
    api = { strategy: "trpc", version: "v11" } as Preset["api"];
  } else {
    api = { strategy: apiStrategy } as Preset["api"];
  }

  // 6. Auth
  const authProvider = onCancel(
    await p.select({
      message: "Authentication",
      options: [
        ...(dbStrategy === "supabase"
          ? [{ value: "supabase-auth", label: "Supabase Auth", hint: "recommended with Supabase" }]
          : []),
        { value: "better-auth", label: "Better Auth" },
        { value: "clerk", label: "Clerk" },
        { value: "next-auth", label: "NextAuth" },
        { value: "lucia", label: "Lucia" },
        { value: "none", label: "None" },
      ],
      initialValue: dbStrategy === "supabase" ? "supabase-auth" : "none",
    }),
  );

  const auth: Preset["auth"] = {
    provider: authProvider as Preset["auth"]["provider"],
    rbac: false,
    entitlements: false,
  };

  // 7. CSS
  const cssFramework = onCancel(
    await p.select({
      message: "CSS framework",
      options: [
        { value: "tailwind4", label: "Tailwind CSS 4", hint: "recommended" },
        { value: "tailwind3", label: "Tailwind CSS 3" },
        { value: "vanilla", label: "Vanilla CSS" },
        { value: "css-modules", label: "CSS Modules" },
      ],
      initialValue: "tailwind4",
    }),
  );

  let uiLib: Preset["css"]["ui"] = "none";
  if (cssFramework === "tailwind4" || cssFramework === "tailwind3") {
    uiLib = onCancel(
      await p.select({
        message: "UI library",
        options: [
          { value: "shadcn", label: "shadcn/ui", hint: "recommended" },
          { value: "radix-raw", label: "Radix (raw)" },
          { value: "none", label: "None" },
        ],
        initialValue: "shadcn",
      }),
    ) as Preset["css"]["ui"];
  }

  const css: Preset["css"] = {
    framework: cssFramework as Preset["css"]["framework"],
    ui: uiLib,
    styling: "css-variables",
  };

  // 8. Linter
  const linter = onCancel(
    await p.select({
      message: "Linter / Formatter",
      options: [
        { value: "biome", label: "Biome", hint: "fast, single tool" },
        { value: "eslint-prettier", label: "ESLint + Prettier" },
      ],
      initialValue: "biome",
    }),
  );

  // 9. Apps
  p.log.info(pc.cyan("Apps"));
  const apps: Preset["apps"] = [];
  let addMoreApps = true;
  let nextPort = 3000;

  while (addMoreApps) {
    const appName = onCancel(
      await p.text({
        message: `App name${apps.length > 0 ? " (or press Enter to finish)" : ""}`,
        placeholder: apps.length === 0 ? "web" : "",
        defaultValue: apps.length === 0 ? "web" : "",
        validate: (v) => {
          if (apps.length === 0 && !v) return "At least one app is required";
          if (v && !/^[a-z0-9-]+$/.test(v)) return "Lowercase letters, numbers, and hyphens only";
          if (v && apps.some((a) => a.name === v)) return "App name already exists";
        },
      }),
    );

    if (!appName && apps.length > 0) {
      addMoreApps = false;
      break;
    }

    const appType = onCancel(
      await p.select({
        message: `Type for ${pc.cyan(appName)}`,
        options: [
          { value: "nextjs", label: "Next.js" },
          { value: "nextjs-api-only", label: "Next.js (API only)" },
          { value: "hono-standalone", label: "Hono standalone" },
          { value: "vite-react", label: "Vite + React" },
          { value: "sveltekit", label: "SvelteKit" },
          { value: "astro", label: "Astro" },
          { value: "remix", label: "Remix" },
        ],
        initialValue: "nextjs",
      }),
    );

    const port = nextPort;
    nextPort += 1;

    let i18n = false;
    if (["nextjs", "sveltekit", "astro", "remix"].includes(appType as string)) {
      i18n = onCancel(
        await p.confirm({
          message: `Enable i18n for ${pc.cyan(appName)}?`,
          initialValue: false,
        }),
      );
    }

    apps.push({
      name: appName,
      type: appType as Preset["apps"][number]["type"],
      port,
      i18n,
      cms: "none",
      consumes: [],
    });

    if (apps.length > 0) {
      addMoreApps = onCancel(
        await p.confirm({
          message: "Add another app?",
          initialValue: false,
        }),
      );
    }
  }

  // 10. Packages
  p.log.info(pc.cyan("Packages"));
  const packages: Preset["packages"] = [];
  let addMorePkgs = true;

  // Suggest UI package first
  const wantUi = onCancel(
    await p.confirm({
      message: "Add a UI component package?",
      initialValue: true,
    }),
  );

  if (wantUi) {
    packages.push({
      name: "ui",
      type: "react-library",
      producesCSS: true,
      exports: ["."],
    });
    p.log.success(`${pc.green("✓")} ${pc.cyan("ui")} — React component library (CSS-producing)`);
  }

  const wantMore = onCancel(
    await p.confirm({
      message: "Add more packages?",
      initialValue: false,
    }),
  );

  if (wantMore) {
    addMorePkgs = true;
    while (addMorePkgs) {
      const pkgName = onCancel(
        await p.text({
          message: "Package name (or press Enter to finish)",
          placeholder: "",
          defaultValue: "",
          validate: (v) => {
            if (v && !/^[a-z0-9-]+$/.test(v)) return "Lowercase letters, numbers, and hyphens only";
            if (v && packages.some((pk) => pk.name === v)) return "Package name already exists";
          },
        }),
      );

      if (!pkgName) break;

      const pkgType = onCancel(
        await p.select({
          message: `Type for ${pc.cyan(pkgName)}`,
          options: [
            { value: "library", label: "Library (TypeScript)" },
            { value: "react-library", label: "React Library (hooks + components)" },
            { value: "ui", label: "UI (React components)" },
            { value: "utils", label: "Utilities" },
            { value: "config", label: "Config (shared configuration)" },
          ],
        }),
      );

      let producesCSS = false;
      if (["ui", "react-library"].includes(pkgType)) {
        producesCSS = onCancel(
          await p.confirm({
            message: "Contains Tailwind CSS classes?",
            initialValue: pkgType === "ui",
          }),
        );
      }

      packages.push({
        name: pkgName,
        type: pkgType as Preset["packages"][number]["type"],
        producesCSS,
        exports: ["."],
      });

      p.log.success(
        `${pc.green("✓")} ${pc.cyan(pkgName)} — ${pkgType}${producesCSS ? " (CSS-producing)" : ""}`,
      );

      addMorePkgs = onCancel(
        await p.confirm({
          message: "Add another package?",
          initialValue: false,
        }),
      );
    }
  }

  // Wire consumes: each app consumes all user packages by default
  const allPkgNames = packages.map((pk) => pk.name);
  for (const app of apps) {
    app.consumes = [...allPkgNames];
  }

  // 11. Integrations
  const extras = onCancel(
    await p.multiselect({
      message: "Integrations",
      options: [
        { value: "posthog", label: "PostHog analytics" },
        { value: "vercel-analytics", label: "Vercel Analytics" },
        { value: "sentry", label: "Sentry error tracking" },
        { value: "react-email-resend", label: "React Email + Resend" },
        { value: "upstash", label: "Upstash rate limiting" },
        { value: "vercel-ai-sdk", label: "Vercel AI SDK" },
      ],
      required: false,
    }),
  );

  const integrations: Preset["integrations"] = {
    analytics: extras.includes("posthog")
      ? "posthog"
      : extras.includes("vercel-analytics")
        ? "vercel-analytics"
        : "none",
    errorTracking: extras.includes("sentry") ? "sentry" : "none",
    email: extras.includes("react-email-resend") ? "react-email-resend" : "none",
    rateLimit: extras.includes("upstash") ? "upstash" : "none",
    ai: extras.includes("vercel-ai-sdk") ? "vercel-ai-sdk" : "none",
    envValidation: true,
  };

  // 12. Summary
  p.log.message("");
  p.log.message(pc.bold("Summary:"));
  p.log.message(`  Project:    ${pc.cyan(name)}`);
  p.log.message(`  Scope:      ${pc.cyan(scope)}`);
  p.log.message(`  PM:         ${packageManager}`);
  p.log.message(`  Database:   ${dbStrategy}`);
  p.log.message(`  API:        ${apiStrategy}`);
  p.log.message(`  Auth:       ${authProvider}`);
  p.log.message(`  CSS:        ${cssFramework}${uiLib !== "none" ? ` + ${uiLib}` : ""}`);
  p.log.message(`  Linter:     ${linter}`);
  p.log.message(`  Apps:       ${apps.map((a) => `${a.name} (${a.type})`).join(", ")}`);
  p.log.message(
    `  Packages:   ${packages.length > 0 ? packages.map((pk) => pk.name).join(", ") : "—"}`,
  );
  p.log.message(`  Extras:     ${extras.length > 0 ? extras.join(", ") : "—"}`);
  p.log.message("");

  const confirmed = onCancel(
    await p.confirm({
      message: "Create project?",
      initialValue: true,
    }),
  );

  if (!confirmed) cancel();

  const preset: Preset = {
    name,
    version: "1.0.0",
    basics: {
      projectName: name,
      packageManager: packageManager as Preset["basics"]["packageManager"],
      scope,
      typescript: "strict",
      linter: linter as Preset["basics"]["linter"],
      gitInit: true,
    },
    database,
    api,
    auth,
    css,
    integrations,
    apps,
    packages,
  };

  return preset;
}
