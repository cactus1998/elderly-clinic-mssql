import type {
  CheckInResult,
  ClinicListItem,
  ProblemDetails,
  VitalSign,
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
    if (p?.errors) return Object.values(p.errors).flat().join('；')
    if (p?.detail) return p.detail
    if (p?.title) return p.title
    return `HTTP ${status}`
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, ...init })
  if (!res.ok) {
    // Body is ProblemDetails for 400/404/409/500; it may be empty if the API is down (proxy 502/504).
    const problem = (await res.json().catch(() => null)) as ProblemDetails | null
    throw new ApiError(res.status, problem)
  }
  return (await res.json()) as T
}

export const api = {
  getClinicList(date: string, deptId?: number) {
    const q = new URLSearchParams({ date })
    if (deptId) q.set('deptId', String(deptId))
    return request<ClinicListItem[]>(`/api/clinic?${q}`)
  },

  getVitals(patientId: number, days: number) {
    return request<VitalSign[]>(`/api/patients/${patientId}/vitals?days=${days}`)
  },

  checkIn(appointmentId: number) {
    return request<CheckInResult>(`/api/appointments/${appointmentId}/checkin`, {
      method: 'PATCH',
    })
  },
}
