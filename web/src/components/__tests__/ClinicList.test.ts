import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { api } from '@/api/client'
import ClinicList from '@/components/ClinicList.vue'
import { makeClinicRow, paged } from '@/__tests__/helpers'

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return { ...actual, api: { getClinicList: vi.fn(), checkIn: vi.fn(), getVitals: vi.fn() } }
})

let wrapper: VueWrapper | undefined

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.getVitals).mockResolvedValue(paged([]))
  setActivePinia(createPinia())
})

afterEach(() => wrapper?.unmount())

async function mountList() {
  wrapper = mount(ClinicList, {
    attachTo: document.body,
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
  await flushPromises()
  return wrapper
}

describe('ClinicList：報到', () => {
  it('報到成功後按鈕消失，焦點移到同一列的病人姓名', async () => {
    // Arrange
    vi.mocked(api.getClinicList).mockResolvedValue([
      makeClinicRow({ appointmentId: 5, patientName: '測試病人', status: 'BOOKED' }),
    ])
    vi.mocked(api.checkIn).mockResolvedValue({ appointmentId: 5, status: 'CHECKED_IN' })
    const w = await mountList()
    const button = w.findAll('button').find((b) => b.text() === '報到')!
    ;(button.element as HTMLElement).focus()

    // Act
    await button.trigger('click')
    await flushPromises()

    // Assert
    expect(w.findAll('button').some((b) => b.text() === '報到')).toBe(false)
    expect(document.activeElement?.textContent?.trim()).toBe('測試病人')
  })

  it('報到失敗時按鈕保留，焦點不移動', async () => {
    vi.mocked(api.getClinicList).mockResolvedValue([makeClinicRow({ appointmentId: 5, status: 'BOOKED' })])
    vi.mocked(api.checkIn).mockRejectedValue(new Error('無法連線到伺服器，請稍後再試'))
    const w = await mountList()
    const button = w.findAll('button').find((b) => b.text() === '報到')!
    ;(button.element as HTMLElement).focus()

    await button.trigger('click')
    await flushPromises()

    expect(document.activeElement).toBe(button.element)
    expect(w.get('[role="alert"]').text()).toBe('無法連線到伺服器，請稍後再試')
  })

  it('沒有門診的日期顯示引導與前往病人連結', async () => {
    vi.mocked(api.getClinicList).mockResolvedValue([])

    const w = await mountList()

    expect(w.text()).toContain('這一天沒有門診')
    expect(w.text()).toContain('前往病人')
  })
})
