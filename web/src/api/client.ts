import type {
  AccessTokenResponse,
  CheckInResult,
  ClinicListItem,
  CurrentUser,
  Department,
  DepartmentInput,
  Doctor,
  DoctorInput,
  LoginRequest,
  PagedResult,
  Patient,
  PatientInput,
  PatientListItem,
  ProblemDetails,
  VitalSign,
  VitalSignInput,
} from '@api-types/clinic-api'

export interface PageParams {
  page: number
  pageSize: number
}

/** Build a query string, skipping undefined / null / '' values. */
function qs(params: object): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params) as [string, string | number | boolean | null | undefined][]) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  return q.toString()
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

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
    // 0 = network error; 502/503/504 = the dev proxy or a gateway cannot reach the API.
    if (status === 0 || status === 502 || status === 503 || status === 504) return '無法連線到伺服器，請稍後再試'
    // Server errors carry only a generic English title; never show technical text to users.
    if (status >= 500) return '伺服器發生錯誤，請稍後再試'
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

  let res: Response
  try {
    res = await fetch(url, { ...init, headers })
  } catch {
    // Network down or the request was blocked: report it like any other API error.
    throw new ApiError(0, null)
  }
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

  getVitals(patientId: number, days: number, paging: PageParams) {
    return request<PagedResult<VitalSign>>(
      `/api/patients/${patientId}/vitals?${qs({ days, ...paging })}`,
    )
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

  // ---- Departments ----
  listDepartments(params: PageParams & { includeInactive?: boolean }) {
    return request<PagedResult<Department>>(`/api/departments?${qs(params)}`)
  },
  createDepartment(input: DepartmentInput) {
    return request<Department>('/api/departments', json('POST', input))
  },
  updateDepartment(id: number, input: DepartmentInput) {
    return request<Department>(`/api/departments/${id}`, json('PUT', input))
  },
  setDepartmentStatus(id: number, isActive: boolean) {
    return request<Department>(`/api/departments/${id}/status`, json('PATCH', { isActive }))
  },

  // ---- Doctors ----
  listDoctors(params: PageParams & { deptId?: number | null; includeInactive?: boolean }) {
    return request<PagedResult<Doctor>>(`/api/doctors?${qs(params)}`)
  },
  createDoctor(input: DoctorInput) {
    return request<Doctor>('/api/doctors', json('POST', input))
  },
  updateDoctor(id: number, input: DoctorInput) {
    return request<Doctor>(`/api/doctors/${id}`, json('PUT', input))
  },
  setDoctorStatus(id: number, isActive: boolean) {
    return request<Doctor>(`/api/doctors/${id}/status`, json('PATCH', { isActive }))
  },

  // ---- Patients ----
  listPatients(params: PageParams & { keyword?: string; includeInactive?: boolean }) {
    return request<PagedResult<PatientListItem>>(`/api/patients?${qs(params)}`)
  },
  getPatient(id: number) {
    return request<Patient>(`/api/patients/${id}`)
  },
  createPatient(input: PatientInput) {
    return request<Patient>('/api/patients', json('POST', input))
  },
  updatePatient(id: number, input: PatientInput) {
    return request<Patient>(`/api/patients/${id}`, json('PUT', input))
  },
  setPatientStatus(id: number, isActive: boolean) {
    return request<Patient>(`/api/patients/${id}/status`, json('PATCH', { isActive }))
  },
}
