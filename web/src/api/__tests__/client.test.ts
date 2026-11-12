import { describe, it, expect, vi, afterEach } from 'vitest'
import { api, ApiError, onUnauthorized, setAccessToken } from '@/api/client'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Stub fetch with one response and return the mock for assertions. */
function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sentRequest(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, headers: init.headers as Headers }
}

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (e) {
    if (e instanceof ApiError) return e
    throw e
  }
  throw new Error('expected the request to fail')
}

// client.ts keeps the token and the 401 handler at module level: reset after every test.
afterEach(() => {
  setAccessToken(null)
  onUnauthorized(() => {})
})

describe('api client：請求', () => {
  it('有 token 時帶 Authorization: Bearer', async () => {
    // Arrange
    const fetchMock = stubFetch(jsonResponse({ username: 'tester', displayName: '測試' }))
    setAccessToken('token-123')

    // Act
    await api.me()

    // Assert
    expect(sentRequest(fetchMock).headers.get('Authorization')).toBe('Bearer token-123')
  })

  it('沒有 token 時不帶 Authorization', async () => {
    const fetchMock = stubFetch(jsonResponse({ username: 'tester', displayName: '測試' }))

    await api.me()

    expect(sentRequest(fetchMock).headers.has('Authorization')).toBe(false)
  })

  it('有 body 時送 JSON 與 Content-Type', async () => {
    // Arrange
    const fetchMock = stubFetch(jsonResponse({ deptId: 1 }))

    // Act
    await api.setDepartmentStatus(5, false)

    // Assert
    const { url, init, headers } = sentRequest(fetchMock)
    expect(url).toBe('/api/departments/5/status')
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe('{"isActive":false}')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('查詢參數略過 undefined、null、空字串，保留 false', async () => {
    const fetchMock = stubFetch(jsonResponse({ items: [], totalCount: 0, page: 1, pageSize: 20 }))

    await api.listDoctors({ page: 2, pageSize: 50, deptId: null, includeInactive: false })

    expect(sentRequest(fetchMock).url).toBe('/api/doctors?page=2&pageSize=50&includeInactive=false')
  })

  it('病人關鍵字空白時不放進網址', async () => {
    const fetchMock = stubFetch(jsonResponse({ items: [], totalCount: 0, page: 1, pageSize: 20 }))

    await api.listPatients({ page: 1, pageSize: 20, keyword: '' })

    expect(sentRequest(fetchMock).url).toBe('/api/patients?page=1&pageSize=20')
  })

  it('204 回傳 undefined', async () => {
    stubFetch(new Response(null, { status: 204 }))

    await expect(api.deleteVital(9)).resolves.toBeUndefined()
  })
})

describe('api client：錯誤', () => {
  it('驗證錯誤：合併 errors 並去除重複訊息', async () => {
    // Arrange
    stubFetch(
      jsonResponse(
        { title: 'One or more validation errors occurred.', errors: { SystolicBP: ['收縮壓與舒張壓要一起填'], DiastolicBP: ['收縮壓與舒張壓要一起填'], Note: ['備註最多 200 字'] } },
        400,
      ),
    )

    // Act
    const error = await caught(api.createVital(1, {} as never))

    // Assert
    expect(error.status).toBe(400)
    expect(error.message).toBe('收縮壓與舒張壓要一起填；備註最多 200 字')
  })

  it('有 detail 時優先顯示 detail', async () => {
    stubFetch(jsonResponse({ title: 'Conflict', detail: '資料已被其他人修改，請重新整理' }, 409))

    const error = await caught(api.updateDepartment(1, {} as never))

    expect(error.message).toBe('資料已被其他人修改，請重新整理')
  })

  it('只有 title 時顯示 title', async () => {
    stubFetch(jsonResponse({ title: '找不到病人' }, 404))

    const error = await caught(api.getPatient(999))

    expect(error.message).toBe('找不到病人')
  })

  it('body 不是 JSON 時顯示 HTTP 狀態碼', async () => {
    stubFetch(new Response('Teapot', { status: 418 }))

    const error = await caught(api.me())

    expect(error.status).toBe(418)
    expect(error.problem).toBeNull()
    expect(error.message).toBe('HTTP 418')
  })

  it.each([502, 503, 504])('API 停止（proxy 回 %i）時顯示無法連線', async (status) => {
    stubFetch(new Response('Bad Gateway', { status }))

    const error = await caught(api.me())

    expect(error.status).toBe(status)
    expect(error.message).toBe('無法連線到伺服器，請稍後再試')
  })

  it('500 沒有說明時顯示一般錯誤訊息，不顯示技術細節', async () => {
    stubFetch(new Response(null, { status: 500 }))

    const error = await caught(api.me())

    expect(error.message).toBe('伺服器發生錯誤，請稍後再試')
  })

  it('網路中斷（fetch 失敗）時轉成 ApiError，狀態碼為 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await caught(api.me())

    expect(error.status).toBe(0)
    expect(error.message).toBe('無法連線到伺服器，請稍後再試')
  })

  it('已登入時收到 401：觸發登出處理', async () => {
    // Arrange
    stubFetch(new Response(null, { status: 401 }))
    const handler = vi.fn()
    onUnauthorized(handler)
    setAccessToken('expired-token')

    // Act
    const error = await caught(api.me())

    // Assert
    expect(handler).toHaveBeenCalledOnce()
    expect(error.message).toBe('登入已過期，請重新登入')
  })

  it('未登入時收到 401（登入失敗）：不觸發登出處理', async () => {
    stubFetch(jsonResponse({ title: '帳號或密碼錯誤' }, 401))
    const handler = vi.fn()
    onUnauthorized(handler)

    await caught(api.login({ username: 'tester', password: 'wrong' }))

    expect(handler).not.toHaveBeenCalled()
  })
})
