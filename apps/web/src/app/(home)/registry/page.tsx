import type { Metadata } from "next";
import { CopyButton } from "@/components/landing/copy-button";
import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";
import registryData from "../../../../public/r/registry.json";

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
  dependencies?: string[];
  categories?: string[];
};

type Registry = { name: string; items: RegistryItem[] };

// Read straight from the generated registry — no fragile self-fetch.
const registry = registryData as Registry;

const steps = [
  {
    n: "01",
    title: "Browse",
    body: "Public, open registry. Inspect every package's deps and build right here.",
  },
  {
    n: "02",
    title: "Add",
    body: "Run cts add <name>. The source is copied into your monorepo and wired up.",
  },
  {
    n: "03",
    title: "Own it",
    body: "It's your code now — edit freely, no black-box dependency. Like shadcn for packages.",
  },
];

export default function RegistryPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-6xl border-fd-border sm:border-x">
        <PageHeader eyebrow="// Registry" title="Registry">
          Ready-made workspace packages.{" "}
          <code className="text-fd-foreground">cts add &lt;name&gt;</code>{" "}
          copies the code into your monorepo — you own it and build on top, like
          shadcn for whole packages.
        </PageHeader>

        {/* How it works */}
        <div className="grid grid-cols-1 gap-px border-fd-border border-b bg-fd-border sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n} className="bg-fd-background p-5">
              <span className="font-bold font-mono text-2xl text-fd-primary tabular-nums">
                {step.n}
              </span>
              <h2 className="mt-2 font-mono font-semibold text-sm uppercase tracking-wide">
                {step.title}
              </h2>
              <p className="mt-1.5 text-fd-muted-foreground text-sm leading-relaxed">
                {step.body}
              </p>
            </div>
          ))}
        </div>

        {/* Packages */}
        <div className="border-fd-border border-b px-6 pt-8 pb-3">
          <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-[0.25em]">
            {registry.items.length} package
            {registry.items.length === 1 ? "" : "s"}
          </span>
        </div>

        {registry.items.length === 0 ? (
          <p className="px-6 py-12 text-center font-mono text-fd-muted-foreground text-sm">
            No packages published yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-px border-fd-border border-b bg-fd-border lg:grid-cols-2">
            {registry.items.map((item) => (
              <article
                key={item.name}
                className="flex flex-col bg-fd-background p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-mono font-semibold text-fd-foreground">
                      {item.title ?? item.name}
                    </h3>
                    <code className="font-mono text-[11px] text-fd-muted-foreground">
                      {item.name}
                    </code>
                  </div>
                  <span className="shrink-0 rounded-[2px] border border-fd-border bg-fd-secondary px-2 py-0.5 font-mono text-[10px] text-fd-muted-foreground uppercase tracking-wide">
                    {item.build === "tsup" ? "compiled" : "source"}
                  </span>
                </div>

                <p className="mt-2 flex-1 text-fd-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>

                {item.categories && item.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.categories.map((category) => (
                      <span
                        key={category}
                        className="rounded-[2px] border border-fd-primary/30 bg-fd-primary/10 px-2 py-0.5 font-mono text-[10px] text-fd-primary uppercase tracking-wide"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}

                {item.dependencies && item.dependencies.length > 0 && (
                  <div className="mt-3">
                    <span className="font-mono text-[10px] text-fd-muted-foreground uppercase tracking-wider">
                      Depends on
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.dependencies.map((dep) => (
                        <span
                          key={dep}
                          className="rounded-[2px] bg-fd-muted/25 px-1.5 py-0.5 font-mono text-[10px] text-fd-muted-foreground"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct grab — copy the command, no detour */}
                <div className="mt-4 flex items-center justify-between gap-2 rounded-[3px] border border-fd-border bg-fd-secondary px-3 py-2">
                  <code className="overflow-x-auto whitespace-nowrap font-mono text-fd-foreground text-xs">
                    <span className="text-fd-primary">$</span> cts add{" "}
                    {item.name}
                  </code>
                  <CopyButton
                    value={`npx create-turbo-stack add ${item.name}`}
                    label="Copy"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
