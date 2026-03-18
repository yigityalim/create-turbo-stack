import Link from "next/link";

const features = [
  {
    title: "CSS @source Wiring",
    description:
      "Tailwind 4 cross-package @source directives auto-generated. No more silent class purging.",
  },
  {
    title: "Catalog Dependencies",
    description:
      "All deps pinned once in root catalog. Workspaces use catalog: protocol. Zero version drift.",
  },
  {
    title: "Environment Validation",
    description:
      "t3-env chains per app with correct extends. Runtime crashes from missing vars eliminated.",
  },
  {
    title: "TypeScript Config Chain",
    description:
      "Shared tsconfig base with per-package extends. Consistent compiler options everywhere.",
  },
  {
    title: "Preset System",
    description:
      "Save, share, and reuse stack configurations. Community presets via URL, like shadcn registry.",
  },
  {
    title: "MCP Server",
    description:
      "AI agents scaffold via Model Context Protocol. Claude Code and Cursor run the CLI, not raw files.",
  },
];

const stackOptions = [
  { category: "Database", options: "Supabase · Drizzle · Prisma" },
  { category: "API", options: "tRPC v11 · Hono · Next.js Routes" },
  {
    category: "Auth",
    options: "Supabase Auth · Better Auth · Clerk · NextAuth · Lucia",
  },
  { category: "CSS", options: "Tailwind 4 · Tailwind 3 · shadcn/ui · Radix" },
  {
    category: "Apps",
    options: "Next.js · Expo · Hono · Vite · SvelteKit · Astro",
  },
  {
    category: "Extras",
    options: "Sentry · PostHog · React Email · Vercel AI SDK",
  },
];

