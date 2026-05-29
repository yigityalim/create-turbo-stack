/**
 * Brutalist page header shared by the framed sub-pages (presets, registry).
 * Mirrors the home page's SectionHeader: mono eyebrow, bold display title,
 * sitting on a structural bottom rule inside the bordered column.
 */
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-fd-border border-b px-6 pt-12 pb-8">
      <span className="font-mono text-[11px] text-fd-muted-foreground uppercase tracking-[0.3em]">
        {eyebrow}
      </span>
      <h1 className="mt-4 font-bold text-3xl tracking-tight sm:text-4xl">
        {title}
      </h1>
      {children && (
        <p className="mt-3 max-w-2xl text-fd-muted-foreground leading-relaxed">
          {children}
        </p>
      )}
    </div>
  );
}
