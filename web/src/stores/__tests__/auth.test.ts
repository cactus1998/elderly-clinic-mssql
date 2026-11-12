import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { api, ApiError, onUnauthorized, setAccessToken } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useClinicStore } from '@/stores/clinic'
import { usePatientsStore } from '@/stores/masterData'
import { makeClinicRow } from '@/__tests__/helpers'

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/client')>()
  return {
    ...actual, // keep the real ApiError so instanceof checks work
    api: { login: vi.fn(), me: vi.fn(), getVitals: vi.fn() },
    setAccessToken: vi.fn(),
    onUnauthorized: vi.fn(),
  }
})

const TOKEN_KEY = 'elderly-clinic.accessToken'
const user = { username: 'tester', displayName: '測試護理師' }
const tokenResponse = { tokenType: 'Bearer' as const, accessToken: 'token-abc', expiresIn: 3600, refreshToken: 'r' }

/** The handler the auth store registered with the api client for 401 responses. */
function unauthorizedHandler(): () => void {
  const handler = vi.mocked(onUnauthorized).mock.calls.at(-1)?.[0]
  if (!handler) throw new Error('auth store did not register an unauthorized handler')
  return handler
}

beforeEach(() => {
  vi.resetAllMocks()
  sessionStorage.clear()
  setActivePinia(createPinia())
})

describe('auth store：登入', () => {
  it('成功：保存 token、取得使用者並視為已登入', async () => {
    // Arrange
    vi.mocked(api.login).mockResolvedValue(tokenResponse)
    vi.mocked(api.me).mockResolvedValue(user)
    const auth = useAuthStore()

    // Act
    await auth.login('tester', 'pw')

    // Assert
    expect(api.login).toHaveBeenCalledWith({ username: 'tester', password: 'pw' })
    expect(setAccessToken).toHaveBeenLastCalledWith('token-abc')
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('token-abc')
    expect(auth.user).toEqual(user)
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.loggingIn).toBe(false)
  })

  it.each([
    [401, '帳號或密碼錯誤'],
    [429, '嘗試次數過多，請一分鐘後再試'],
  ])('API 回 %i 時顯示「%s」且不保存 token', async (status, expected) => {
    // Arrange
    vi.mocked(api.login).mockRejectedValue(new ApiError(status, { title: 'server message' }))
    const auth = useAuthStore()

    // Act
    await auth.login('tester', 'wrong')

    // Assert
    expect(auth.error).toBe(expected)
    expect(auth.isLoggedIn).toBe(false)
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(auth.loggingIn).toBe(false)
  })

  it('取得使用者失敗時不保留 token', async () => {
    vi.mocked(api.login).mockResolvedValue(tokenResponse)
    vi.mocked(api.me).mockRejectedValue(new Error('網路錯誤'))
    const auth = useAuthStore()

    await auth.login('tester', 'pw')

    expect(auth.token).toBeNull()
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(auth.error).toBe('網路錯誤')
  })
})

describe('auth store：還原登入', () => {
  it('沒有保存的 token 時不呼叫 API', async () => {
    const auth = useAuthStore()

    await auth.restore()

    expect(api.me).not.toHaveBeenCalled()
    expect(auth.isLoggedIn).toBe(false)
  })

  it('保存的 token 有效：還原使用者', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'saved-token')
    vi.mocked(api.me).mockResolvedValue(user)
    const auth = useAuthStore()

    await auth.restore()

    expect(setAccessToken).toHaveBeenCalledWith('saved-token')
    expect(auth.isLoggedIn).toBe(true)
  })

  it('保存的 token 失效：登出並刪除 token', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'old-token')
    vi.mocked(api.me).mockRejectedValue(new ApiError(401, null))
    const auth = useAuthStore()

    await auth.restore()

    expect(auth.isLoggedIn).toBe(false)
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('伺服器連不上時不登出：保留 token、顯示錯誤，之後可以再試', async () => {
    // Arrange
    sessionStorage.setItem(TOKEN_KEY, 'saved-token')
    vi.mocked(api.me).mockRejectedValueOnce(new ApiError(0, null)).mockResolvedValueOnce(user)
    const auth = useAuthStore()

    // Act
    await auth.restore()

    // Assert：還沒登入，但 token 還在
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.expired).toBe(false)
    expect(auth.error).toBe('無法連線到伺服器，請稍後再試')
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('saved-token')

    // Act：伺服器恢復後再呼叫一次
    await auth.restore()

    // Assert
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.error).toBe('')
  })

  it('同時呼叫多次只驗證一次', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'saved-token')
    vi.mocked(api.me).mockResolvedValue(user)
    const auth = useAuthStore()

    await Promise.all([auth.restore(), auth.restore()])

    expect(api.me).toHaveBeenCalledOnce()
  })
})

describe('auth store：登出與過期', () => {
  it('token 過期（401）：登出、標示過期，並清空其他畫面的資料', async () => {
    // Arrange
    vi.mocked(api.login).mockResolvedValue(tokenResponse)
    vi.mocked(api.me).mockResolvedValue(user)
    const auth = useAuthStore()
    await auth.login('tester', 'pw')
    const clinic = useClinicStore()
    clinic.list = [makeClinicRow()]
    const patients = usePatientsStore()
    patients.keyword = '測試'

    // Act
    unauthorizedHandler()()

    // Assert
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.expired).toBe(true)
    expect(auth.error).toBe('登入已過期，請重新登入')
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(clinic.list).toEqual([])
    expect(patients.keyword).toBe('')
  })

  it('使用者登出不標示過期', async () => {
    vi.mocked(api.login).mockResolvedValue(tokenResponse)
    vi.mocked(api.me).mockResolvedValue(user)
    const auth = useAuthStore()
    await auth.login('tester', 'pw')

    auth.logout()

    expect(auth.isLoggedIn).toBe(false)
    expect(auth.expired).toBe(false)
    expect(setAccessToken).toHaveBeenLastCalledWith(null)
  })
})
