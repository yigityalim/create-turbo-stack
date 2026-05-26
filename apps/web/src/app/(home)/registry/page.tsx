import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registry — create-turbo-stack",
  description:
    "Ready-made Turborepo workspace packages. Add them to your monorepo with `cts add <name>` — the code is copied in, and you own it.",
};

type RegistryItem = {
  name: string;
  title?: string;
  description: string;
  build: "none" | "tsup";
  dependencies: string[];
  categories?: string[];
};

type Registry = { name: string; items: RegistryItem[] };

async function getRegistry(): Promise<Registry> {
  const baseURL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseURL}/r/registry.json`, {
    next: { revalidate: 60 },
    cache: "no-cache",
  });
  return res.json();
}

export default async function RegistryPage() {
  const registry = await getRegistry();

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold text-fd-foreground sm:text-3xl">
          Registry
        </h1>
        <p className="mt-2 font-mono text-sm text-fd-muted-foreground">
          Ready-made workspace packages. <code>cts add &lt;name&gt;</code>{" "}
          copies the code into your monorepo — you own it and implement on top,
          like shadcn for whole packages.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {registry.items.map((item) => (
          <div
            key={item.name}
            className="rounded-lg border border-fd-border bg-fd-card p-4 transition-colors hover:border-fd-primary/50"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-mono font-semibold text-fd-foreground">
                {item.title ?? item.name}
              </h2>
              <span className="rounded bg-fd-muted px-2 py-0.5 font-mono text-[11px] text-fd-muted-foreground">
                {item.build === "tsup" ? "compiled" : "source"}
              </span>
            </div>
            <p className="mt-1 text-sm text-fd-muted-foreground">
              {item.description}
            </p>
            {item.categories && item.categories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-fd-border px-2 py-0.5 font-mono text-[10px] text-fd-muted-foreground"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
            <code className="mt-3 block overflow-x-auto rounded bg-fd-muted px-3 py-2 font-mono text-xs text-fd-foreground">
              npx create-turbo-stack add {item.name}
            </code>
          </div>
        ))}
      </div>
    </main>
  );
}
