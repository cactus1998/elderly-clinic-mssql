import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '@/components/StatusBadge.vue'

describe('StatusBadge', () => {
  it.each([
    [true, '啟用'],
    [false, '停用'],
  ])('active=%s 時顯示文字「%s」（不只靠顏色）', (active, text) => {
    const wrapper = mount(StatusBadge, { props: { active } })

    expect(wrapper.text()).toBe(text)
  })
})
