/**
 * Schema-derived category metadata for the builder UI.
 *
 * Instead of hardcoding tech options (like the reference project),
 * we derive categories and options from the Zod schemas' public API.
 * Adding a new enum value to @create-turbo-stack/schema automatically
 * appears in the builder.
 *
 * For display labels and descriptions we maintain a static map — these
 * are presentation concerns that don't belong in the schema package.
 */
import {
  ApiStrategySchema,
  AppTypeSchema,
  AuthProviderSchema,
  CssFrameworkSchema,
  DatabaseStrategySchema,
  DrizzleDriverSchema,
  HonoModeSchema,
  INTEGRATION_OPTION_CATEGORIES,
  INTEGRATION_PROVIDER_VALUES,
  LinterSchema,
  // Enum schemas (public .options property)
  PackageManagerSchema,
  PackageTypeSchema,
  StylingArchSchema,
  TypeScriptStrictnessSchema,
  UiLibrarySchema,
} from "@create-turbo-stack/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OptionMeta = {
  value: string;
  label: string;
  description: string;
  icon?: string;
};

export type FieldMeta = {
  key: string;
  label: string;
  type: "enum" | "boolean";
  options?: OptionMeta[];
  defaultValue?: unknown;
  /** Short explanation shown inline (e.g. under boolean toggles). */
  description?: string;
  /**
   * LABELS-prefix this field's options were rendered against (`"auth"`,
   * `"cache"`, …). Carries through to the UI so the option card can look up
   * the brand icon for `(group, value)` without re-deriving it.
   */
  group?: string;
};

export type CategoryMeta = {
  key: string;
  label: string;
  description: string;
  icon: string; // lucide icon name

  /** For discriminated unions (database, api): the field that switches variants */
  discriminator?: string;
  /** Fields per variant (only if discriminator is set) */
  variants?: Record<string, FieldMeta[]>;
  /** Direct fields (if not a discriminated union) */
  fields?: FieldMeta[];
};

// ─── Display Labels ───────────────────────────────────────────────────────────

/** Human-readable labels for enum values. Key format: "schemaGroup.value" */
const LABELS: Record<
  string,
  { label: string; description: string; icon?: string }
