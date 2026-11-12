import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '@/stores/ui'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('ui store：toast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('預設為成功提示，3 秒後自動消失', () => {
    // Arrange
    const ui = useUiStore()

    // Act
    ui.showToast('已儲存')

    // Assert
    expect(ui.toast).toBe('已儲存')
    expect(ui.toastKind).toBe('success')
    vi.advanceTimersByTime(3000)
    expect(ui.toast).toBe('')
  })

  it('錯誤提示使用 error 類型', () => {
    const ui = useUiStore()

    ui.showToast('儲存失敗', 'error')

    expect(ui.toastKind).toBe('error')
  })

  it('連續提示時以最後一則重新計時', () => {
    const ui = useUiStore()

    ui.showToast('第一則')
    vi.advanceTimersByTime(2000)
    ui.showToast('第二則')
    vi.advanceTimersByTime(2000)

    expect(ui.toast).toBe('第二則')
  })
})

describe('ui store：確認對話框', () => {
  it('按確定回傳 true 並關閉', async () => {
    // Arrange
    const ui = useUiStore()
    const result = ui.confirm({ title: '停用病人', message: '確定要停用？', danger: true })

    // Act
    ui.closeConfirm(true)

    // Assert
    await expect(result).resolves.toBe(true)
    expect(ui.confirmState).toBeNull()
  })

  it('按取消回傳 false', async () => {
    const ui = useUiStore()
    const result = ui.confirm({ title: '停用', message: '確定？' })

    ui.closeConfirm(false)

    await expect(result).resolves.toBe(false)
  })

  it('前一個對話框還沒回答就開新的：前一個視為取消', async () => {
    const ui = useUiStore()
    const first = ui.confirm({ title: '第一個', message: '…' })

    const second = ui.confirm({ title: '第二個', message: '…' })
    ui.closeConfirm(true)

    await expect(first).resolves.toBe(false)
    await expect(second).resolves.toBe(true)
  })
})
