/**
 * Brand / type icons for builder option cards.
 *
 * One tiny 16×16 monogram per known (schema-group, provider-value) pair —
 * coloured square + 2–3 letter abbreviation, palette loosely modelled on each
 * vendor's brand. Pure SVG, no external assets, no install. Unknown values
 * fall back to `null` so the card renders without an icon (the label still
 * carries the meaning).
 *
 * The `group` argument matches `OptionMeta`'s `group` key in `schema-meta.ts`
 * (`"auth"`, `"database"`, `"driver"`, `"analytics"`, `"cache"`, …) and the
 * `value` is the schema enum literal (`"clerk"`, `"supabase"`, …).
 */

import { cn } from "@/lib/cn";

const TILE_CLASS = "h-4 w-4 shrink-0";

function Tile({
  fill,
  label,
  textFill = "#ffffff",
  fontSize,
}: {
  fill: string;
  label: string;
  textFill?: string;
  fontSize?: number;
}) {
  const size =
    fontSize ?? (label.length <= 2 ? 7 : label.length === 3 ? 5.5 : 4.5);
  return (
    <svg viewBox="0 0 16 16" className={TILE_CLASS} aria-hidden="true">
      <rect x="1" y="1.5" width="14" height="13" rx="2.5" fill={fill} />
      <text
        x="8"
        y="11.5"
        textAnchor="middle"
        fontSize={size}
        fontWeight={700}
        fill={textFill}
        fontFamily="-apple-system, ui-sans-serif, sans-serif"
        letterSpacing="-0.02em"
      >
        {label}
      </text>
    </svg>
  );
}

/** "None" / off — muted dash tile, indicates absence of a provider. */
function NoneTile() {
  return (
    <svg viewBox="0 0 16 16" className={TILE_CLASS} aria-hidden="true">
      <rect
        x="1.5"
        y="2"
        width="13"
        height="12"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 2"
        className="text-fd-muted-foreground/50"
      />
      <line
        x1="5"
        y1="8"
        x2="11"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="text-fd-muted-foreground/60"
      />
    </svg>
  );
}

// ─── Per-group resolvers ──────────────────────────────────────────────────────
//
// Each group's resolver returns the icon for its enum values. Adding a new
// provider means appending a case here — the `getProviderIcon` dispatcher
// finds it automatically. "none" goes through `NoneTile` everywhere.

function packageManagerIcon(v: string) {
  switch (v) {
    case "bun":
      return (
        <Tile fill="#FBF0DF" label="Bun" textFill="#1a1a1a" fontSize={5} />
      );
    case "pnpm":
      return <Tile fill="#F69220" label="PNP" />;
    case "npm":
      return <Tile fill="#cb3837" label="NPM" />;
    case "yarn":
      return <Tile fill="#2c8ebb" label="YRN" />;
  }
}

function linterIcon(v: string) {
  switch (v) {
    case "biome":
      return <Tile fill="#60a5fa" label="Bio" />;
    case "oxlint":
      return <Tile fill="#ce6500" label="Oxc" />;
    case "eslint-prettier":
      return <Tile fill="#4b32c3" label="Esl" />;
  }
}

function databaseIcon(v: string) {
  switch (v) {
    case "supabase":
      return <Tile fill="#3ecf8e" label="Sup" textFill="#0a2f1f" />;
    case "drizzle":
      return <Tile fill="#c5f74f" label="Drz" textFill="#1a1a1a" />;
    case "prisma":
      return <Tile fill="#2D3748" label="Prs" />;
    case "none":
      return <NoneTile />;
  }
}

function driverIcon(v: string) {
  switch (v) {
    case "postgres":
      return <Tile fill="#336791" label="Pg" />;
    case "mysql":
      return <Tile fill="#4479a1" label="MyS" />;
    case "sqlite":
      return <Tile fill="#003b57" label="SQL" />;
    case "turso":
      return <Tile fill="#4ff8d2" label="Tur" textFill="#053f3f" />;
    case "neon":
      return <Tile fill="#00e599" label="Neo" textFill="#063b27" />;
    case "planetscale":
      return <Tile fill="#0f172a" label="PS" />;
  }
}

function apiIcon(v: string) {
  switch (v) {
    case "trpc":
      return <Tile fill="#398CCB" label="tRPC" fontSize={4.5} />;
    case "hono":
      return <Tile fill="#ff6900" label="Hno" />;
    case "rest-nextjs":
      return <Tile fill="#0a0a0a" label="Nxt" />;
    case "none":
      return <NoneTile />;
  }
}

function honoModeIcon(v: string) {
  switch (v) {
    case "standalone-app":
      return <Tile fill="#ff6900" label="Sta" />;
    case "nextjs-route":
      return <Tile fill="#0a0a0a" label="Rte" />;
  }
}

function authIcon(v: string) {
  switch (v) {
    case "clerk":
      return <Tile fill="#6c47ff" label="Clk" />;
    case "better-auth":
      return <Tile fill="#0f172a" label="BA" />;
    case "next-auth":
      return <Tile fill="#0a0a0a" label="NA" />;
    case "lucia":
      return <Tile fill="#fc7a1e" label="Luc" />;
    case "supabase-auth":
      return <Tile fill="#3ecf8e" label="SbA" textFill="#0a2f1f" />;
    case "none":
      return <NoneTile />;
  }
}

