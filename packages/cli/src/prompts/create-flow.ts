import * as p from "@clack/prompts";
import type { Preset, UserConfig } from "@create-turbo-stack/schema";
import pc from "picocolors";
import { filterOptions, lockedValue } from "../io/policy";
import { CLI_VERSION } from "../version";

function cancel(): never {
  p.cancel("Operation cancelled.");
  process.exit(0);
}

function onCancel<T>(value: T | symbol): T {
  if (p.isCancel(value)) cancel();
  return value as T;
}

/**
 * Filter a prompt's option list against `policy.allow` / `policy.forbid`,
 * fall back to the full list if filtering would empty it (avoids
 * silently breaking the flow when the user's config is contradictory —
 * the validation step will surface the real error).
 */
function filtered<T extends string, O extends { value: T }>(
  options: readonly O[],
  policy: UserConfig["policy"] | undefined,
  category: Parameters<typeof filterOptions>[2],
): O[] {
  const allowedValues = filterOptions(
    options.map((o) => o.value),
    policy,
    category,
  );
  const filteredOpts = options.filter((o) => allowedValues.includes(o.value));
  return filteredOpts.length > 0 ? filteredOpts : [...options];
}

export async function runCreatePrompts(
  projectName?: string,
  userConfig?: UserConfig,
): Promise<Preset> {
  const defaults = userConfig?.defaults;
  const policy = userConfig?.policy;
  p.intro(`${pc.bgCyan(pc.black(" create-turbo-stack "))} ${pc.dim(`v${CLI_VERSION}`)}`);

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

  const lockedPm = lockedValue(policy, "packageManager");
  const packageManager =
    lockedPm ??
    onCancel(
      await p.select({
        message: "Package manager",
        options: filtered(
          [
            { value: "bun", label: "bun", hint: "recommended" },
            { value: "pnpm", label: "pnpm" },
            { value: "npm", label: "npm" },
            { value: "yarn", label: "yarn" },
          ] as const,
          policy,
          "packageManager",
        ),
        initialValue: defaults?.basics?.packageManager ?? "bun",
      }),
    );

  const defaultScope = defaults?.basics?.scope ?? `@${name}`;
  const scope = onCancel(
    await p.text({
      message: "Organization scope",
      placeholder: defaultScope,
      defaultValue: defaultScope,
      validate: (v) => {
        if (!v || !v.startsWith("@")) return "Scope must start with @";
        if (!/^@[a-z0-9-]+$/.test(v)) return "Lowercase letters, numbers, and hyphens only";
      },
    }),
  );

  const dbStrategy = onCancel(
    await p.select({
      message: "Database strategy",
      options: filtered(
        [
          {
            value: "supabase",
            label: "Supabase",
            hint: "Postgres + Auth + Realtime",
          },
          { value: "drizzle", label: "Drizzle ORM" },
          { value: "prisma", label: "Prisma" },
          { value: "none", label: "None" },
        ] as const,
        policy,
        "database",
      ),
      initialValue: defaults?.database?.strategy ?? "none",
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

  const apiStrategy = onCancel(
    await p.select({
      message: "API layer",
      options: filtered(
        [
          { value: "trpc", label: "tRPC v11", hint: "type-safe, recommended" },
          { value: "hono", label: "Hono", hint: "lightweight REST" },
          { value: "rest-nextjs", label: "Next.js API Routes" },
          { value: "none", label: "None" },
        ] as const,
        policy,
        "api",
      ),
      initialValue: defaults?.api?.strategy ?? "none",
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

  const authProvider = onCancel(
    await p.select({
      message: "Authentication",
      options: filtered(
        [
          ...(dbStrategy === "supabase"
            ? [
                {
                  value: "supabase-auth" as const,
                  label: "Supabase Auth",
                  hint: "recommended with Supabase",
                },
              ]
            : []),
          { value: "better-auth" as const, label: "Better Auth" },
          { value: "clerk" as const, label: "Clerk" },
          { value: "next-auth" as const, label: "NextAuth" },
          { value: "lucia" as const, label: "Lucia" },
          { value: "none" as const, label: "None" },
        ],
        policy,
        "auth",
      ),
      initialValue:
        defaults?.auth?.provider ?? (dbStrategy === "supabase" ? "supabase-auth" : "none"),
    }),
  );

  const auth: Preset["auth"] = {
    provider: authProvider as Preset["auth"]["provider"],
    rbac: false,
    entitlements: false,
  };

  const cssFramework = onCancel(
    await p.select({
      message: "CSS framework",
      options: filtered(
        [
          { value: "tailwind4", label: "Tailwind CSS 4", hint: "recommended" },
          { value: "tailwind3", label: "Tailwind CSS 3" },
          { value: "vanilla", label: "Vanilla CSS" },
          { value: "css-modules", label: "CSS Modules" },
        ] as const,
        policy,
        "cssFramework",
      ),
      initialValue: defaults?.css?.framework ?? "tailwind4",
    }),
  );

  let uiLib: Preset["css"]["ui"] = defaults?.css?.ui ?? "none";
  if (cssFramework === "tailwind4" || cssFramework === "tailwind3") {
    uiLib = onCancel(
      await p.select({
        message: "UI library",
        options: filtered(
          [
            { value: "shadcn", label: "shadcn/ui", hint: "recommended" },
            { value: "none", label: "None" },
          ] as const,
          policy,
          "cssUi",
        ),
        initialValue: defaults?.css?.ui ?? "shadcn",
      }),
    ) as Preset["css"]["ui"];
  }

  const css: Preset["css"] = {
    framework: cssFramework as Preset["css"]["framework"],
    ui: uiLib,
    styling: "css-variables",
  };

  const lockedLinter = lockedValue(policy, "linter");
  const linter =
    lockedLinter ??
    onCancel(
      await p.select({
        message: "Linter / Formatter",
        options: filtered(
          [
            { value: "biome", label: "Biome", hint: "fast, single tool" },
            { value: "eslint-prettier", label: "ESLint + Prettier" },
          ] as const,
          policy,
          "linter",
        ),
        initialValue: defaults?.basics?.linter ?? "biome",
      }),
    );

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
        options: filtered(
          [
            { value: "nextjs" as const, label: "Next.js" },
            { value: "nextjs-api-only" as const, label: "Next.js (API only)" },
            { value: "hono-standalone" as const, label: "Hono standalone" },
            { value: "vite-react" as const, label: "Vite + React" },
            { value: "sveltekit" as const, label: "SvelteKit" },
            { value: "astro" as const, label: "Astro" },
            { value: "remix" as const, label: "Remix" },
          ],
          policy,
          "appType",
        ),
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
            {
              value: "react-library",
              label: "React Library (hooks + components)",
            },
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

  const allPkgNames = packages.map((pk) => pk.name);
  for (const app of apps) {
    app.consumes = [...allPkgNames];
  }

  // Items whose category is fully constrained by allow/forbid are
  // hidden from the picker so the user can't pick something invalid.
  const allIntegrationItems = [
    {
      value: "posthog",
      label: "PostHog analytics",
      category: "analytics" as const,
    },
    {
      value: "vercel-analytics",
      label: "Vercel Analytics",
      category: "analytics" as const,
    },
    {
      value: "sentry",
      label: "Sentry error tracking",
      category: "errorTracking" as const,
    },
    {
      value: "react-email-resend",
      label: "React Email + Resend",
      category: "email" as const,
    },
    {
      value: "upstash",
      label: "Upstash rate limiting",
      category: "rateLimit" as const,
    },
    { value: "vercel-ai-sdk", label: "Vercel AI SDK", category: "ai" as const },
  ];
  const integrationOptions = allIntegrationItems
    .filter((item) => {
      const allow = policy?.allow?.[item.category] as readonly string[] | undefined;
      const forbid = policy?.forbid?.[item.category] as readonly string[] | undefined;
      if (forbid?.includes(item.value)) return false;
      if (allow && allow.length > 0 && !allow.includes(item.value)) return false;
      return true;
    })
    .map(({ value, label }) => ({ value, label }));

  const extras = onCancel(
    await p.multiselect({
      message: "Integrations",
      options: integrationOptions,
      required: false,
      initialValues: [
        ...(defaults?.integrations?.analytics === "posthog" ? ["posthog"] : []),
        ...(defaults?.integrations?.analytics === "vercel-analytics" ? ["vercel-analytics"] : []),
        ...(defaults?.integrations?.errorTracking === "sentry" ? ["sentry"] : []),
        ...(defaults?.integrations?.email === "react-email-resend" ? ["react-email-resend"] : []),
        ...(defaults?.integrations?.rateLimit === "upstash" ? ["upstash"] : []),
        ...(defaults?.integrations?.ai === "vercel-ai-sdk" ? ["vercel-ai-sdk"] : []),
      ],
    }),
  );

  const requiredEnvValidation = lockedValue(policy, "envValidation");

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
    envValidation: requiredEnvValidation ?? defaults?.integrations?.envValidation ?? true,
  };

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
    schemaVersion: "1.0",
    name,
    version: "1.0.0",
    basics: {
      projectName: name,
      packageManager: packageManager as Preset["basics"]["packageManager"],
      scope,
      typescript: lockedValue(policy, "typescript") ?? defaults?.basics?.typescript ?? "strict",
      linter: linter as Preset["basics"]["linter"],
      gitInit: defaults?.basics?.gitInit ?? true,
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
