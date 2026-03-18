export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-1 w-full max-w-5xl flex-col items-center justify-center gap-8 px-6 py-24">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            Open Source CLI
          </span>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            create-turbo-stack
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Scaffold production-ready Turborepo monorepos in seconds, not days.
            Database, auth, API, shared UI, environment validation — all wired
            correctly from the start.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 font-mono text-sm">
            <span className="text-muted-foreground">$</span>
            <span>npx create-turbo-stack</span>
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <a
            href="/builder"
            className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Open Builder
          </a>
          <a
            href="https://github.com/mehmetyigityalim/create-turbo-stack"
            className="rounded-lg border border-border px-4 py-2 font-medium transition-colors hover:bg-muted"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>

        {/* TODO: Phase 4 — Feature grid, demo video, preset gallery */}
      </main>
    </div>
  );
}
