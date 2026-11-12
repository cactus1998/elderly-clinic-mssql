import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { Department } from '@api-types/clinic-api'
import { api } from '@/api/client'
import { usePagedQuery } from '@/composables/usePagedQuery'

/**
 * List state for the patients / doctors / departments pages.
 * Filters other than keyword are mirrored in the URL by the views; keyword stays here
 * because patient names are personal data and must not appear in the address bar.
 */
export const usePatientsStore = defineStore('patients', () => {
  const keyword = ref('')
  const includeInactive = ref(false)
  const list = usePagedQuery(api.listPatients)

  const load = () =>
    list.load({ keyword: keyword.value.trim() || undefined, includeInactive: includeInactive.value })

  function reset() {
    keyword.value = ''
    includeInactive.value = false
    list.reset()
  }

  return { keyword, includeInactive, ...list, load, reset }
})

export const useDoctorsStore = defineStore('doctors', () => {
  const deptId = ref<number | null>(null)
  const includeInactive = ref(false)
  const list = usePagedQuery(api.listDoctors)

  const load = () => list.load({ deptId: deptId.value, includeInactive: includeInactive.value })

  function reset() {
    deptId.value = null
    includeInactive.value = false
    list.reset()
  }

  return { deptId, includeInactive, ...list, load, reset }
})

export const useDepartmentsStore = defineStore('departments', () => {
  const includeInactive = ref(false)
  const list = usePagedQuery(api.listDepartments)

  const load = () => list.load({ includeInactive: includeInactive.value })

  // All departments (including inactive) for filters and dropdowns.
  // A hospital has far fewer than 100 departments, so one page is enough.
  const options = shallowRef<Department[]>([])
  async function loadOptions() {
    const result = await api.listDepartments({ page: 1, pageSize: 100, includeInactive: true })
    options.value = result.items
  }

  /** After a department is created / renamed / (de)activated, dropdowns must reload. */
  function departmentsChanged() {
    options.value = []
  }

  function reset() {
    includeInactive.value = false
    options.value = []
    list.reset()
  }

  return { includeInactive, ...list, load, options, loadOptions, departmentsChanged, reset }
})
