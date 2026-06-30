export default function App() {
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
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">src/App.tsx</code> and
        save to get started.
      </p>
    </main>
  );
}
