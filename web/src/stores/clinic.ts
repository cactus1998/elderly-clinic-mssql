import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ClinicListItem } from '@api-types/clinic-api'
import { api } from '@/api/client'
import { useVitalsStore } from '@/stores/vitals'

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
  const date = ref(today())
  const deptName = ref('') // '' = all departments
  const list = ref<ClinicListItem[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const checkingIn = ref<number | null>(null)
  const selected = ref<ClinicListItem | null>(null)
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
      loaded.value = true
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
    if (checkingIn.value === row.appointmentId) return // double click
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

  function selectPatient(row: ClinicListItem) {
    selected.value = row
    useVitalsStore().open(row.patientId)
  }

  /** Clear the vitals panel (new query, logout). The vitals store drops any in-flight response. */
  function clearSelection() {
    selected.value = null
    useVitalsStore().reset()
  }

  /** Clear all data on logout so the next user never sees the previous user's screen. */
  function reset() {
    listRequestId++
    clearSelection()
    date.value = today()
    deptName.value = ''
    list.value = []
    loaded.value = false
    loading.value = false
    error.value = ''
  }

  return {
    date, deptName, list, loading, loaded, error, checkingIn, selected, deptNames, filtered,
    loadList, checkIn, selectPatient, clearSelection, reset,
  }
})
