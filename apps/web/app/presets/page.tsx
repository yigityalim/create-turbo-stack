// TODO: Phase 4 — Community preset gallery
// - Grid of preset cards (name, description, author, tags)
// - Click to view preset details + file tree preview
// - "Use this preset" button → copy npx command
// See SDD Section 9 for registry system design.

export default function PresetsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24">
      <h1 className="text-3xl font-bold">Community Presets</h1>
      <p className="text-muted-foreground">
        Browse and share stack configurations. Coming soon.
      </p>
    </div>
  );
}
