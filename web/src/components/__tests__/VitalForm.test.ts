import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { VitalSignInput } from '@api-types/clinic-api'
import VitalForm from '@/components/VitalForm.vue'
import { makeVital } from '@/__tests__/helpers'

/** Find an input the way a user would: by its visible label. */
function field(wrapper: VueWrapper, labelText: string) {
  const label = wrapper.findAll('label').find((l) => l.text().includes(labelText))
  if (!label) throw new Error(`label "${labelText}" not found`)
  return wrapper.get(`[id="${label.attributes('for')}"]`)
}

function submitted(wrapper: VueWrapper): VitalSignInput {
  const events = wrapper.emitted<[VitalSignInput]>('submit')
  if (!events?.[0]) throw new Error('form was not submitted')
  return events[0][0]
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 11, 9, 5))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('VitalForm：新增', () => {
  it('量測時間預設為現在（本地時間）', () => {
    const wrapper = mount(VitalForm)

    expect(wrapper.text()).toContain('新增量測')
    expect((field(wrapper, '量測時間').element as HTMLInputElement).value).toBe('2026-11-11T09:05')
  })

  it('送出時空白欄位為 null，數值轉成數字，時間補上秒數', async () => {
    // Arrange
    const wrapper = mount(VitalForm)
    await field(wrapper, '收縮壓').setValue('130')
    await field(wrapper, '舒張壓').setValue('85')
    await field(wrapper, '體重').setValue('62.5')

    // Act
    await wrapper.get('form').trigger('submit')

    // Assert
    expect(submitted(wrapper)).toEqual({
      measuredAt: '2026-11-11T09:05:00',
      systolicBP: 130,
      diastolicBP: 85,
      heartRate: null,
      bloodSugar: null,
      bodyWeight: 62.5,
      note: null,
    })
  })

  it('備註去除前後空白；只有空白時為 null', async () => {
    const wrapper = mount(VitalForm)

    await field(wrapper, '備註').setValue('  飯後量測  ')
    await wrapper.get('form').trigger('submit')
    expect(submitted(wrapper).note).toBe('飯後量測')

    await field(wrapper, '備註').setValue('   ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted<[VitalSignInput]>('submit')?.[1]?.[0].note).toBeNull()
  })

  it('數值欄位的範圍顯示在說明文字並設定 min / max', () => {
    const wrapper = mount(VitalForm)
    const bloodSugar = field(wrapper, '血糖')

    expect(bloodSugar.attributes('min')).toBe('20')
    expect(bloodSugar.attributes('max')).toBe('800')
    expect(wrapper.get(`[id="${bloodSugar.attributes('aria-describedby')}"]`).text()).toBe('20–800')
  })
})

describe('VitalForm：編輯', () => {
  it('帶入原本的值', () => {
    // Arrange
    const initial = makeVital({ measuredAt: '2026-11-10T16:30:00', systolicBP: 142, bloodSugar: 180, note: '頭暈' })

    // Act
    const wrapper = mount(VitalForm, { props: { initial } })

    // Assert
    expect(wrapper.text()).toContain('編輯量測')
    expect((field(wrapper, '量測時間').element as HTMLInputElement).value).toBe('2026-11-10T16:30')
    expect((field(wrapper, '收縮壓').element as HTMLInputElement).value).toBe('142')
    expect((field(wrapper, '體重').element as HTMLInputElement).value).toBe('')
    expect((field(wrapper, '備註').element as HTMLInputElement).value).toBe('頭暈')
  })

  it('清空原本有值的欄位後送出 null（不是 0）', async () => {
    const wrapper = mount(VitalForm, { props: { initial: makeVital({ heartRate: 72 }) } })

    await field(wrapper, '心跳').setValue('')
    await wrapper.get('form').trigger('submit')

    expect(submitted(wrapper).heartRate).toBeNull()
  })
})

describe('VitalForm：狀態與事件', () => {
  it('儲存中停用儲存按鈕', () => {
    const wrapper = mount(VitalForm, { props: { saving: true } })
    const button = wrapper.get('button[type="submit"]')

    expect(button.text()).toBe('儲存中…')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('有錯誤時以 role="alert" 顯示', () => {
    const wrapper = mount(VitalForm, { props: { error: '收縮壓與舒張壓要一起填' } })

    expect(wrapper.get('[role="alert"]').text()).toBe('收縮壓與舒張壓要一起填')
  })

  it('按取消送出 cancel，不送出表單', async () => {
    const wrapper = mount(VitalForm)

    await wrapper.findAll('button').find((b) => b.text() === '取消')!.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})
