export function EmptyHint() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="max-w-sm rounded-md border border-dashed border-[var(--color-border)] px-4 py-3 text-center text-sm text-[var(--color-muted)]">
        <p className="font-medium text-[var(--color-ink)]">Start your diagram</p>
        <p className="mt-1.5 leading-relaxed">
          Double-click or use <span className="font-medium">Add</span> to place components. Drag
          between handles to connect. Export PNG or Spec anytime from the top bar.
        </p>
      </div>
    </div>
  )
}
