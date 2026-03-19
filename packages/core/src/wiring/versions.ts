/**
 * Pinned dependency versions for the catalog.
 * Update these when bumping ecosystem versions.
 */
export const VERSIONS = {
  // Core
  typescript: "^5.9.0",

  // Package managers (fallback versions — CLI should override with actual)
  bun: "1.3.10",
  pnpm: "9.15.0",
  npm: "10.9.0",
  yarn: "4.6.0",

  // Linters
  biome: "^1.9.0",
  eslint: "^9.0.0",
  prettier: "^3.8.0",

  // CSS
  tailwind4: "^4.0.0",
  tailwind3: "^3.4.0",
  tailwindPostcss: "^4.0.0",
  postcss: "^8.0.0",
  autoprefixer: "^10.0.0",
  twAnimateCss: "^1.0.0",

  // React / Next.js
  next: "^15.0.0",
  react: "^19.0.0",
  reactDom: "^19.0.0",
  typesReact: "^19.0.0",
  typesReactDom: "^19.0.0",
  typesNode: "^22.0.0",

  // Vite
  vite: "^6.0.0",
  vitejsPluginReact: "^4.0.0",

  // Svelte / SvelteKit
  svelte: "^5.0.0",
  sveltejsKit: "^2.0.0",
  sveltejsAdapterAuto: "^3.0.0",
  sveltejsVitePluginSvelte: "^4.0.0",

  // Astro
  astro: "^5.0.0",
  astrojsReact: "^4.0.0",

  // Remix
  remixRunNode: "^2.0.0",
  remixRunReact: "^2.0.0",
  remixRunServe: "^2.0.0",
  remixRunDev: "^2.0.0",
  isbot: "^5.0.0",

  // Hono
  hono: "^4.0.0",
  honoNodeServer: "^1.0.0",
  tsx: "^4.0.0",

  // i18n
  nextIntl: "^4.0.0",

  // Database
  supabaseJs: "^2.0.0",
  supabaseSsr: "^0.5.0",
  drizzleOrm: "^0.38.0",
  drizzleKit: "^0.30.0",
  prisma: "^6.0.0",
  prismaClient: "^6.0.0",

  // Drizzle drivers
  postgres: "^3.4.0",
  mysql2: "^3.12.0",
  betterSqlite3: "^11.0.0",
  libsqlClient: "^0.14.0",
  neonServerless: "^0.10.0",
  planetscaleDatabase: "^1.0.0",

  // API
  trpcServer: "^11.0.0",
  trpcClient: "^11.0.0",
  trpcReactQuery: "^11.0.0",
  tanstackReactQuery: "^5.0.0",
  superjson: "^2.0.0",
  zod: "^4.0.0",

  // Auth
  betterAuth: "^1.0.0",
  clerkNextjs: "^6.0.0",
  nextAuth: "^5.0.0",

  // Env
  t3Env: "^0.12.0",

  // Integrations
  posthogJs: "^1.0.0",
  posthogNode: "^4.0.0",
  vercelAnalytics: "^1.0.0",
  sentryNextjs: "^9.0.0",
  resend: "^4.0.0",
  reactEmailComponents: "^0.1.0",
  nodemailer: "^6.0.0",
  typesNodemailer: "^6.0.0",
  upstashRatelimit: "^2.0.0",
  upstashRedis: "^1.0.0",
  ai: "^4.0.0",
  aiSdkOpenai: "^1.0.0",
} as const;
