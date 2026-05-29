import Link from "next/link";
import { Hero } from "@/components/landing/hero";
import { Reveal, RevealGroup, RevealItem } from "@/components/landing/reveal";
import { SiteFooter } from "@/components/landing/site-footer";
import { integrationGroups, stackGroups, stats } from "@/lib/landing-data";

const steps = [
  {
    n: "01",
    title: "Answer the prompts",
    description:
      "Pick a package manager, database, auth, API layer and styling — or load a preset to skip ahead.",
    hint: "$ npx create-turbo-stack",
  },
  {
    n: "02",
    title: "Core resolves the preset",
    description:
      "One Preset JSON drives the engine: file tree, dependency catalog, CSS @source, env chains and tsconfig refs.",
    hint: "preset.json → TreeDiff",
  },
  {
    n: "03",
    title: "Ship a wired monorepo",
    description:
      "Apps and packages, correctly cross-wired from the first commit. Run install, then dev. That's it.",
    hint: "$ bun install && bun dev",
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

const wiring = [
  {
    title: "Dependency catalog",
    file: "package.json",
    code: `{
  "workspaces": {
    "catalog": {
      "react": "19.2.4",
      "next": "16.2.0",
      "zod": "4.3.6"
    }
  }
}

// packages/ui/package.json
"dependencies": {
  "react": "catalog:"
}`,
  },
  {
    title: "CSS @source directives",
    file: "apps/web/app.css",
    code: `@import "tailwindcss";

/* generated — every package that
   ships classes is wired in */
@source "../../packages/ui/src";
@source "../../packages/email/src";`,
  },
  {
    title: "Typed env chain",
    file: "apps/web/env.ts",
    code: `import { createEnv } from "@t3-oss/env-nextjs";
import { env as auth } from "@acme/auth/env";
import { env as db } from "@acme/db/env";

export const env = createEnv({
  extends: [auth, db],
  server: { RESEND_KEY: z.string() },
});`,
  },
];

export default function HomePage() {
  return (
    <>
      <div className="mx-auto w-full max-w-6xl border-fd-border sm:border-x">
        <Hero stats={stats} />
        <Bento />
        <HowItWorks />
        <Stack />
        <Integrations />
        <Wiring />
        <Presets />
        <Mcp />
        <Cta />
      </div>
      <SiteFooter />
    </>
  );
}

// ─── Bento ───────────────────────────────────────────────────────────────────

function Bento() {
  return (
    <section className="border-fd-border border-b">
      <SectionHeader
        index="01"
        label="Why"
        title="The hard part isn't creating files"
        subtitle="It's wiring them correctly across packages — the part every starter skips."
      />
      <RevealGroup
        className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2 lg:auto-rows-[12rem] lg:grid-cols-4"
        stagger={0.06}
      >
        <BentoCell className="lg:col-span-2 lg:row-span-2">
          <CellLabel>Wiring &gt; scaffolding</CellLabel>
          <p className="mt-3 text-fd-muted-foreground text-sm leading-relaxed">
            File count is easy. Correct cross-package wiring is the value —
            Tailwind <code className="text-fd-primary">@source</code>, catalog
            deps, env chains, tsconfig refs, all consistent.
          </p>
          <pre className="mt-auto overflow-x-auto rounded-[3px] border border-fd-border bg-fd-background p-3 font-mono text-[11px] text-fd-muted-foreground leading-relaxed">
            {`@source "../../packages/ui/src";
"react": "catalog:"
extends: [authEnv, dbEnv]`}
          </pre>
        </BentoCell>

        <BentoCell className="lg:col-span-2">
          <CellLabel>Zero version drift</CellLabel>
          <p className="mt-3 text-fd-muted-foreground text-sm leading-relaxed">
            Every dependency is pinned once in the root catalog. Workspaces use
            the <code className="text-fd-primary">catalog:</code> protocol — no
            mismatched React across packages, ever.
          </p>
        </BentoCell>

        <BentoCell>
          <CellLabel>Env validation</CellLabel>
          <p className="mt-2 text-fd-muted-foreground text-sm leading-relaxed">
            t3-env chains per app. Missing vars crash at boot, not in prod.
          </p>
        </BentoCell>

        <BentoCell>
          <CellLabel>tsconfig chain</CellLabel>
          <p className="mt-2 text-fd-muted-foreground text-sm leading-relaxed">
            One shared base, per-package extends. Same compiler options
            everywhere.
          </p>
        </BentoCell>

        <BentoCell className="lg:col-span-2">
          <CellLabel>Synced with the schema</CellLabel>
          <p className="mt-3 text-fd-muted-foreground text-sm leading-relaxed">
            Every option on this page is read from the same Zod schema the CLI
            and builder use. The site can't drift from what's actually
            supported.
          </p>
        </BentoCell>

        <BentoCell className="lg:col-span-2">
          <CellLabel>Preset = universal contract</CellLabel>
          <p className="mt-3 text-fd-muted-foreground text-sm leading-relaxed">
            CLI, web builder, community registry and MCP all emit the same
            Preset JSON. Save it, share it by URL, reuse it.
          </p>
        </BentoCell>
      </RevealGroup>
    </section>
  );
}

function BentoCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <RevealItem
      className={`brutal-hover flex flex-col rounded-[3px] border border-fd-border bg-fd-card p-5 ${className ?? ""}`}
    >
      {children}
    </RevealItem>
  );
}

function CellLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono font-semibold text-sm uppercase tracking-wide">
      {children}
    </h3>
  );
}

// ─── How it works ──────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section className="border-fd-border border-b">
      <SectionHeader
        index="02"
        label="How it works"
        title="One preset, fully wired"
        subtitle="Three steps from an empty folder to a monorepo that already compiles."
      />
      <RevealGroup className="grid grid-cols-1 gap-px bg-fd-border md:grid-cols-3">
        {steps.map((step) => (
          <RevealItem key={step.n} className="bg-fd-background p-6 sm:p-8">
            <span className="font-bold font-mono text-3xl text-fd-primary tabular-nums">
              {step.n}
            </span>
            <h3 className="mt-4 font-semibold">{step.title}</h3>
            <p className="mt-2 text-fd-muted-foreground text-sm leading-relaxed">
              {step.description}
            </p>
            <code className="mt-4 block overflow-x-auto rounded-[3px] border border-fd-border bg-fd-secondary px-3 py-1.5 font-mono text-[11px] text-fd-muted-foreground">
              {step.hint}
            </code>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

// ─── Stack (schema-synced, chips) ────────────────────────────────────────────

function Stack() {
  return (
    <section className="border-fd-border border-b">
      <SectionHeader
        index="03"
        label="Stack"
        title="Choose your stack"
        subtitle="Read straight from the schema — the same list the CLI and builder use."
      />
      <RevealGroup className="divide-y divide-fd-border" stagger={0.05}>
        {stackGroups.map((group) => (
          <RevealItem
            key={group.label}
            className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center"
          >
            <span className="flex w-40 shrink-0 items-baseline gap-2 font-mono text-fd-primary text-xs uppercase tracking-wider">
              {group.label}
              <span className="text-fd-muted-foreground">
                {String(group.options.length).padStart(2, "0")}
              </span>
            </span>
            <div className="flex flex-wrap gap-2">
              {group.options.map((o) => (
                <Chip key={o.value}>{o.label}</Chip>
              ))}
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[2px] border border-fd-border bg-fd-background px-2.5 py-1 font-mono text-fd-muted-foreground text-xs transition-colors hover:border-fd-primary hover:text-fd-primary">
      {children}
    </span>
  );
}

// ─── Integrations (schema-synced bento) ──────────────────────────────────────

function Integrations() {
  return (
    <section className="border-fd-border border-b">
      <SectionHeader
        index="04"
        label="Integrations"
        title="Batteries, optional"
        subtitle="Drop-in providers wired with env validation and per-app packages."
      />
      <RevealGroup className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {integrationGroups.map((group) => (
          <RevealItem
            key={group.label}
            className="brutal-hover flex flex-col rounded-[3px] border border-fd-border bg-fd-card p-5"
          >
            <div className="flex items-baseline justify-between">
              <CellLabel>{group.label}</CellLabel>
              <span className="font-mono text-[11px] text-fd-muted-foreground">
                {String(group.options.length).padStart(2, "0")}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {group.options.map((o) => (
                <li
                  key={o.value}
                  className="flex items-baseline gap-2 text-fd-muted-foreground text-sm"
                >
                  <span className="text-fd-primary">›</span>
                  {o.label}
                </li>
              ))}
            </ul>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

// ─── Wiring deep-dive (code) ─────────────────────────────────────────────────

function Wiring() {
  return (
    <section className="border-fd-border border-b">
      <SectionHeader
        index="05"
        label="Under the hood"
        title="The wiring you'd otherwise hand-write"
        subtitle="A few of the cross-package files the engine generates and keeps consistent."
      />
      <RevealGroup className="grid grid-cols-1 gap-3 p-6 lg:grid-cols-3">
        {wiring.map((w) => (
          <RevealItem
            key={w.title}
            className="flex flex-col overflow-hidden rounded-[3px] border border-fd-border bg-fd-card"
          >
            <div className="flex items-center justify-between border-fd-border border-b px-4 py-2.5">
              <span className="font-mono font-semibold text-xs">{w.title}</span>
              <span className="font-mono text-[10px] text-fd-muted-foreground">
                {w.file}
              </span>
            </div>
            <pre className="flex-1 overflow-x-auto p-4 font-mono text-[11px] text-fd-muted-foreground leading-relaxed">
              {w.code}
            </pre>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

// ─── Presets ──────────────────────────────────────────────────────────────────

function Presets() {
  return (
    <section className="border-fd-border border-b">
      <SectionHeader
        index="06"
        label="Presets"
        title="Built-in presets"
        subtitle={
          <>
            Start with a proven configuration. Or{" "}
            <Link
              href="/builder"
              className="text-fd-primary underline underline-offset-4"
            >
              build your own
            </Link>
            .
          </>
        }
      />
      <RevealGroup className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-3">
        {presets.map((preset) => (
          <RevealItem
            key={preset.name}
            className="brutal-hover flex flex-col rounded-[3px] border border-fd-border bg-fd-card p-5"
          >
            <div className="font-mono font-semibold text-fd-primary text-sm">
              {preset.name}
            </div>
            <p className="mt-2 flex-1 text-fd-muted-foreground text-sm">
              {preset.description}
            </p>
            <code className="mt-4 block overflow-x-auto rounded-[3px] border border-fd-border bg-fd-background px-3 py-1.5 font-mono text-xs">
              <span className="text-fd-primary">$</span> {preset.command}
            </code>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

// ─── MCP ───────────────────────────────────────────────────────────────────────

function Mcp() {
  return (
    <Reveal className="border-fd-border border-b">
      <div className="grid grid-cols-1 items-center gap-8 px-6 py-14 lg:grid-cols-2">
        <div>
          <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-[0.3em]">
            {"// 07 — Agents"}
          </span>
          <h2 className="mt-4 font-bold text-2xl tracking-tight sm:text-3xl">
            Scaffold from your editor
          </h2>
          <p className="mt-3 max-w-md text-fd-muted-foreground leading-relaxed">
            An MCP server exposes the engine to AI agents. Claude Code and
            Cursor run the CLI through the Model Context Protocol — they emit a
            Preset, not raw files.
          </p>
          <Link
            href="/docs/mcp"
            className="brutal-hover mt-6 inline-block rounded-[3px] border border-fd-border bg-fd-background px-4 py-2 font-medium text-sm"
          >
            Read the MCP docs
          </Link>
        </div>
        <div className="overflow-hidden rounded-[3px] border border-fd-border bg-fd-card">
          <div className="flex items-center justify-between border-fd-border border-b px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="size-2.5 bg-fd-primary" />
              <span className="font-mono font-semibold text-xs">claude</span>
            </div>
            <span className="font-mono text-[10px] text-fd-muted-foreground uppercase tracking-[0.2em]">
              mcp
            </span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-[11px] text-fd-muted-foreground leading-relaxed">
            {`▸ create_preset({
    apps: ["web"],
    database: "drizzle",
    auth: "better-auth"
  })

✓ preset resolved → 6 packages
✓ ready to scaffold`}
          </pre>
        </div>
      </div>
    </Reveal>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function Cta() {
  return (
    <Reveal className="flex flex-col items-center gap-6 px-6 py-20 text-center">
      <h2 className="font-bold text-2xl tracking-tight sm:text-3xl">
        Ready to build?
      </h2>
      <div className="overflow-hidden rounded-[3px] border border-fd-border bg-fd-card">
        <div className="flex items-center gap-2 border-fd-border border-b px-4 py-2.5">
          <span className="size-2.5 bg-fd-primary" />
          <span className="font-mono text-fd-muted-foreground text-xs">
            ~/projects
          </span>
        </div>
        <div className="px-5 py-3 font-mono text-sm">
          <span className="text-fd-primary">$</span> npx create-turbo-stack
        </div>
      </div>
      <div className="flex gap-3 font-mono text-xs">
        <Link
          href="/builder"
          className="text-fd-muted-foreground uppercase tracking-wide transition-colors hover:text-fd-primary"
        >
          Builder
        </Link>
        <span className="text-fd-border">·</span>
        <Link
          href="/docs"
          className="text-fd-muted-foreground uppercase tracking-wide transition-colors hover:text-fd-primary"
        >
          Docs
        </Link>
        <span className="text-fd-border">·</span>
        <a
          href="https://github.com/yigityalim/create-turbo-stack"
          target="_blank"
          rel="noopener noreferrer"
          className="text-fd-muted-foreground uppercase tracking-wide transition-colors hover:text-fd-primary"
        >
          GitHub
        </a>
      </div>
    </Reveal>
  );
}

// ─── Shared section header ────────────────────────────────────────────────────

function SectionHeader({
  index,
  label,
  title,
  subtitle,
}: {
  index: string;
  label: string;
  title: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <Reveal className="border-fd-border border-b px-6 pt-12 pb-8">
      <div className="flex items-baseline gap-3 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-[0.25em]">
        <span className="text-fd-primary">{index}</span>
        <span className="h-px w-6 self-center bg-fd-border" />
        <span>{label}</span>
      </div>
      <h2 className="mt-4 font-bold text-2xl tracking-tight sm:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 max-w-xl text-fd-muted-foreground">{subtitle}</p>
      )}
    </Reveal>
  );
}
