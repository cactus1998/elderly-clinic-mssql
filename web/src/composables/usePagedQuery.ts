import { computed, ref, shallowRef } from 'vue'
import type { PagedResult } from '@api-types/clinic-api'
import type { PageParams } from '@/api/client'

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 20

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Server-side paging state shared by every list.
 * - Stale responses are dropped by request sequence number.
 * - If the requested page is beyond the last page (e.g. the last row on it was just
 *   deactivated), it jumps to the last page and fetches again.
 */
export function usePagedQuery<T, F extends object>(
  fetcher: (params: F & PageParams) => Promise<PagedResult<T>>,
) {
  const page = ref(1)
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const items = shallowRef<T[]>([])
  const totalCount = ref(0)
  const loading = ref(false)
  const error = ref('')
  const loaded = ref(false)
  let seq = 0

  const lastPage = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize.value)))

  async function load(filters: F): Promise<void> {
    const id = ++seq
    loading.value = true
    error.value = ''
    try {
      const result = await fetcher({ ...filters, page: page.value, pageSize: pageSize.value })
      if (id !== seq) return
      if (result.items.length === 0 && result.totalCount > 0 && page.value > 1) {
        page.value = Math.max(1, Math.ceil(result.totalCount / pageSize.value))
        return load(filters)
      }
      items.value = result.items
      totalCount.value = result.totalCount
      loaded.value = true
    } catch (e) {
      if (id !== seq) return
      items.value = []
      totalCount.value = 0
      error.value = message(e)
    } finally {
      if (id === seq) loading.value = false
    }
  }

  function reset() {
    seq++
    page.value = 1
    pageSize.value = DEFAULT_PAGE_SIZE
    items.value = []
    totalCount.value = 0
    loading.value = false
    error.value = ''
    loaded.value = false
  }

  return { page, pageSize, items, totalCount, loading, error, loaded, lastPage, load, reset }
}
