"use client";

import { BuilderProvider } from "@/components/builder/builder-provider";
import { BuilderShell } from "@/components/builder/builder-shell";

export default function BuilderPage() {
  return (
    <BuilderProvider>
      <BuilderShell />
    </BuilderProvider>
  );
}
