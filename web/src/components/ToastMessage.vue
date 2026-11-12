<script setup lang="ts">
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <!-- Always rendered so screen readers pick up changes (role="status" is aria-live="polite"). -->
  <div role="status" class="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
    <p
      v-if="ui.toast"
      class="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg"
    >
      <svg
        v-if="ui.toastKind === 'success'"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="size-4 shrink-0 text-emerald-400"
        aria-hidden="true"
      >
        <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.86a.75.75 0 0 0-1.22-.88l-3.24 4.5-1.6-1.6a.75.75 0 1 0-1.06 1.06l2.22 2.22a.75.75 0 0 0 1.14-.09l3.76-5.21Z" clip-rule="evenodd" />
      </svg>
      <svg v-else viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-rose-400" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
      </svg>
      {{ ui.toast }}
    </p>
  </div>
</template>
