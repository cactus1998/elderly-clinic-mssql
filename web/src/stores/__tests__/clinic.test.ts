import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ClinicListItem } from '@api-types/clinic-api'
import { api, ApiError } from '@/api/client'
import { useClinicStore } from '@/stores/clinic'
import { useVitalsStore } from '@/stores/vitals'
import { deferred, makeClinicRow, paged } from '@/__tests__/helpers'

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return { ...actual, api: { getClinicList: vi.fn(), checkIn: vi.fn(), getVitals: vi.fn() } }
})

beforeEach(() => {
  vi.resetAllMocks()
  // Only Date is faked so promises still resolve normally.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 11, 9, 0))
  vi.mocked(api.getVitals).mockResolvedValue(paged([]))
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('clinic store：查詢門診清單', () => {
  it('預設查詢今天（本地日期）', async () => {
    // Arrange
    vi.mocked(api.getClinicList).mockResolvedValue([makeClinicRow()])
    const clinic = useClinicStore()

    // Act
    await clinic.loadList()

    // Assert
    expect(api.getClinicList).toHaveBeenCalledWith('2026-11-11')
    expect(clinic.list).toHaveLength(1)
    expect(clinic.loaded).toBe(true)
    expect(clinic.loading).toBe(false)
  })

  it('重新查詢時清空目前選取的病人', async () => {
    vi.mocked(api.getClinicList).mockResolvedValue([makeClinicRow()])
    const clinic = useClinicStore()
    await clinic.loadList()
    clinic.selectPatient(clinic.list[0]!)

    await clinic.loadList()

    expect(clinic.selected).toBeNull()
    expect(useVitalsStore().patientId).toBeNull()
  })

  it('選取的科別在新結果中不存在時改回全部科別', async () => {
    vi.mocked(api.getClinicList).mockResolvedValue([makeClinicRow({ deptName: '家醫科' })])
    const clinic = useClinicStore()
    clinic.deptName = '心臟內科'

    await clinic.loadList()

    expect(clinic.deptName).toBe('')
  })

  it('依科別篩選清單', async () => {
    vi.mocked(api.getClinicList).mockResolvedValue([
      makeClinicRow({ appointmentId: 1, deptName: '家醫科' }),
      makeClinicRow({ appointmentId: 2, deptName: '心臟內科' }),
    ])
    const clinic = useClinicStore()
    await clinic.loadList()

    clinic.deptName = '心臟內科'

    expect(clinic.deptNames).toEqual(['家醫科', '心臟內科'])
    expect(clinic.filtered.map((r) => r.appointmentId)).toEqual([2])
  })

  it('較早的查詢較晚回來時，不覆蓋較新的結果', async () => {
    // Arrange
    const older = deferred<ClinicListItem[]>()
    vi.mocked(api.getClinicList)
      .mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce([makeClinicRow({ appointmentId: 2 })])
    const clinic = useClinicStore()

    // Act
    const first = clinic.loadList()
    await clinic.loadList()
    older.resolve([makeClinicRow({ appointmentId: 1 })])
    await first

    // Assert
    expect(clinic.list.map((r) => r.appointmentId)).toEqual([2])
  })

  it('查詢失敗時清單清空並顯示錯誤', async () => {
    vi.mocked(api.getClinicList).mockRejectedValue(new ApiError(400, { title: '日期格式錯誤' }))
    const clinic = useClinicStore()

    await clinic.loadList()

    expect(clinic.list).toEqual([])
    expect(clinic.error).toBe('日期格式錯誤')
    expect(clinic.loading).toBe(false)
  })
})

describe('clinic store：報到', () => {
  it('成功：該列狀態更新為已報到', async () => {
    // Arrange
    const row = makeClinicRow({ appointmentId: 7, status: 'BOOKED' })
    vi.mocked(api.checkIn).mockResolvedValue({ appointmentId: 7, status: 'CHECKED_IN' })
    const clinic = useClinicStore()

    // Act
    await clinic.checkIn(row)

    // Assert
    expect(api.checkIn).toHaveBeenCalledWith(7)
    expect(row.status).toBe('CHECKED_IN')
    expect(clinic.checkingIn).toBeNull()
  })

  it('409（已報到或已取消）：保留原狀態並顯示錯誤', async () => {
    const row = makeClinicRow({ status: 'BOOKED' })
    vi.mocked(api.checkIn).mockRejectedValue(new ApiError(409, { title: '只有已掛號的門診可以報到' }))
    const clinic = useClinicStore()

    await clinic.checkIn(row)

    expect(row.status).toBe('BOOKED')
    expect(clinic.error).toBe('只有已掛號的門診可以報到')
    expect(clinic.checkingIn).toBeNull()
  })

  it('報到中記錄正在處理的掛號，避免重複點擊', async () => {
    const response = deferred<{ appointmentId: number; status: 'CHECKED_IN' }>()
    vi.mocked(api.checkIn).mockReturnValue(response.promise)
    const clinic = useClinicStore()

    const pending = clinic.checkIn(makeClinicRow({ appointmentId: 3 }))
    expect(clinic.checkingIn).toBe(3)

    response.resolve({ appointmentId: 3, status: 'CHECKED_IN' })
    await pending
    expect(clinic.checkingIn).toBeNull()
  })
})

describe('clinic store：登出重設', () => {
  it('清空所有資料，回到今天', async () => {
    vi.mocked(api.getClinicList).mockResolvedValue([makeClinicRow()])
    const clinic = useClinicStore()
    clinic.date = '2026-01-01'
    await clinic.loadList()

    clinic.reset()

    expect(clinic.list).toEqual([])
    expect(clinic.loaded).toBe(false)
    expect(clinic.date).toBe('2026-11-11')
  })
})
