export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-border bg-muted/40 px-3 py-1 font-mono text-muted-foreground text-xs">
        create-turbo-stack
      </span>
      <h1 className="text-balance font-bold text-4xl tracking-tight sm:text-5xl">
        Welcome to {"{{pkg-name}}"}
      </h1>
      <p className="text-balance text-muted-foreground">
        Edit{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">src/app/page.tsx</code>{" "}
        and save to get started.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90"
          href="https://create-turbo-stack.dev"
          target="_blank"
          rel="noreferrer"
        >
          Documentation
        </a>
        <a
          className="rounded-md border border-border px-4 py-2 font-medium text-sm transition-colors hover:bg-accent"
          href="https://turborepo.com"
          target="_blank"
          rel="noreferrer"
        >
          Turborepo
        </a>
      </div>
    </main>
  );
}
