import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginationBar from '@/components/PaginationBar.vue'

function render(props: { page: number; pageSize: number; totalCount: number }) {
  return mount(PaginationBar, { props })
}

/** Page buttons and gaps as the user sees them, e.g. ['1', '…', '8', '9']. */
function visiblePages(wrapper: ReturnType<typeof render>): string[] {
  return wrapper
    .findAll('li')
    .map((li) => li.text())
    .filter((text) => text !== '')
}

describe('PaginationBar', () => {
  it('沒有資料時不顯示', () => {
    const wrapper = render({ page: 1, pageSize: 20, totalCount: 0 })

    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('顯示總筆數與目前範圍', () => {
    const wrapper = render({ page: 3, pageSize: 20, totalCount: 45 })

    expect(wrapper.text()).toContain('共 45 筆，第 41–45 筆')
  })

  it('只有一頁時不顯示頁碼，仍可切換每頁筆數', () => {
    const wrapper = render({ page: 1, pageSize: 20, totalCount: 5 })

    expect(wrapper.find('button[aria-label="下一頁"]').exists()).toBe(false)
    expect(wrapper.find('select').exists()).toBe(true)
  })

  it('7 頁以內全部列出', () => {
    const wrapper = render({ page: 1, pageSize: 10, totalCount: 70 })

    expect(visiblePages(wrapper)).toEqual(['1', '2', '3', '4', '5', '6', '7'])
  })

  it.each([
    [1, ['1', '2', '3', '4', '5', '6', '…', '20']],
    [10, ['1', '…', '8', '9', '10', '11', '12', '…', '20']],
    [20, ['1', '…', '15', '16', '17', '18', '19', '20']],
  ])('頁數多時第 %i 頁前後用省略號', (page, expected) => {
    const wrapper = render({ page, pageSize: 10, totalCount: 200 })

    expect(visiblePages(wrapper)).toEqual(expected)
  })

  it('目前頁碼標示 aria-current', () => {
    const wrapper = render({ page: 2, pageSize: 20, totalCount: 45 })

    expect(wrapper.get('button[aria-current="page"]').text()).toBe('2')
  })

  it('第一頁停用上一頁，最後一頁停用下一頁', () => {
    const first = render({ page: 1, pageSize: 20, totalCount: 45 })
    const last = render({ page: 3, pageSize: 20, totalCount: 45 })

    expect(first.get('button[aria-label="上一頁"]').attributes('disabled')).toBeDefined()
    expect(first.get('button[aria-label="下一頁"]').attributes('disabled')).toBeUndefined()
    expect(last.get('button[aria-label="下一頁"]').attributes('disabled')).toBeDefined()
  })

  it('點頁碼、上一頁、下一頁送出新的頁碼', async () => {
    // Arrange
    const wrapper = render({ page: 2, pageSize: 20, totalCount: 100 })

    // Act
    await wrapper.get('button[aria-label="第 4 頁"]').trigger('click')
    await wrapper.get('button[aria-label="上一頁"]').trigger('click')
    await wrapper.get('button[aria-label="下一頁"]').trigger('click')

    // Assert
    expect(wrapper.emitted('update:page')).toEqual([[4], [1], [3]])
  })

  it('點目前頁碼不送出事件', async () => {
    const wrapper = render({ page: 2, pageSize: 20, totalCount: 100 })

    await wrapper.get('button[aria-label="第 2 頁"]').trigger('click')

    expect(wrapper.emitted('update:page')).toBeUndefined()
  })

  it('每頁筆數選項為 10 / 20 / 30 / 40 / 50 / 100，切換時送出數字', async () => {
    // Arrange
    const wrapper = render({ page: 1, pageSize: 20, totalCount: 100 })
    const select = wrapper.get('select')

    // Act
    await select.setValue('50')

    // Assert
    expect(select.findAll('option').map((o) => o.text())).toEqual(['10', '20', '30', '40', '50', '100'])
    expect(wrapper.emitted('update:pageSize')).toEqual([[50]])
  })
})
