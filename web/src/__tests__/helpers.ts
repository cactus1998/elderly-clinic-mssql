// Shared test helpers. Not a test file itself (only *.test.ts are collected).
import type { ClinicListItem, PagedResult, VitalSign } from '@api-types/clinic-api'

/** A promise the test resolves or rejects by hand, to control response order. */
export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export function paged<T>(items: T[], totalCount = items.length, page = 1, pageSize = 20): PagedResult<T> {
  return { items, totalCount, page, pageSize }
}

// Obviously fake data only — never copy real patient details into tests.
export function makeClinicRow(overrides: Partial<ClinicListItem> = {}): ClinicListItem {
  return {
    appointmentId: 1,
    patientId: 1,
    deptName: '測試科',
    doctorName: '測試醫師',
    session: 'M',
    seqNo: 1,
    chartNo: 'T000001',
    patientName: '測試病人',
    status: 'BOOKED',
    ...overrides,
  }
}

export function makeVital(overrides: Partial<VitalSign> = {}): VitalSign {
  return {
    vitalId: 1,
    measuredAt: '2026-11-11T08:00:00',
    systolicBP: 120,
    diastolicBP: 80,
    heartRate: 70,
    bloodSugar: null,
    bodyWeight: null,
    note: null,
    ...overrides,
  }
}
