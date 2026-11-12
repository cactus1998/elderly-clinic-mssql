import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Department } from '@api-types/clinic-api'
import { api } from '@/api/client'
import { useDepartmentsStore, useDoctorsStore, usePatientsStore } from '@/stores/masterData'
import { paged } from '@/__tests__/helpers'

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return { ...actual, api: { listPatients: vi.fn(), listDoctors: vi.fn(), listDepartments: vi.fn() } }
})

const dept: Department = { deptId: 1, deptCode: 'FM', deptName: '家醫科', isActive: true, rowVersion: 'AAAA' }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.listPatients).mockResolvedValue(paged([]))
  vi.mocked(api.listDoctors).mockResolvedValue(paged([]))
  vi.mocked(api.listDepartments).mockResolvedValue(paged([dept]))
  setActivePinia(createPinia())
})

describe('patients store', () => {
  it('關鍵字去除前後空白後查詢', async () => {
    const patients = usePatientsStore()
    patients.keyword = '  測試  '

    await patients.load()

    expect(api.listPatients).toHaveBeenCalledWith({ keyword: '測試', includeInactive: false, page: 1, pageSize: 20 })
  })

  it('關鍵字只有空白時不送關鍵字', async () => {
    const patients = usePatientsStore()
    patients.keyword = '   '

    await patients.load()

    expect(api.listPatients).toHaveBeenCalledWith(expect.objectContaining({ keyword: undefined }))
  })

  it('重設時清空關鍵字與篩選', () => {
    const patients = usePatientsStore()
    patients.keyword = '測試'
    patients.includeInactive = true
    patients.page = 3

    patients.reset()

    expect(patients.keyword).toBe('')
    expect(patients.includeInactive).toBe(false)
    expect(patients.page).toBe(1)
  })
})

describe('doctors store', () => {
  it('依科別與是否含停用查詢', async () => {
    const doctors = useDoctorsStore()
    doctors.deptId = 2
    doctors.includeInactive = true

    await doctors.load()

    expect(api.listDoctors).toHaveBeenCalledWith({ deptId: 2, includeInactive: true, page: 1, pageSize: 20 })
  })
})

describe('departments store：下拉選單選項', () => {
  it('一次取回含停用的全部科別', async () => {
    const departments = useDepartmentsStore()

    await departments.loadOptions()

    expect(api.listDepartments).toHaveBeenCalledWith({ page: 1, pageSize: 100, includeInactive: true })
    expect(departments.options).toEqual([dept])
  })

  it('科別異動後清除選項，下次使用時重新載入', async () => {
    const departments = useDepartmentsStore()
    await departments.loadOptions()

    departments.departmentsChanged()

    expect(departments.options).toEqual([])
  })
})