function cssIcon(v: string) {
  switch (v) {
    case "tailwind4":
      return <Tile fill="#38bdf8" label="TW" textFill="#0c1e2e" />;
    case "vanilla":
      return <Tile fill="#563d7c" label="CSS" />;
    case "css-modules":
      return <Tile fill="#ce4799" label="Mod" />;
  }
}

function uiIcon(v: string) {
  switch (v) {
    case "shadcn":
      return <Tile fill="#0a0a0a" label="Sh" />;
    case "radix-raw":
      return <Tile fill="#161618" label="Rdx" />;
    case "none":
      return <NoneTile />;
  }
}

function analyticsIcon(v: string) {
  switch (v) {
    case "posthog":
      return <Tile fill="#f54e00" label="PH" />;
    case "vercel-analytics":
      return <Tile fill="#0a0a0a" label="Vrc" />;
    case "plausible":
      return <Tile fill="#5850ec" label="Pls" />;
    case "none":
      return <NoneTile />;
  }
}

function errorTrackingIcon(v: string) {
  switch (v) {
    case "sentry":
      return <Tile fill="#362d59" label="Snt" />;
    case "bugsnag":
      return <Tile fill="#4949e4" label="Bgs" />;
    case "none":
      return <NoneTile />;
  }
}

function emailIcon(v: string) {
  switch (v) {
    case "react-email-resend":
      return <Tile fill="#0a0a0a" label="Rsd" />;
    case "nodemailer":
      return <Tile fill="#22a06b" label="Nml" />;
    case "none":
      return <NoneTile />;
  }
}

function rateLimitIcon(v: string) {
  switch (v) {
    case "upstash":
      return <Tile fill="#00e9a3" label="Ups" textFill="#063b27" />;
    case "none":
      return <NoneTile />;
  }
}

function aiIcon(v: string) {
  switch (v) {
    case "vercel-ai-sdk":
      return <Tile fill="#0a0a0a" label="AI" />;
    case "langchain":
      return <Tile fill="#1c3c3c" label="LC" />;
    case "none":
      return <NoneTile />;
  }
}

function cacheIcon(v: string) {
  switch (v) {
    case "upstash":
      return <Tile fill="#00e9a3" label="Ups" textFill="#063b27" />;
    case "none":
      return <NoneTile />;
  }
}

function appTypeIcon(v: string) {
  switch (v) {
    case "nextjs":
    case "nextjs-api-only":
      return <Tile fill="#0a0a0a" label="Nxt" />;
    case "expo":
      return <Tile fill="#0a0a0a" label="Exp" />;
    case "hono-standalone":
      return <Tile fill="#ff6900" label="Hno" />;
    case "vite-react":
      return <Tile fill="#646cff" label="Vte" />;
    case "vite-vue":
      return <Tile fill="#41b883" label="Vue" textFill="#0a2f1f" />;
    case "sveltekit":
      return <Tile fill="#ff3e00" label="Svk" />;
    case "astro":
      return <Tile fill="#ff5d01" label="Ast" />;
    case "tauri":
      return <Tile fill="#ffc131" label="Tau" textFill="#1a1a1a" />;
  }
}

function packageTypeIcon(v: string) {
  switch (v) {
    case "ui":
      return <Tile fill="#ec4899" label="UI" />;
    case "utils":
      return <Tile fill="#64748b" label="Utl" />;
    case "config":
      return <Tile fill="#475569" label="Cfg" />;
    case "library":
      return <Tile fill="#0ea5e9" label="Lib" />;
    case "react-library":
      return <Tile fill="#60a5fa" label="Rxl" />;
  }
}

function typescriptIcon(v: string) {
  switch (v) {
    case "strict":
      return <Tile fill="#3178c6" label="Str" />;
    case "relaxed":
      return <Tile fill="#60a5fa" label="Rlx" />;
  }
}

function stylingIcon(v: string) {
  switch (v) {
    case "css-variables":
      return <Tile fill="#7c3aed" label="Var" />;
    case "static":
      return <Tile fill="#64748b" label="Stc" />;
  }
}

// ─── Public dispatcher ────────────────────────────────────────────────────────

const GROUP_RESOLVERS: Record<
  string,
  (v: string) => React.ReactNode | undefined
> = {
  packageManager: packageManagerIcon,
  linter: linterIcon,
  database: databaseIcon,
  driver: driverIcon,
  api: apiIcon,
  honoMode: honoModeIcon,
  auth: authIcon,
  css: cssIcon,
  ui: uiIcon,
  analytics: analyticsIcon,
  errorTracking: errorTrackingIcon,
  email: emailIcon,
  rateLimit: rateLimitIcon,
  ai: aiIcon,
  cache: cacheIcon,
  appType: appTypeIcon,
  packageType: packageTypeIcon,
  typescript: typescriptIcon,
  styling: stylingIcon,
};

/**
 * Resolve a (group, value) pair to an icon. `group` matches `OptionMeta.group`
 * in `schema-meta.ts`; `value` is the schema enum literal. Returns `null`
 * when the pair has no icon defined — the card renders without one.
 */
export function ProviderIcon({
  group,
  value,
  className,
}: {
  group: string;
  value: string;
  className?: string;
}) {
  const resolver = GROUP_RESOLVERS[group];
  const icon = resolver?.(value);
  if (!icon) return null;
  return <span className={cn("inline-flex shrink-0", className)}>{icon}</span>;
}
