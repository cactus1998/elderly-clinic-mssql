<script lang="ts">
// Shared by all dialogs: the last button / link the user pressed with a pointer.
let lastPointerControl: HTMLElement | null = null
if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const target = e.target instanceof Element ? e.target.closest('button, a[href], [tabindex]') : null
      lastPointerControl = target instanceof HTMLElement ? target : null
    },
    { capture: true },
  )
}
</script>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, useTemplateRef, watch } from 'vue'

const { open, title } = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
let returnFocus: HTMLElement | null = null

/**
 * The element that should get focus back when the dialog closes. Safari (and some mouse clicks)
 * do not focus a clicked button, so fall back to the last control the pointer pressed.
 */
function openerElement(): HTMLElement | null {
  const active = document.activeElement
  if (active instanceof HTMLElement && active !== document.body) return active
  return lastPointerControl
}

// Native <dialog> + showModal(): focus stays inside, Esc fires "cancel", background is inert.
watch(
  () => open,
  async (isOpen) => {
    await nextTick()
    const el = dialog.value
    if (!el) return
    if (isOpen && !el.open) {
      returnFocus = openerElement()
      el.showModal()
    } else if (!isOpen && el.open) {
      el.close()
    }
  },
  { immediate: true },
)

function onClose() {
  // Return focus to the button that opened the dialog. If it is gone (e.g. its row was deleted),
  // move focus to the main content instead of leaving it on <body>.
  if (returnFocus?.isConnected) returnFocus.focus()
  else document.querySelector<HTMLElement>('main[tabindex]')?.focus()
  returnFocus = null
  if (open) emit('close')
}

onBeforeUnmount(() => dialog.value?.open && dialog.value.close())
</script>

<template>
  <dialog
    ref="dialog"
    :aria-label="title"
    class="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border-0 p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/50"
    @cancel.prevent="emit('close')"
    @close="onClose"
  >
    <div class="flex items-start justify-between gap-4 px-6 pt-5">
      <h2 class="text-lg font-semibold text-slate-900">{{ title }}</h2>
      <button
        type="button"
        class="-mr-2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="關閉"
        @click="emit('close')"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" class="size-5" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
    <div class="px-6 pt-3 pb-5">
      <slot />
    </div>
  </dialog>
</template>
