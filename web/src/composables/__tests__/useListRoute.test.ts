import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h, reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useListRoute } from '@/composables/useListRoute'

/**
 * A fake list store with 45 rows. Like usePagedQuery, a page beyond the last page
 * jumps to the last page.
 */
function makeList(totalCount = 45) {
  const list = reactive({
    page: 1,
    pageSize: 20,
    deptId: null as number | null,
    load: vi.fn(async () => {
      const last = Math.max(1, Math.ceil(totalCount / list.pageSize))
      if (list.page > last) list.page = last
    }),
  })
  return list
}

async function setup(url: string) {
  const list = makeList()
  let apply!: ReturnType<typeof useListRoute>['apply']
  const ListPage = defineComponent({
    setup() {
      ;({ apply } = useListRoute(list, {
        readFilters: (q) => (list.deptId = typeof q.deptId === 'string' ? Number(q.deptId) : null),
        writeFilters: () => ({ deptId: list.deptId }),
      }))
      return () => h('div')
    },
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/list', name: 'list', component: ListPage },
      { path: '/other', name: 'other', component: { render: () => h('div') } },
    ],
  })
  await router.push(url)
  await router.isReady()
  mount({ render: () => h(ListPage) }, { global: { plugins: [router] } })
  await flushPromises()
  return { list, router, apply: (...args: Parameters<typeof apply>) => apply(...args) }
}

describe('useListRoute', () => {
  it('依網址讀取頁碼、每頁筆數與篩選後查詢一次', async () => {
    const { list } = await setup('/list?page=2&pageSize=10&deptId=3')

    expect(list.load).toHaveBeenCalledOnce()
    expect(list.page).toBe(2)
    expect(list.pageSize).toBe(10)
    expect(list.deptId).toBe(3)
  })

  it('網址寫了預設值（page=1、pageSize=20）時只查詢一次，網址不改寫', async () => {
    const { list, router } = await setup('/list?page=1&pageSize=20')

    expect(list.load).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.fullPath).toBe('/list?page=1&pageSize=20')
  })

  it('頁碼超過最後一頁：網址改成最後一頁，且不重複查詢', async () => {
    // Arrange & Act：45 筆、每頁 20 筆，最後一頁是第 3 頁
    const { list, router } = await setup('/list?page=99')

    // Assert
    expect(router.currentRoute.value.fullPath).toBe('/list?page=3')
    expect(list.page).toBe(3)
    expect(list.load).toHaveBeenCalledOnce()
  })

  it('網址參數不合法時改回預設網址，且不重複查詢', async () => {
    const { list, router } = await setup('/list?page=abc&pageSize=25')

    expect(router.currentRoute.value.fullPath).toBe('/list')
    expect(list.load).toHaveBeenCalledOnce()
  })

  it('換頁時更新網址並查詢一次', async () => {
    // Arrange
    const { list, router, apply } = await setup('/list')

    // Act
    apply({ page: 2 })
    await flushPromises()

    // Assert
    expect(router.currentRoute.value.fullPath).toBe('/list?page=2')
    expect(list.load).toHaveBeenCalledTimes(2)
  })

  it('換每頁筆數時回到第 1 頁', async () => {
    const { list, router, apply } = await setup('/list?page=2')

    apply({ pageSize: 50 })
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/list?pageSize=50')
    expect(list.page).toBe(1)
  })

  it('條件沒變（例如再按一次查詢）時網址不變，直接重新查詢', async () => {
    const { list, router, apply } = await setup('/list?page=2')

    apply()
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/list?page=2')
    expect(list.load).toHaveBeenCalledTimes(2)
  })

  it('瀏覽器上一頁回到原本的頁碼並查詢', async () => {
    const { list, router, apply } = await setup('/list')
    apply({ page: 2 })
    await flushPromises()

    router.back()
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/list'))

    expect(list.page).toBe(1)
    expect(list.load).toHaveBeenCalledTimes(3)
  })

  it('離開頁面時不再依新網址查詢', async () => {
    const { list, router } = await setup('/list')

    await router.push('/other?page=5')
    await flushPromises()

    expect(list.load).toHaveBeenCalledOnce()
  })
})
