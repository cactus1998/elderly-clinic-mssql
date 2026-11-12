<script setup lang="ts">
import { computed } from 'vue'
import { PAGE_SIZE_OPTIONS } from '@/composables/usePagedQuery'

/**
 * Pagination for a card footer: summary on one side, page buttons and page size on the other.
 * Renders nothing when there are no rows. Pass layout classes from the parent, e.g. class="card-footer mt-auto".
 */
const { page, pageSize, totalCount } = defineProps<{
  page: number
  pageSize: number
  totalCount: number
}>()

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [size: number]
}>()

const lastPage = computed(() => Math.max(1, Math.ceil(totalCount / pageSize)))

/** At most 5 page numbers around the current page, with first/last and "…" gaps. */
const pages = computed<(number | '…')[]>(() => {
  const last = lastPage.value
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const start = Math.max(2, Math.min(page - 2, last - 5))
  const end = Math.min(last - 1, start + 4)
  const list: (number | '…')[] = [1]
  if (start > 2) list.push('…')
  for (let p = start; p <= end; p++) list.push(p)
  if (end < last - 1) list.push('…')
  list.push(last)
  return list
})

const range = computed(() => {
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)
  return `第 ${from.toLocaleString()}–${to.toLocaleString()} 筆`
})

function go(p: number) {
  if (p >= 1 && p <= lastPage.value && p !== page) emit('update:page', p)
}

const pageBtn =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40'
</script>

<template>
  <nav
    v-if="totalCount > 0"
    aria-label="分頁"
    class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-slate-600"
  >
    <p class="tabular-nums">共 {{ totalCount.toLocaleString() }} 筆，{{ range }}</p>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <ul v-if="lastPage > 1" class="flex items-center gap-1">
        <li>
          <button
            type="button"
            :class="[pageBtn, 'border-slate-300 bg-white hover:bg-slate-50']"
            :disabled="page <= 1"
            aria-label="上一頁"
            @click="go(page - 1)"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" class="size-4" aria-hidden="true">
              <path fill-rule="evenodd" d="M12.8 4.2a.75.75 0 0 1 0 1.06L8.06 10l4.74 4.74a.75.75 0 1 1-1.06 1.06l-5.27-5.27a.75.75 0 0 1 0-1.06l5.27-5.27a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
            </svg>
          </button>
        </li>
        <li v-for="(p, i) in pages" :key="`${p}-${i}`">
          <span v-if="p === '…'" class="inline-flex h-8 min-w-6 items-center justify-center text-slate-400" aria-hidden="true">…</span>
          <button
            v-else
            type="button"
            :class="[
              pageBtn,
              p === page
                ? 'border-sky-700 bg-sky-700 font-medium text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
            ]"
            :aria-label="`第 ${p} 頁`"
            :aria-current="p === page ? 'page' : undefined"
            @click="go(p)"
          >
            {{ p }}
          </button>
        </li>
        <li>
          <button
            type="button"
            :class="[pageBtn, 'border-slate-300 bg-white hover:bg-slate-50']"
            :disabled="page >= lastPage"
            aria-label="下一頁"
            @click="go(page + 1)"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" class="size-4" aria-hidden="true">
              <path fill-rule="evenodd" d="M7.2 15.8a.75.75 0 0 1 0-1.06L11.94 10 7.2 5.26A.75.75 0 1 1 8.26 4.2l5.27 5.27a.75.75 0 0 1 0 1.06l-5.27 5.27a.75.75 0 0 1-1.06 0Z" clip-rule="evenodd" />
            </svg>
          </button>
        </li>
      </ul>

      <label class="flex items-center gap-2">
        每頁
        <select
          :value="pageSize"
          class="form-control h-8 w-auto pr-8"
          @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="s in PAGE_SIZE_OPTIONS" :key="s" :value="s">{{ s }}</option>
        </select>
        筆
      </label>
    </div>
  </nav>
</template>
