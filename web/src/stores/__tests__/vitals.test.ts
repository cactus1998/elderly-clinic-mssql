import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { VitalSignInput } from '@api-types/clinic-api'
import { api, ApiError } from '@/api/client'
import { useVitalsStore } from '@/stores/vitals'
import { makeVital, paged } from '@/__tests__/helpers'

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return {
    ...actual,
    api: { getVitals: vi.fn(), createVital: vi.fn(), updateVital: vi.fn(), deleteVital: vi.fn() },
  }
})

const input: VitalSignInput = {
  measuredAt: '2026-11-11T09:00:00',
  systolicBP: 130,
  diastolicBP: 85,
  heartRate: null,
  bloodSugar: null,
  bodyWeight: null,
  note: null,
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.getVitals).mockResolvedValue(paged([makeVital()], 1))
  setActivePinia(createPinia())
})

describe('vitals store', () => {
  it('開啟病人時從第 1 頁查最近 14 天', async () => {
    // Arrange
    const vitals = useVitalsStore()
    vitals.page = 3

    // Act
    await vitals.open(42)

    // Assert
    expect(api.getVitals).toHaveBeenCalledWith(42, 14, { page: 1, pageSize: 20 })
    expect(vitals.items).toHaveLength(1)
  })

  it('切換期間與每頁筆數時回到第 1 頁', async () => {
    const vitals = useVitalsStore()
    await vitals.open(42)
    vitals.page = 2

    await vitals.setDays(30)
    expect(api.getVitals).toHaveBeenLastCalledWith(42, 30, { page: 1, pageSize: 20 })

    vitals.page = 2
    await vitals.setPageSize(50)
    expect(api.getVitals).toHaveBeenLastCalledWith(42, 30, { page: 1, pageSize: 50 })
  })

  it('沒有選病人時不查詢也不儲存', async () => {
    const vitals = useVitalsStore()

    await vitals.load()
    const saved = await vitals.save(input)

    expect(api.getVitals).not.toHaveBeenCalled()
    expect(saved).toBe(false)
  })

  it('新增成功：回到第 1 頁重新查詢（新資料在最前面）', async () => {
    // Arrange
    vi.mocked(api.createVital).mockResolvedValue(makeVital({ vitalId: 2 }))
    const vitals = useVitalsStore()
    await vitals.open(42)
    vitals.page = 3

    // Act
    const saved = await vitals.save(input)

    // Assert
    expect(saved).toBe(true)
    expect(api.createVital).toHaveBeenCalledWith(42, input)
    expect(api.getVitals).toHaveBeenLastCalledWith(42, 14, { page: 1, pageSize: 20 })
  })

  it('修改成功：停在原本的頁面', async () => {
    vi.mocked(api.updateVital).mockResolvedValue(makeVital({ vitalId: 5 }))
    const vitals = useVitalsStore()
    await vitals.open(42)
    vitals.page = 2

    await vitals.save(input, 5)

    expect(api.updateVital).toHaveBeenCalledWith(5, input)
    expect(api.getVitals).toHaveBeenLastCalledWith(42, 14, { page: 2, pageSize: 20 })
  })

  it('儲存失敗：回傳 false 並顯示錯誤', async () => {
    vi.mocked(api.createVital).mockRejectedValue(new ApiError(400, { errors: { BloodSugar: ['血糖需介於 20 到 800'] } }))
    const vitals = useVitalsStore()
    await vitals.open(42)

    const saved = await vitals.save(input)

    expect(saved).toBe(false)
    expect(vitals.saveError).toBe('血糖需介於 20 到 800')
    expect(vitals.saving).toBe(false)
  })

  it('刪除失敗（404）：顯示錯誤', async () => {
    vi.mocked(api.deleteVital).mockRejectedValue(new ApiError(404, { title: '找不到這筆量測' }))
    const vitals = useVitalsStore()
    await vitals.open(42)

    const removed = await vitals.remove(1)

    expect(removed).toBe(false)
    expect(vitals.error).toBe('找不到這筆量測')
    expect(vitals.deletingId).toBeNull()
  })
})
