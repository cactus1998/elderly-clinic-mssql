import { describe, it, expect } from 'vitest'
import {
  cleanQuery,
  queryBool,
  queryInt,
  queryKey,
  queryPage,
  queryPageSize,
  safeRedirect,
} from '@/composables/routeQuery'

describe('safeRedirect', () => {
  it('站內路徑原樣保留（含 query）', () => {
    // Arrange
    const target = '/patients?page=2'

    // Act
    const result = safeRedirect(target)

    // Assert
    expect(result).toBe('/patients?page=2')
  })

  it('參數重複時取第一個', () => {
    expect(safeRedirect(['/doctors', '/departments'])).toBe('/doctors')
  })

  it.each([
    ['其他網站', 'https://evil.example'],
    ['協定相對網址', '//evil.example'],
    ['反斜線', '/\\evil.example'],
    ['相對路徑', 'patients'],
    ['登入頁本身', '/login'],
    ['登入頁帶參數', '/login?redirect=/clinic'],
    ['空字串', ''],
    ['未提供', undefined],
    ['null', null],
  ])('%s 一律導回門診作業', (_label, target) => {
    expect(safeRedirect(target)).toBe('/clinic')
  })
})

describe('queryInt', () => {
  it('正整數字串轉成數字', () => {
    expect(queryInt({ deptId: '3' }, 'deptId', null)).toBe(3)
  })

  it.each([['abc'], ['0'], ['-1'], ['1.5'], [''], ['9007199254740993']])('非法值 %s 回傳預設值', (value) => {
    expect(queryInt({ deptId: value }, 'deptId', null)).toBeNull()
  })

  it('沒有這個參數時回傳預設值', () => {
    expect(queryInt({}, 'deptId', 7)).toBe(7)
  })
})

describe('queryPage', () => {
  it('合法頁碼', () => {
    expect(queryPage({ page: '4' })).toBe(4)
  })

  it.each([['0'], ['abc'], [undefined]])('非法或未提供（%s）時為第 1 頁', (value) => {
    expect(queryPage(value === undefined ? {} : { page: value })).toBe(1)
  })
})

describe('queryPageSize', () => {
  it.each([['10', 10], ['30', 30], ['100', 100]])('畫面提供的選項 %s 照用', (value, expected) => {
    expect(queryPageSize({ pageSize: value })).toBe(expected)
  })

  it.each([['25'], ['1000'], ['abc'], ['0']])('不在選項內的 %s 回到預設 20', (value) => {
    expect(queryPageSize({ pageSize: value })).toBe(20)
  })
})

describe('queryBool', () => {
  it('只有字串 true 視為 true', () => {
    expect(queryBool({ includeInactive: 'true' }, 'includeInactive')).toBe(true)
    expect(queryBool({ includeInactive: '1' }, 'includeInactive')).toBe(false)
    expect(queryBool({}, 'includeInactive')).toBe(false)
  })
})

describe('cleanQuery', () => {
  it('移除預設值與空值，讓網址保持簡短', () => {
    // Arrange
    const query = { page: 1, pageSize: 20, includeInactive: false, deptId: null, keyword: '', extra: undefined }

    // Act
    const result = cleanQuery(query)

    // Assert
    expect(result).toEqual({})
  })

  it('非預設值轉成字串保留', () => {
    expect(cleanQuery({ page: 3, pageSize: 50, includeInactive: true, deptId: 2 })).toEqual({
      page: '3',
      pageSize: '50',
      includeInactive: 'true',
      deptId: '2',
    })
  })
})

describe('queryKey', () => {
  it('順序不同、預設值有無不影響比較結果', () => {
    // Arrange
    const fromUrl = { deptId: '2', page: '1' }
    const fromState = { page: 1, pageSize: 20, deptId: 2 }

    // Act & Assert
    expect(queryKey(fromUrl)).toBe(queryKey(fromState))
  })

  it('網址上的預設值（字串）視同沒有寫', () => {
    expect(queryKey({ page: '1', pageSize: '20', includeInactive: 'false' })).toBe(queryKey({}))
  })

  it('實際條件不同時結果不同', () => {
    expect(queryKey({ page: '2' })).not.toBe(queryKey({ page: '3' }))
  })
})
