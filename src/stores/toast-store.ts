import { create } from 'zustand'

export type ToastTone = 'success' | 'error' | 'info'

export type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

type ToastState = {
  toasts: ToastItem[]
  push: (message: string, tone?: ToastTone) => void
  dismiss: (id: number) => void
}

let seq = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = ++seq
    set((state) => ({
      toasts: [...state.toasts.slice(-3), { id, message, tone }],
    }))
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 3800)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export function toast(message: string, tone: ToastTone = 'success'): void {
  useToastStore.getState().push(message, tone)
}