const presets = [
  {
    name: "minimal",
    description: "Next.js + UI package + Tailwind 4 + Biome",
    command: "npx create-turbo-stack --preset minimal",
  },
  {
    name: "saas-starter",
    description: "Supabase + tRPC + shadcn + i18n + Sentry + PostHog",
    command: "npx create-turbo-stack --preset saas-starter",
  },
  {
    name: "api-only",
    description: "Hono + Drizzle + Upstash — no frontend",
    command: "npx create-turbo-stack --preset api-only",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ASCII Hero */}
      <section className="flex flex-col items-center gap-8 px-6 pt-16 pb-16">
        <div className="relative flex items-center justify-center rounded-2xl bg-fd-background px-3 py-4 sm:px-4 sm:py-5">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-3 md:gap-4">
            <pre className="ascii-art text-fd-primary text-[0.5rem] leading-tight sm:text-xs">
              {`█████╗██████╗ ███████╗ █████╗ ████████╗███████╗
██╔══╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔════╝
██║   ██████╔╝█████╗  ███████║   ██║   █████╗
██║   ██╔══██╗██╔══╝  ██╔══██║   ██║   ██╔══╝
╚████╗██║  ██║███████╗██║  ██║   ██║   ███████╗
 ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝`}
            </pre>
            <pre className="ascii-art text-fd-primary text-[0.5rem] leading-tight sm:text-xs">
              {`████████╗██╗   ██╗██████╗ ██████╗  ██████╗
╚══██╔══╝██║   ██║██╔══██╗██╔══██╗██╔═══██╗
   ██║   ██║   ██║██████╔╝██████╔╝██║   ██║
   ██║   ██║   ██║██╔══██╗██╔══██╗██║   ██║
   ██║   ╚██████╔╝██║  ██║██████╔╝╚██████╔╝
   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═════╝  ╚═════╝`}
            </pre>
            <pre className="ascii-art text-fd-primary text-[0.5rem] leading-tight sm:text-xs">
              {`███████╗████████╗ █████╗  ██████╗██╗  ██╗
██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
███████╗   ██║   ███████║██║     █████╔╝
╚════██║   ██║   ██╔══██║██║     ██╔═██╗
███████║   ██║   ██║  ██║╚██████╗██║  ██╗
╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝`}
            </pre>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          <p className="max-w-xl text-lg leading-relaxed text-fd-muted-foreground">
            Scaffold production-ready Turborepo monorepos in seconds, not days.
            Database, auth, API, shared UI, environment validation — all wired
            correctly from the start.
          </p>
        </div>

        {/* Terminal */}
        <div className="w-full max-w-lg">
          <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card">
            <div className="flex items-center gap-2 border-b border-fd-border px-4 py-2.5">
              <div className="size-3 rounded-full bg-[#ff5f57]" />
              <div className="size-3 rounded-full bg-[#febc2e]" />
              <div className="size-3 rounded-full bg-[#28c840]" />
              <span className="ml-2 font-mono text-xs text-fd-muted-foreground">
                terminal
              </span>
            </div>
            <div className="p-4 font-mono text-sm">
              <div className="flex gap-2">
                <span className="text-fd-primary">$</span>
                <span>npx create-turbo-stack my-project</span>
              </div>
              <div className="mt-3 space-y-0.5 text-fd-muted-foreground">
                <p>
                  ◆ Package manager?{" "}
                  <span className="text-fd-foreground">bun</span>
                </p>
                <p>
                  ◆ Database?{" "}
                  <span className="text-fd-foreground">Supabase</span>
                </p>
                <p>
                  ◆ API layer?{" "}
                  <span className="text-fd-foreground">tRPC v11</span>
                </p>
                <p>
                  ◆ Auth?{" "}
                  <span className="text-fd-foreground">Supabase Auth</span>
                </p>
                <p className="mt-2 text-fd-primary">
                  ✓ Created 2 apps, 6 packages
                </p>
                <p className="text-fd-primary">
                  ✓ Wired CSS @source directives
                </p>
                <p className="text-fd-primary">
                  ✓ Catalog with 47 dependencies
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/builder"
            className="rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            Open Builder
          </Link>
          <Link
            href="/docs"
            className="rounded-lg border border-fd-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent"
          >
            Documentation
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            The hard part isn&apos;t creating files
          </h2>
          <p className="mt-3 text-fd-muted-foreground">
            It&apos;s wiring them correctly across packages.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-fd-border bg-fd-card p-6 transition-colors hover:bg-fd-accent/50"
            >
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack Options */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Choose your stack</h2>
          <p className="mt-3 text-fd-muted-foreground">
            Every option is production-tested.
          </p>
        </div>
        <div className="mx-auto grid max-w-2xl gap-2">
          {stackOptions.map((item) => (
            <div
              key={item.category}
              className="flex items-baseline gap-4 rounded-lg border border-fd-border bg-fd-card px-5 py-3"
            >
              <span className="w-20 shrink-0 font-mono text-xs font-semibold uppercase tracking-wider text-fd-primary">
                {item.category}
              </span>
              <span className="text-sm text-fd-muted-foreground">
                {item.options}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Presets */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Built-in presets</h2>
          <p className="mt-3 text-fd-muted-foreground">
            Start with a proven configuration. Or{" "}
            <Link
              href="/docs"
              className="text-fd-primary underline underline-offset-4"
            >
              create your own
            </Link>
            .
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {presets.map((preset) => (
            <div
              key={preset.name}
              className="group rounded-xl border border-fd-border bg-fd-card p-5 transition-colors hover:bg-fd-accent/50"
            >
              <div className="font-mono text-sm font-semibold text-fd-primary">
                {preset.name}
              </div>
              <p className="mt-2 text-sm text-fd-muted-foreground">
                {preset.description}
              </p>
              <code className="mt-3 block rounded-md bg-fd-secondary px-3 py-1.5 font-mono text-xs text-fd-secondary-foreground">
                {preset.command}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-6 px-6 py-16 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Ready to build?</h2>
        <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card">
          <div className="flex items-center gap-2 border-b border-fd-border px-4 py-2">
            <div className="size-2.5 rounded-full bg-[#ff5f57]" />
            <div className="size-2.5 rounded-full bg-[#febc2e]" />
            <div className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="px-5 py-3 font-mono text-sm">
            <span className="text-fd-primary">$</span> npx create-turbo-stack
          </div>
        </div>
        <div className="flex gap-3 text-sm">
          <Link
            href="/schema/preset.json"
            className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            Schema
          </Link>
          <span className="text-fd-border">·</span>
          <Link
            href="/s/registry.json"
            className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            Registry
          </Link>
          <span className="text-fd-border">·</span>
          <a
            href="https://github.com/yigityalim/create-turbo-stack"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            GitHub
          </a>
        </div>
      </section>
    </div>
  );
}
