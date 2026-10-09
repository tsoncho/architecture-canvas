export function EmptyHint() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="max-w-xs rounded-md border border-dashed border-[var(--color-border)] px-4 py-3 text-center text-sm text-[var(--color-muted)] dark:border-[var(--color-border-dark)]">
        Double-click to add a node, or use the toolbar. Connect handles to show data flow.
      </div>
    </div>
  )
}
