import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Builder", href: "/builder" },
      { label: "Presets", href: "/presets" },
      { label: "Registry", href: "/registry" },
      { label: "Docs", href: "/docs" },
    ],
  },
  {
    title: "Reference",
    links: [
      { label: "Getting started", href: "/docs/getting-started" },
      { label: "Wiring", href: "/docs/wiring" },
      { label: "Schema", href: "/docs/schema" },
      { label: "MCP server", href: "/docs/mcp" },
    ],
  },
  {
    title: "Endpoints",
    links: [
      { label: "preset.json", href: "/schema/preset.json" },
      { label: "registry.json", href: "/s/registry.json" },
      { label: "config.json", href: "/schema/config.json" },
      { label: "minimal.json", href: "/s/minimal.json" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-fd-border border-t">
      <div className="mx-auto max-w-6xl border-fd-border sm:border-x">
        <div className="grid grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <span className="size-2.5 bg-fd-primary" />
              <span className="font-mono font-semibold text-sm">
                create-turbo-stack
              </span>
            </div>
            <p className="mt-3 max-w-xs text-fd-muted-foreground text-sm leading-relaxed">
              The wiring engine for production Turborepo monorepos.
            </p>
            <code className="mt-4 inline-block rounded-[3px] border border-fd-border bg-fd-card px-3 py-1.5 font-mono text-xs">
              <span className="text-fd-primary">$</span> npx create-turbo-stack
            </code>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-[0.2em]">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="font-mono text-fd-foreground text-sm transition-colors hover:text-fd-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-fd-border border-t px-6 py-5 font-mono text-[11px] text-fd-muted-foreground uppercase tracking-wider sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 create-turbo-stack — MIT</span>
          <a
            href="https://github.com/yigityalim/create-turbo-stack"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-fd-primary"
          >
            github.com/yigityalim/create-turbo-stack ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
