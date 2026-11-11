import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ClinicListItem, VitalSign, VitalSignInput } from '@api-types/clinic-api'
import { api } from '@/api/client'

/** Local date as yyyy-MM-dd (toISOString would shift to UTC). */
function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export const useClinicStore = defineStore('clinic', () => {
  // ---- Clinic list ----
  const date = ref(today())
  const deptName = ref('') // '' = all departments
  const list = ref<ClinicListItem[]>([])
  const loading = ref(false)
  const error = ref('')
  const checkingIn = ref<number | null>(null)
  let listRequestId = 0

  const deptNames = computed(() => [...new Set(list.value.map((r) => r.deptName))])
  const filtered = computed(() =>
    deptName.value ? list.value.filter((r) => r.deptName === deptName.value) : list.value,
  )

  async function loadList() {
    const requestId = ++listRequestId
    clearSelection()
    loading.value = true
    error.value = ''
    try {
      const result = await api.getClinicList(date.value)
      if (requestId !== listRequestId) return
      list.value = result
      if (deptName.value && !deptNames.value.includes(deptName.value)) deptName.value = ''
    } catch (e) {
      if (requestId !== listRequestId) return
      list.value = []
      error.value = message(e)
    } finally {
      if (requestId === listRequestId) loading.value = false
    }
  }

  async function checkIn(row: ClinicListItem) {
    checkingIn.value = row.appointmentId
    error.value = ''
    try {
      const result = await api.checkIn(row.appointmentId)
      row.status = result.status
    } catch (e) {
      error.value = message(e)
    } finally {
      checkingIn.value = null
    }
  }

  // ---- Vitals of the selected patient ----
  const selected = ref<ClinicListItem | null>(null)
  const days = ref(14)
  const vitals = ref<VitalSign[]>([])
  const vitalsLoading = ref(false)
  const vitalsError = ref('')
  // Incremented per request; a response is applied only if it is still the latest one.
  let vitalsRequestId = 0

  async function loadVitals() {
    if (!selected.value) return
    const requestId = ++vitalsRequestId
    vitalsLoading.value = true
    vitalsError.value = ''
    try {
      const result = await api.getVitals(selected.value.patientId, days.value)
      if (requestId === vitalsRequestId) vitals.value = result
    } catch (e) {
      if (requestId !== vitalsRequestId) return
      vitals.value = []
      vitalsError.value = message(e)
    } finally {
      if (requestId === vitalsRequestId) vitalsLoading.value = false
    }
  }

  function selectPatient(row: ClinicListItem) {
    selected.value = row
    loadVitals()
  }

  /** Clear the right-hand vitals panel (new query, logout). Ignores any in-flight vitals response. */
  function clearSelection() {
    vitalsRequestId++
    selected.value = null
    vitals.value = []
    vitalsLoading.value = false
    vitalsError.value = ''
    saveError.value = ''
  }

  // ---- Create / update / delete vitals ----
  const saving = ref(false)
  const saveError = ref('')
  const deletingId = ref<number | null>(null)

  /** Create when vitalId is omitted, otherwise update. Returns true on success. */
  async function saveVital(input: VitalSignInput, vitalId?: number): Promise<boolean> {
    if (!selected.value) return false
    saving.value = true
    saveError.value = ''
    try {
      if (vitalId === undefined) await api.createVital(selected.value.patientId, input)
      else await api.updateVital(vitalId, input)
      await loadVitals()
      return true
    } catch (e) {
      saveError.value = message(e)
      return false
    } finally {
      saving.value = false
    }
  }

  async function deleteVital(vitalId: number) {
    deletingId.value = vitalId
    vitalsError.value = ''
    try {
      await api.deleteVital(vitalId)
      vitals.value = vitals.value.filter((v) => v.vitalId !== vitalId)
    } catch (e) {
      vitalsError.value = message(e)
    } finally {
      deletingId.value = null
    }
  }

  /** Clear all data on logout so the next user never sees the previous user's screen. */
  function reset() {
    listRequestId++
    clearSelection()
    date.value = today()
    deptName.value = ''
    list.value = []
    error.value = ''
  }

  return {
    date, deptName, list, loading, error, checkingIn, deptNames, filtered, loadList, checkIn,
    selected, days, vitals, vitalsLoading, vitalsError, loadVitals, selectPatient,
    saving, saveError, deletingId, saveVital, deleteVital, reset,
  }
})
