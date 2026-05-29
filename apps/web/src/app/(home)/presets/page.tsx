import type { Metadata } from "next";
import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";
import presetRegistry from "../../../../public/s/registry.json";
import { PresetGallery } from "./preset-gallery";

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

// Read straight from the generated preset registry — no fragile self-fetch.
const registry = presetRegistry as Registry;

export default function PresetsPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-6xl border-fd-border sm:border-x">
        <PageHeader eyebrow="// Presets" title="Presets">
          Ready-to-use stack configurations. Open in the builder to customize,
          or use directly with the CLI.
        </PageHeader>
        <div className="p-6 sm:p-8">
          <PresetGallery items={registry.items} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
