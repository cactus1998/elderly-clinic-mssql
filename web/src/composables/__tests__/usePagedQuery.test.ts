import { describe, it, expect, vi } from 'vitest'
import type { PagedResult } from '@api-types/clinic-api'
import { usePagedQuery } from '@/composables/usePagedQuery'
import { deferred, paged } from '@/__tests__/helpers'

type Filters = { keyword?: string }
type Fetcher = (params: Filters & { page: number; pageSize: number }) => Promise<PagedResult<string>>

function setup() {
  const fetcher = vi.fn<Fetcher>()
  return { fetcher, query: usePagedQuery(fetcher) }
}

describe('usePagedQuery', () => {
  it('查詢時送出條件、頁碼與每頁筆數，並寫入結果', async () => {
    // Arrange
    const { fetcher, query } = setup()
    fetcher.mockResolvedValue(paged(['a', 'b'], 42))
    query.page.value = 2

    // Act
    await query.load({ keyword: '王' })

    // Assert
    expect(fetcher).toHaveBeenCalledWith({ keyword: '王', page: 2, pageSize: 20 })
    expect(query.items.value).toEqual(['a', 'b'])
    expect(query.totalCount.value).toBe(42)
    expect(query.lastPage.value).toBe(3)
    expect(query.loaded.value).toBe(true)
    expect(query.loading.value).toBe(false)
  })

  it('查詢中 loading 為 true', async () => {
    const { fetcher, query } = setup()
    const response = deferred<PagedResult<string>>()
    fetcher.mockReturnValue(response.promise)

    const pending = query.load({})
    expect(query.loading.value).toBe(true)

    response.resolve(paged([]))
    await pending
    expect(query.loading.value).toBe(false)
  })

  it('失敗時清空資料並顯示錯誤', async () => {
    // Arrange
    const { fetcher, query } = setup()
    fetcher.mockResolvedValueOnce(paged(['a'], 1))
    await query.load({})
    fetcher.mockRejectedValueOnce(new Error('網路錯誤'))

    // Act
    await query.load({})

    // Assert
    expect(query.items.value).toEqual([])
    expect(query.totalCount.value).toBe(0)
    expect(query.error.value).toBe('網路錯誤')
    expect(query.loading.value).toBe(false)
  })

  it('較早的請求較晚回來時，不覆蓋較新的結果', async () => {
    // Arrange
    const { fetcher, query } = setup()
    const older = deferred<PagedResult<string>>()
    const newer = deferred<PagedResult<string>>()
    fetcher.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)

    // Act
    const first = query.load({ keyword: '舊' })
    const second = query.load({ keyword: '新' })
    newer.resolve(paged(['新結果'], 1))
    await second
    older.resolve(paged(['舊結果'], 1))
    await first

    // Assert
    expect(query.items.value).toEqual(['新結果'])
    expect(query.loading.value).toBe(false)
  })

  it('較早的請求較晚失敗時，不顯示它的錯誤', async () => {
    const { fetcher, query } = setup()
    const older = deferred<PagedResult<string>>()
    fetcher.mockReturnValueOnce(older.promise).mockResolvedValueOnce(paged(['新結果'], 1))

    const first = query.load({})
    await query.load({})
    older.reject(new Error('舊的錯誤'))
    await first

    expect(query.error.value).toBe('')
    expect(query.items.value).toEqual(['新結果'])
  })

  it('要求的頁碼超過最後一頁時，跳到最後一頁重新查詢', async () => {
    // Arrange：45 筆、每頁 20 筆，最後一頁是第 3 頁
    const { fetcher, query } = setup()
    query.page.value = 5
    fetcher.mockResolvedValueOnce(paged([], 45, 5)).mockResolvedValueOnce(paged(['第 3 頁'], 45, 3))

    // Act
    await query.load({})

    // Assert
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher).toHaveBeenLastCalledWith({ page: 3, pageSize: 20 })
    expect(query.page.value).toBe(3)
    expect(query.items.value).toEqual(['第 3 頁'])
  })

  it('完全沒有資料時停在第 1 頁，不重複查詢', async () => {
    const { fetcher, query } = setup()
    fetcher.mockResolvedValue(paged([], 0))

    await query.load({})

    expect(fetcher).toHaveBeenCalledOnce()
    expect(query.page.value).toBe(1)
    expect(query.lastPage.value).toBe(1)
  })

  it('reset 後，進行中的請求回來也不寫入', async () => {
    // Arrange
    const { fetcher, query } = setup()
    const response = deferred<PagedResult<string>>()
    fetcher.mockReturnValue(response.promise)
    query.page.value = 4
    query.pageSize.value = 50

    // Act
    const pending = query.load({})
    query.reset()
    response.resolve(paged(['登出前的資料'], 1))
    await pending

    // Assert
    expect(query.items.value).toEqual([])
    expect(query.page.value).toBe(1)
    expect(query.pageSize.value).toBe(20)
    expect(query.loaded.value).toBe(false)
    expect(query.loading.value).toBe(false)
  })
})
