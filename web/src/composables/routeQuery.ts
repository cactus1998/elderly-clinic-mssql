import type { LocationQuery } from 'vue-router'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/composables/usePagedQuery'

function first(v: LocationQuery[string] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s ?? undefined
}

/** Positive integer from the URL query; anything else (abc, 0, -1, 1.5) falls back to the default. */
export function queryInt(query: LocationQuery, key: string, fallback: number | null): number | null {
  const s = first(query[key])
  if (s === undefined || !/^\d+$/.test(s)) return fallback
  const n = Number(s)
  return n >= 1 && Number.isSafeInteger(n) ? n : fallback
}

export function queryPage(query: LocationQuery): number {
  return queryInt(query, 'page', 1) ?? 1
}

/** Only the sizes offered in the UI are accepted. */
export function queryPageSize(query: LocationQuery): number {
  const n = queryInt(query, 'pageSize', DEFAULT_PAGE_SIZE)
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n ?? 0) ? n! : DEFAULT_PAGE_SIZE
}

export function queryBool(query: LocationQuery, key: string): boolean {
  return first(query[key]) === 'true'
}

/** Drop default values so URLs stay short (page=1, pageSize=20, false flags). */
export function cleanQuery(q: Record<string, string | number | boolean | null | undefined>) {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === false || v === '') continue
    if (k === 'page' && v === 1) continue
    if (k === 'pageSize' && v === DEFAULT_PAGE_SIZE) continue
    out[k] = String(v)
  }
  return out
}

/** Comparable form of a query (defaults dropped, keys sorted) to detect real URL changes. */
export function queryKey(q: LocationQuery | Record<string, string | number | boolean | null | undefined>): string {
  const flat: Record<string, string | number | boolean | null | undefined> = {}
  for (const [k, v] of Object.entries(q)) flat[k] = Array.isArray(v) ? (v[0] ?? undefined) : v
  const clean = cleanQuery(flat)
  return JSON.stringify(Object.keys(clean).sort().map((k) => [k, clean[k]]))
}

/** Only same-site paths are allowed after login (prevents open redirect to another site). */
export function safeRedirect(v: LocationQuery[string] | undefined): string {
  const s = first(v)
  if (!s || !s.startsWith('/') || s.startsWith('//') || s.includes('\\') || s.startsWith('/login')) {
    return '/clinic'
  }
  return s
}
