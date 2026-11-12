import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQuery } from 'vue-router'
import { cleanQuery, queryKey, queryPage, queryPageSize } from '@/composables/routeQuery'

/** A Pinia list store (refs are unwrapped on the store object). */
interface ListState {
  page: number
  pageSize: number
  load: () => Promise<void>
}

/**
 * Keep a list page in sync with the URL query (page, pageSize + page-specific filters).
 * The URL is the source of truth: user actions update the URL, and URL changes load data,
 * so refresh / back / shared links all restore the same list.
 */
export function useListRoute<F extends Record<string, string | number | boolean | null | undefined>>(
  list: ListState,
  options: {
    /** Read page-specific filters from the URL into the store. */
    readFilters: (query: LocationQuery) => void
    /** Current page-specific filters, written back to the URL. */
    writeFilters: () => F
  },
) {
  const route = useRoute()
  const router = useRouter()
  // The watcher can fire once more with the next page's query while navigating away; ignore it.
  const routeName = route.name

  function currentQuery() {
    return cleanQuery({ ...options.writeFilters(), page: list.page, pageSize: list.pageSize })
  }

  // Set when the URL is corrected to match data already loaded, so that URL change does not load again.
  let correctedKey: string | null = null

  watch(
    () => route.query,
    (query) => {
      if (route.name !== routeName) return
      const skip = correctedKey !== null && queryKey(query) === correctedKey
      correctedKey = null
      if (skip) return
      options.readFilters(query)
      list.page = queryPage(query)
      list.pageSize = queryPageSize(query)
      list.load().then(() => {
        // The URL had an invalid value, or the page was out of range and the store jumped to
        // the last page: correct the URL without loading the same data again.
        const wanted = currentQuery()
        if (route.query === query && queryKey(wanted) !== queryKey(query)) {
          correctedKey = queryKey(wanted)
          router.replace({ query: wanted })
        }
      })
    },
    { immediate: true },
  )

  /** Apply a change (filters or page) by updating the URL; reload directly if the URL does not change. */
  function apply(changes: { page?: number; pageSize?: number } = {}) {
    if (changes.pageSize !== undefined) {
      list.pageSize = changes.pageSize
      list.page = 1
    }
    if (changes.page !== undefined) list.page = changes.page
    const next = currentQuery()
    if (queryKey(next) === queryKey(route.query)) list.load()
    else router.push({ query: next })
  }

  return { apply }
}
