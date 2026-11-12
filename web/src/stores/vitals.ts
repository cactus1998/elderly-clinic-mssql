import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { VitalSignInput } from '@api-types/clinic-api'
import { api } from '@/api/client'
import { usePagedQuery } from '@/composables/usePagedQuery'

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Vital signs of one patient. Shared by the clinic page panel and the patient detail page
 * (only one of them is on screen at a time).
 */
export const useVitalsStore = defineStore('vitals', () => {
  const patientId = ref<number | null>(null)
  const days = ref(14)
  const list = usePagedQuery((p: { patientId: number; days: number } & { page: number; pageSize: number }) =>
    api.getVitals(p.patientId, p.days, { page: p.page, pageSize: p.pageSize }),
  )

  const saving = ref(false)
  const saveError = ref('')
  const deletingId = ref<number | null>(null)

  function load() {
    if (patientId.value === null) return Promise.resolve()
    return list.load({ patientId: patientId.value, days: days.value })
  }

  /** Show another patient: back to page 1. */
  function open(id: number) {
    patientId.value = id
    list.page.value = 1
    saveError.value = ''
    return load()
  }

  function setDays(d: number) {
    days.value = d
    list.page.value = 1
    return load()
  }

  function setPage(p: number) {
    list.page.value = p
    return load()
  }

  function setPageSize(size: number) {
    list.pageSize.value = size
    list.page.value = 1
    return load()
  }

  /** Create when vitalId is omitted, otherwise update. Returns true on success. */
  async function save(input: VitalSignInput, vitalId?: number): Promise<boolean> {
    if (patientId.value === null) return false
    saving.value = true
    saveError.value = ''
    try {
      if (vitalId === undefined) {
        await api.createVital(patientId.value, input)
        list.page.value = 1 // newest first: the new record is on page 1
      } else {
        await api.updateVital(vitalId, input)
      }
      await load()
      return true
    } catch (e) {
      saveError.value = message(e)
      return false
    } finally {
      saving.value = false
    }
  }

  async function remove(vitalId: number): Promise<boolean> {
    deletingId.value = vitalId
    list.error.value = ''
    try {
      await api.deleteVital(vitalId)
      await load() // jumps back a page automatically if this page became empty
      return true
    } catch (e) {
      list.error.value = message(e)
      return false
    } finally {
      deletingId.value = null
    }
  }

  function reset() {
    patientId.value = null
    days.value = 14
    list.reset()
    saving.value = false
    saveError.value = ''
    deletingId.value = null
  }

  return {
    patientId, days, saving, saveError, deletingId,
    items: list.items, totalCount: list.totalCount, page: list.page, pageSize: list.pageSize,
    loading: list.loading, error: list.error, lastPage: list.lastPage,
    open, load, setDays, setPage, setPageSize, save, remove, reset,
  }
})
