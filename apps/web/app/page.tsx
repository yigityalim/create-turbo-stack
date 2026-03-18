const features = [
  {
    title: "CSS @source Wiring",
    description:
      "Tailwind 4 cross-package @source directives auto-generated. No more silent class purging.",
    icon: "🎨",
  },
  {
    title: "Catalog Dependencies",
    description:
      "All deps pinned once in root catalog. Workspaces use catalog: protocol. Zero version drift.",
    icon: "📦",
  },
  {
    title: "Environment Validation",
    description:
      "t3-env chains per app with correct extends. Runtime crashes from missing vars eliminated.",
    icon: "🔐",
  },
  {
    title: "TypeScript Config Chain",
    description:
      "Shared tsconfig base with per-package extends. Consistent compiler options everywhere.",
    icon: "⚙️",
  },
  {
    title: "Preset System",
    description:
      "Save, share, and reuse stack configurations. Community presets via URL, like shadcn registry.",
    icon: "📋",
  },
  {
    title: "MCP Server",
    description:
      "AI agents scaffold via Model Context Protocol. Claude Code and Cursor run the CLI, not raw files.",
    icon: "🤖",
  },
];

const stackOptions = [
  { category: "Database", options: "Supabase, Drizzle, Prisma" },
  { category: "API", options: "tRPC v11, Hono, Next.js Routes" },
  {
    category: "Auth",
    options: "Supabase Auth, Better Auth, Clerk, NextAuth, Lucia",
  },
  { category: "CSS", options: "Tailwind 4/3, shadcn/ui, Radix" },
  { category: "Apps", options: "Next.js, Expo, Hono, Vite, SvelteKit, Astro" },
  {
    category: "Extras",
    options: "Sentry, PostHog, React Email, Vercel AI SDK",
  },
];

const presets = [
  {
    name: "minimal",
    description: "Next.js + UI package + Tailwind 4 + Biome",
    href: "/s/minimal.json",
  },
  {
    name: "saas-starter",
    description: "Supabase + tRPC + shadcn + i18n + Sentry + PostHog",
    href: "/s/saas-starter.json",
  },
  {
    name: "api-only",
    description: "Hono + Drizzle + Upstash — no frontend",
    href: "/s/api-only.json",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center gap-8 px-6 pt-24 pb-20 text-center">
        <div className="flex flex-col items-center gap-5">
          <span className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
            v0.1.0 — Phase 1
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Production-ready Turborepo
            <br />
            <span className="text-accent">in seconds, not days</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Stop wiring CSS @source directives, catalog dependencies, and env
            chains by hand. Scaffold a fully wired monorepo with one command.
          </p>
        </div>

        {/* Terminal */}
        <div className="w-full max-w-lg">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <div className="size-3 rounded-full bg-[#ff5f57]" />
              <div className="size-3 rounded-full bg-[#febc2e]" />
              <div className="size-3 rounded-full bg-[#28c840]" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                terminal
              </span>
            </div>
            <div className="p-4 font-mono text-sm">
              <div className="flex gap-2">
                <span className="text-accent">$</span>
                <span>npx create-turbo-stack my-project</span>
              </div>
              <div className="mt-3 text-muted-foreground text-start">
                <p>
                  ◆ Package manager?{" "}
                  <span className="text-foreground">bun</span>
                </p>
                <p>
                  ◆ Database? <span className="text-foreground">Supabase</span>
                </p>
                <p>
                  ◆ API layer? <span className="text-foreground">tRPC v11</span>
                </p>
                <p>
                  ◆ Auth? <span className="text-foreground">Supabase Auth</span>
                </p>
                <p className="mt-2 text-accent">✓ Created 2 apps, 6 packages</p>
                <p className="text-accent">✓ Wired CSS @source directives</p>
                <p className="text-accent">✓ Catalog with 47 dependencies</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <a
            href="/builder"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Open Builder
          </a>
          <a
            href="https://github.com/yigityalim/create-turbo-stack"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto h-px w-full max-w-6xl bg-border/50" />

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            The hard part isn&apos;t creating files
          </h2>
          <p className="mt-3 text-muted-foreground">
            It&apos;s wiring them correctly across packages.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-border/80"
            >
              <div className="mb-3 text-2xl">{feature.icon}</div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto h-px w-full max-w-6xl bg-border/50" />

      {/* Stack Options */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Choose your stack</h2>
          <p className="mt-3 text-muted-foreground">
            Every option is production-tested.
          </p>
        </div>
        <div className="mx-auto grid max-w-2xl gap-3">
          {stackOptions.map((item) => (
            <div
              key={item.category}
              className="flex items-baseline gap-4 rounded-lg border border-border bg-card px-5 py-3"
            >
              <span className="w-24 shrink-0 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
                {item.category}
              </span>
              <span className="text-sm text-muted-foreground">
                {item.options}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto h-px w-full max-w-6xl bg-border/50" />

      {/* Presets */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Built-in presets</h2>
          <p className="mt-3 text-muted-foreground">
            Start with a proven configuration. Or create your own.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {presets.map((preset) => (
            <a
              key={preset.name}
              href={preset.href}
              className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent/50"
            >
              <div className="font-mono text-sm font-semibold group-hover:text-accent">
                {preset.name}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {preset.description}
              </p>
              <div className="mt-3 font-mono text-xs text-muted-foreground">
                npx create-turbo-stack --preset {preset.name}
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto h-px w-full max-w-6xl bg-border/50" />

      {/* CTA */}
      <section className="flex flex-col items-center gap-6 px-6 py-20 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Ready to build?</h2>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 font-mono text-sm">
          <span className="text-accent">$</span>
          <span>npx create-turbo-stack</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>create-turbo-stack</span>
          <div className="flex gap-6">
            <a
              href="/schema/preset.json"
              className="transition-colors hover:text-foreground"
            >
              Schema
            </a>
            <a
              href="/s/registry.json"
              className="transition-colors hover:text-foreground"
            >
              Registry
            </a>
            <a
              href="https://github.com/yigityalim/create-turbo-stack"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
