import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import AppDialog from '@/components/AppDialog.vue'

// jsdom may not implement modal dialogs; give it the minimum the component relies on.
beforeAll(() => {
  const proto = HTMLDialogElement.prototype
  if (!proto.showModal) {
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (!proto.close || !('open' in proto)) {
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
})

let wrapper: VueWrapper | undefined
afterEach(() => wrapper?.unmount())

/** A page with an opener button and the dialog, like the doctors / departments pages. */
function mountPage() {
  const open = ref(false)
  const Page = defineComponent({
    setup: () => () => [
      h('button', { id: 'opener', onClick: () => (open.value = true) }, '新增醫師'),
      h(AppDialog, { open: open.value, title: '新增醫師', onClose: () => (open.value = false) }, () =>
        h('input', { id: 'inside' }),
      ),
    ],
  })
  wrapper = mount(Page, { attachTo: document.body })
  return { open, opener: wrapper.get('#opener').element as HTMLButtonElement }
}

async function settle() {
  await nextTick()
  await nextTick()
}

describe('AppDialog：焦點', () => {
  it('用鍵盤開啟：關閉後焦點回到開啟的按鈕', async () => {
    // Arrange
    const { open, opener } = mountPage()
    opener.focus()

    // Act
    open.value = true
    await settle()
    open.value = false
    await settle()

    // Assert
    expect(document.activeElement).toBe(opener)
  })

  it('用滑鼠開啟但按鈕沒有取得焦點（Safari）：關閉後焦點仍回到該按鈕', async () => {
    // Arrange：只有 pointerdown，焦點留在 body
    const { open, opener } = mountPage()
    ;(document.activeElement as HTMLElement | null)?.blur()
    opener.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(document.activeElement).toBe(document.body)

    // Act
    open.value = true
    await settle()
    open.value = false
    await settle()

    // Assert
    expect(document.activeElement).toBe(opener)
  })

  it('開啟的按鈕已被移除（例如刪除該列）：焦點移到主要內容', async () => {
    // Arrange
    const main = document.createElement('main')
    main.tabIndex = -1
    document.body.appendChild(main)
    const { open, opener } = mountPage()
    opener.focus()
    open.value = true
    await settle()

    // Act
    opener.remove()
    open.value = false
    await settle()

    // Assert
    expect(document.activeElement).toBe(main)
    main.remove()
  })

  it('按 Esc（cancel 事件）送出 close', async () => {
    const { open } = mountPage()
    open.value = true
    await settle()

    wrapper!.get('dialog').trigger('cancel')

    expect(open.value).toBe(false)
  })

  it('右上角關閉按鈕有 aria-label', async () => {
    const { open } = mountPage()
    open.value = true
    await settle()

    expect(wrapper!.find('button[aria-label="關閉"]').exists()).toBe(true)
  })
})
