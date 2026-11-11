import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CurrentUser } from '@api-types/clinic-api'
import { api, ApiError, onUnauthorized, setAccessToken } from '@/api/client'
import { useClinicStore } from '@/stores/clinic'

// sessionStorage: survives page refresh, cleared when the tab is closed.
// Only the access token is stored here, never patient data.
const TOKEN_KEY = 'elderly-clinic.accessToken'

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage unavailable (private mode): the token stays in memory only.
  }
}

function loginErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 401) return '帳號或密碼錯誤'
  if (e instanceof ApiError && e.status === 429) return '嘗試次數過多，請一分鐘後再試'
  return e instanceof Error ? e.message : String(e)
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(readToken())
  const user = ref<CurrentUser | null>(null)
  const checking = ref(false) // validating a stored token on startup
  const loggingIn = ref(false)
  const error = ref('')

  const isLoggedIn = computed(() => token.value !== null && user.value !== null)

  function applyToken(value: string | null) {
    token.value = value
    setAccessToken(value)
    writeToken(value)
  }

  async function login(username: string, password: string) {
    loggingIn.value = true
    error.value = ''
    try {
      const res = await api.login({ username, password })
      applyToken(res.accessToken)
      user.value = await api.me()
    } catch (e) {
      applyToken(null)
      error.value = loginErrorMessage(e)
    } finally {
      loggingIn.value = false
    }
  }

  /** Bearer tokens are stateless: logging out means discarding the token on the client. */
  function logout() {
    applyToken(null)
    user.value = null
    useClinicStore().reset()
  }

  /** On page load: if a token is stored, confirm it is still valid. */
  async function restore() {
    if (!token.value) return
    setAccessToken(token.value)
    checking.value = true
    try {
      user.value = await api.me()
    } catch {
      logout()
    } finally {
      checking.value = false
    }
  }

  onUnauthorized(() => {
    logout()
    error.value = '登入已過期，請重新登入'
  })

  return { token, user, checking, loggingIn, error, isLoggedIn, login, logout, restore }
})
