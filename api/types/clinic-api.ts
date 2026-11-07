// Frontend TypeScript interfaces matching the C# DTOs in api/Dtos.
// ASP.NET Core serializes property names as camelCase.
// DateTime is serialized as an ISO 8601 string (e.g. "2026-11-05T14:00:00").

/** M = morning, A = afternoon, E = evening */
export type Session = 'M' | 'A' | 'E';

export type AppointmentStatus = 'BOOKED' | 'CHECKED_IN' | 'DONE' | 'CANCELLED';

/** GET /api/clinic?date=yyyy-MM-dd&deptId=1  (ClinicListItemDto) */
export interface ClinicListItem {
  deptName: string;
  doctorName: string;
  session: Session;
  seqNo: number;
  chartNo: string;
  patientName: string;
  status: AppointmentStatus;
}

/** GET /api/patients/{id}/vitals?days=14  (VitalSignDto) */
export interface VitalSign {
  vitalId: number;
  measuredAt: string;
  systolicBP: number | null;
  diastolicBP: number | null;
  heartRate: number | null;
  bloodSugar: number | null;
  bodyWeight: number | null;
  note: string | null;
}

/** PATCH /api/appointments/{id}/checkin  (CheckInResultDto) */
export interface CheckInResult {
  appointmentId: number;
  status: AppointmentStatus;
}

/** Error body for 400 / 404 / 409 / 500 (RFC 9110 ProblemDetails) */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  traceId?: string;
  /** Present on 400 validation errors: field name to messages */
  errors?: Record<string, string[]>;
}
