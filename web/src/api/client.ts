import type {
  AccessTokenResponse,
  CheckInResult,
  ClinicListItem,
  CurrentUser,
  LoginRequest,
  ProblemDetails,
  VitalSign,
  VitalSignInput,
} from '@api-types/clinic-api'

/** Error thrown when the API returns a non-2xx response. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public problem: ProblemDetails | null,
  ) {
    super(ApiError.describe(status, problem))
  }

  private static describe(status: number, p: ProblemDetails | null): string {
    // One rule can report the same message under several fields; show it once.
    if (p?.errors) return [...new Set(Object.values(p.errors).flat())].join('；')
    if (p?.detail) return p.detail
    if (p?.title) return p.title
    if (status === 401) return '登入已過期，請重新登入'
    return `HTTP ${status}`
  }
}

// ---- Access token ----
// The auth store owns persistence; this module only attaches the token to requests.
let accessToken: string | null = null
let unauthorizedHandler: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

/** Called when an authenticated request gets 401 (token expired or revoked). */
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const res = await fetch(url, { ...init, headers })
  if (!res.ok) {
    // Body is ProblemDetails for 400/401/404/409/429/500; it may be empty (401 from the
    // auth middleware, or proxy 502/504 when the API is down).
    const problem = (await res.json().catch(() => null)) as ProblemDetails | null
    if (res.status === 401 && accessToken) unauthorizedHandler?.()
    throw new ApiError(res.status, problem)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  login(body: LoginRequest) {
    return request<AccessTokenResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  me() {
    return request<CurrentUser>('/api/auth/me')
  },

  getClinicList(date: string, deptId?: number) {
    const q = new URLSearchParams({ date })
    if (deptId) q.set('deptId', String(deptId))
    return request<ClinicListItem[]>(`/api/clinic?${q}`)
  },

  getVitals(patientId: number, days: number) {
    return request<VitalSign[]>(`/api/patients/${patientId}/vitals?days=${days}`)
  },

  createVital(patientId: number, input: VitalSignInput) {
    return request<VitalSign>(`/api/patients/${patientId}/vitals`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updateVital(vitalId: number, input: VitalSignInput) {
    return request<VitalSign>(`/api/vitals/${vitalId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },

  deleteVital(vitalId: number) {
    return request<void>(`/api/vitals/${vitalId}`, { method: 'DELETE' })
  },

  checkIn(appointmentId: number) {
    return request<CheckInResult>(`/api/appointments/${appointmentId}/checkin`, {
      method: 'PATCH',
    })
  },
}
