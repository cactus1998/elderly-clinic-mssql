import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ToastKind = 'success' | 'error'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  /** Red confirm button for destructive actions. */
  danger?: boolean
}

/** App-wide toast and confirm dialog (rendered once in AppLayout). */
export const useUiStore = defineStore('ui', () => {
  // ---- Toast ----
  const toast = ref('')
  const toastKind = ref<ToastKind>('success')
  let toastTimer: ReturnType<typeof setTimeout> | undefined

  /** Short feedback after an action. Use 'error' when the action failed. */
  function showToast(text: string, kind: ToastKind = 'success') {
    toast.value = text
    toastKind.value = kind
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast.value = ''), 3000)
  }

  // ---- Confirm dialog ----
  const confirmState = ref<ConfirmOptions | null>(null)
  let resolver: ((ok: boolean) => void) | null = null

  /** Resolves true when the user confirms, false on cancel / Esc. */
  function confirm(options: ConfirmOptions): Promise<boolean> {
    resolver?.(false)
    confirmState.value = options
    return new Promise((resolve) => (resolver = resolve))
  }

  function closeConfirm(ok: boolean) {
    confirmState.value = null
    resolver?.(ok)
    resolver = null
  }

  return { toast, toastKind, showToast, confirmState, confirm, closeConfirm }
})
