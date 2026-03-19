import type { Metadata } from "next";
import { PresetGallery } from "./preset-gallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Presets — create-turbo-stack",
  description:
    "Browse community presets for create-turbo-stack. Find the perfect starting point for your next Turborepo project.",
};

type RegistryItem = {
  name: string;
  title: string;
  description: string;
  type: string;
  tags: string[];
  preset: string;
};

type Registry = {
  items: RegistryItem[];
};

async function getRegistry(): Promise<Registry> {
  // In dev, read from public. In prod, fetch from origin.
  const baseURL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseURL}/s/registry.json`, {
    next: { revalidate: 60 },
    cache: "no-cache",
  });
  return res.json();
}

export default async function PresetsPage() {
  const registry = await getRegistry();

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold text-fd-foreground sm:text-3xl">
          Presets
        </h1>
        <p className="mt-2 font-mono text-sm text-fd-muted-foreground">
          Ready-to-use stack configurations. Open in the builder to customize,
          or use directly with the CLI.
        </p>
      </div>

      <PresetGallery items={registry.items} />
    </main>
  );
}
