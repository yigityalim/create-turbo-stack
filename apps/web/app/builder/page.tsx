// TODO: Phase 4 — Interactive stack builder
// - Config panel (left): select package manager, database, API, auth, CSS, apps, packages
// - Preview panel (right): live file tree + file content preview
// - Export bar (bottom): copy npx command, download preset JSON, share URL
// See SDD Section 8.3 for full builder architecture.

export default function BuilderPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24">
      <h1 className="text-3xl font-bold">Stack Builder</h1>
      <p className="text-muted-foreground">
        Visual stack configurator with live file tree preview. Coming soon.
      </p>
    </div>
  );
}