> = {
  "packageManager.bun": {
    label: "Bun",
    description: "Fast JavaScript runtime & toolkit",
  },
  "packageManager.pnpm": {
    label: "pnpm",
    description: "Fast, disk space efficient",
  },
  "packageManager.npm": {
    label: "npm",
    description: "Default Node.js package manager",
  },
  "packageManager.yarn": {
    label: "Yarn",
    description: "Reliable dependency management",
  },

  // TypeScript
  "typescript.strict": { label: "Strict", description: "Maximum type safety" },
  "typescript.relaxed": {
    label: "Relaxed",
    description: "Less strict type checking",
  },

  "linter.biome": { label: "Biome", description: "Fast formatter & linter" },
  "linter.oxlint": {
    label: "oxlint + Prettier",
    description: "Rust-fast linter, Prettier format",
  },
  "linter.eslint-prettier": {
    label: "ESLint + Prettier",
    description: "Classic lint & format",
  },

  "database.supabase": {
    label: "Supabase",
    description: "Postgres platform with auth & realtime",
  },
  "database.drizzle": {
    label: "Drizzle",
    description: "TypeScript ORM with SQL-like API",
  },
  "database.prisma": {
    label: "Prisma",
    description: "Next-generation ORM with schema DSL",
  },
  "database.none": { label: "None", description: "No database" },

  // Drizzle driver
  "driver.postgres": {
    label: "PostgreSQL",
    description: "Advanced open-source SQL database",
  },
  "driver.mysql": {
    label: "MySQL",
    description: "Popular relational database",
  },
  "driver.sqlite": {
    label: "SQLite",
    description: "File-based embedded database",
  },
  "driver.turso": {
    label: "Turso",
    description: "Distributed SQLite at the edge",
  },
  "driver.neon": {
    label: "Neon",
    description: "Serverless Postgres with branching",
  },
  "driver.planetscale": {
    label: "PlanetScale",
    description: "MySQL-compatible serverless DB",
  },

  // API strategy
  "api.trpc": { label: "tRPC", description: "End-to-end typesafe APIs" },
  "api.hono": { label: "Hono", description: "Ultrafast web framework" },
  "api.rest-nextjs": {
    label: "REST (Next.js)",
    description: "REST API via Next.js routes",
  },
  "api.none": { label: "None", description: "No API layer" },

  // Hono mode
  "honoMode.standalone-app": {
    label: "Standalone",
    description: "Separate Hono server app",
  },
  "honoMode.nextjs-route": {
    label: "Next.js Route",
    description: "Hono inside Next.js API route",
  },

  // Auth provider
  "auth.supabase-auth": {
    label: "Supabase Auth",
    description: "Built-in Supabase authentication",
  },
  "auth.better-auth": {
    label: "Better Auth",
    description: "Comprehensive TypeScript auth",
  },
  "auth.clerk": {
    label: "Clerk",
    description: "Complete user management platform",
  },
  "auth.next-auth": {
    label: "NextAuth.js",
    description: "Authentication for Next.js",
  },
  "auth.lucia": {
    label: "Lucia",
    description: "Simple, flexible auth library",
  },
  "auth.none": { label: "None", description: "No authentication" },

  // CSS framework
  "css.tailwind4": {
    label: "Tailwind CSS 4",
    description: "Utility-first CSS, latest version",
  },
  "css.vanilla": {
    label: "Vanilla CSS",
    description: "Plain CSS, no framework",
  },
  "css.css-modules": {
    label: "CSS Modules",
    description: "Scoped CSS by default",
  },

  // UI library
  "ui.shadcn": {
    label: "shadcn/ui",
    description: "Beautiful, accessible components",
  },
  "ui.radix-raw": {
    label: "Radix UI",
    description: "Unstyled, accessible primitives",
  },
  "ui.none": { label: "None", description: "No UI library" },

  // Styling
  "styling.css-variables": {
    label: "CSS Variables",
    description: "Themeable via custom properties",
  },
  "styling.static": { label: "Static", description: "No dynamic theming" },

  // Analytics
  "analytics.posthog": {
    label: "PostHog",
    description: "Product analytics & feature flags",
  },
  "analytics.vercel-analytics": {
    label: "Vercel Analytics",
    description: "Web analytics by Vercel",
  },
  "analytics.plausible": {
    label: "Plausible",
    description: "Privacy-friendly analytics",
  },
  "analytics.none": { label: "None", description: "No analytics" },

  // Error tracking
  "errorTracking.sentry": {
    label: "Sentry",
    description: "Error monitoring & performance",
  },
  "errorTracking.bugsnag": {
    label: "Bugsnag",
    description: "Crash & error monitoring",
  },
  "errorTracking.none": { label: "None", description: "No error tracking" },

  // Email
  "email.react-email-resend": {
    label: "React Email + Resend",
    description: "Modern email with React components",
  },
  "email.nodemailer": {
    label: "Nodemailer",
    description: "Classic Node.js email sending",
  },
  "email.none": { label: "None", description: "No email integration" },

  // Rate limit
  "rateLimit.upstash": {
    label: "Upstash",
    description: "Serverless Redis rate limiting",
  },
  "rateLimit.none": { label: "None", description: "No rate limiting" },

  // AI
  "ai.vercel-ai-sdk": {
    label: "Vercel AI SDK",
    description: "Unified AI provider interface",
  },
  "ai.langchain": {
    label: "LangChain",
    description: "LLM application framework",
  },
  "ai.none": { label: "None", description: "No AI integration" },

  // Cache
  "cache.upstash": {
    label: "Upstash",
    description: "Serverless Redis cache (REST)",
  },
  "cache.none": { label: "None", description: "No cache layer" },

  // App type
  "appType.nextjs": {
    label: "Next.js",
    description: "React framework with SSR/SSG",
  },
  "appType.nextjs-api-only": {
    label: "Next.js (API only)",
    description: "Next.js without frontend",
  },
  "appType.expo": { label: "Expo", description: "React Native framework" },
  "appType.hono-standalone": {
    label: "Hono Standalone",
    description: "Standalone Hono server",
  },
  "appType.vite-react": {
    label: "Vite + React",
    description: "Fast React SPA",
  },
  "appType.vite-vue": { label: "Vite + Vue", description: "Fast Vue SPA" },
  "appType.sveltekit": {
    label: "SvelteKit",
    description: "Svelte full-stack framework",
  },
  "appType.astro": {
    label: "Astro",
    description: "Content-driven web framework",
  },
  "appType.tauri": {
    label: "Tauri",
    description: "Native desktop apps with web tech",
  },

  // Package type
  "packageType.ui": { label: "UI", description: "Shared React components" },
  "packageType.utils": { label: "Utils", description: "Shared utilities" },
  "packageType.config": {
    label: "Config",
    description: "Shared configuration",
  },
  "packageType.library": {
    label: "Library",
    description: "General-purpose library",
  },
  "packageType.react-library": {
    label: "React Library",
    description: "React-specific library",
  },
};

/**
 * Pretty labels for the integrations category dropdowns. Optional — unknown
 * categories fall back to `humanize(cat)`, so adding a category needs no edit
 * here (just for polish).
 */
const INTEGRATION_CATEGORY_LABELS: Record<string, string> = {
  analytics: "Analytics",
  errorTracking: "Error Tracking",
  email: "Email",
  rateLimit: "Rate Limiting",
  ai: "AI",
  cache: "Cache",
};

function getOptionMeta(group: string, value: string): OptionMeta {
  const meta = LABELS[`${group}.${value}`];
  return {
    value,
    label: meta?.label ?? humanize(value),
    description: meta?.description ?? "",
    icon: meta?.icon,
  };
}

