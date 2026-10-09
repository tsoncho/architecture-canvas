import { useToastStore } from '@/stores/toast-store'
import { cn } from '@/lib/utils'

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => dismiss(item.id)}
          className={cn(
            'pointer-events-auto rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-left text-sm shadow-md transition',
            'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-border)]',
            item.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
            item.tone === 'error' && 'border-red-200 bg-red-50 text-red-800',
            item.tone === 'info' && 'border-sky-200 bg-sky-50 text-sky-900',
          )}
        >
          {item.message}
        </button>
      ))}
    </div>
  )
}