function makeEnumField(
  key: string,
  label: string,
  group: string,
  options: readonly string[],
  defaultValue?: string,
): FieldMeta {
  return {
    key,
    label,
    type: "enum",
    options: options.map((v) => getOptionMeta(group, v)),
    defaultValue,
    group,
  };
}

function makeBooleanField(
  key: string,
  label: string,
  defaultValue: boolean,
  description?: string,
): FieldMeta {
  return { key, label, type: "boolean", defaultValue, description };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const CATEGORIES: CategoryMeta[] = [
  {
    key: "basics",
    label: "Basics",
    description: "Project name, package manager, TypeScript settings",
    icon: "Settings",
    fields: [
      makeEnumField(
        "packageManager",
        "Package Manager",
        "packageManager",
        PackageManagerSchema.options,
        "bun",
      ),
      makeEnumField(
        "typescript",
        "TypeScript",
        "typescript",
        TypeScriptStrictnessSchema.options,
        "strict",
      ),
      makeEnumField(
        "linter",
        "Linter",
        "linter",
        LinterSchema.options,
        "biome",
      ),
      makeBooleanField(
        "gitInit",
        "Git Init",
        true,
        "Initialize a git repository and create the first commit.",
      ),
    ],
  },
  {
    key: "database",
    label: "Database",
    description: "Database strategy and driver configuration",
    icon: "Database",
    discriminator: "strategy",
    variants: {
      none: [],
      supabase: [],
      drizzle: [
        makeEnumField(
          "driver",
          "Driver",
          "driver",
          DrizzleDriverSchema.options,
          "postgres",
        ),
      ],
      prisma: [],
    },
    fields: [
      makeEnumField(
        "strategy",
        "Strategy",
        "database",
        DatabaseStrategySchema.options,
        "none",
      ),
    ],
  },
  {
    key: "api",
    label: "API",
    description: "API layer strategy",
    icon: "Zap",
    discriminator: "strategy",
    variants: {
      none: [],
      trpc: [],
      hono: [makeEnumField("mode", "Mode", "honoMode", HonoModeSchema.options)],
      "rest-nextjs": [],
    },
    fields: [
      makeEnumField(
        "strategy",
        "Strategy",
        "api",
        ApiStrategySchema.options,
        "none",
      ),
    ],
  },
  {
    key: "auth",
    label: "Authentication",
    description: "Auth provider and access control",
    icon: "Shield",
    fields: [
      makeEnumField(
        "provider",
        "Provider",
        "auth",
        AuthProviderSchema.options,
        "none",
      ),
      makeBooleanField(
        "rbac",
        "Role-Based Access Control",
        false,
        "Scaffold roles & permissions in the auth package — gate routes and actions by role (admin, member, …).",
      ),
      makeBooleanField(
        "entitlements",
        "Entitlements",
        false,
        "Plan/feature gating — check what a user is allowed to do based on their subscription or flags.",
      ),
    ],
  },
  {
    key: "css",
    label: "Styling",
    description: "CSS framework, UI library, and theming",
    icon: "Palette",
    fields: [
      makeEnumField(
        "framework",
        "CSS Framework",
        "css",
        CssFrameworkSchema.options,
        "tailwind4",
      ),
      makeEnumField("ui", "UI Library", "ui", UiLibrarySchema.options, "none"),
      makeEnumField(
        "styling",
        "Styling Architecture",
        "styling",
        StylingArchSchema.options,
        "css-variables",
      ),
    ],
  },
  {
    key: "integrations",
    label: "Integrations",
    description:
      "Analytics, error tracking, email, rate limiting, AI, cache, …",
    icon: "Puzzle",
    // Field list derived from the schema's `integrations.*` keys + provider
    // enums (see INTEGRATION_OPTION_CATEGORIES / INTEGRATION_PROVIDER_VALUES).
    // Adding a category upstream surfaces here automatically; `LABELS` polish
    // is optional — categories with no entry fall back to a humanized id.
    fields: [
      ...INTEGRATION_OPTION_CATEGORIES.map((cat) =>
        makeEnumField(
          cat,
          INTEGRATION_CATEGORY_LABELS[cat] ?? humanize(cat),
          cat,
          INTEGRATION_PROVIDER_VALUES[
            cat as keyof typeof INTEGRATION_PROVIDER_VALUES
          ] as readonly string[],
          "none",
        ),
      ),
      makeBooleanField(
        "envValidation",
        "Env Validation (@t3-oss/env)",
        true,
        "Validate environment variables at boot with typed t3-env schemas — fail fast instead of crashing in prod.",
      ),
    ],
  },
];

/** Metadata for app/package forms (not category cards, but dialog fields) */
export const APP_FIELDS = {
  type: makeEnumField("type", "App Type", "appType", AppTypeSchema.options),
};

export const PACKAGE_FIELDS = {
  type: makeEnumField(
    "type",
    "Package Type",
    "packageType",
    PackageTypeSchema.options,
  ),
};

// ─── Utils ────────────────────────────────────────────────────────────────────

function humanize(str: string): string {
  return str
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
