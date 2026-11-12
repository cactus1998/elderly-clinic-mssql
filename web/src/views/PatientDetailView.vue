<script setup lang="ts">
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Gender, Patient, PatientInput } from '@api-types/clinic-api'
import { ApiError, api } from '@/api/client'
import PageHeader from '@/components/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import VitalsSection from '@/components/VitalsSection.vue'
import { useUiStore } from '@/stores/ui'
import { useVitalsStore } from '@/stores/vitals'

/** No id = create a new patient (/patients/new); with id = view / edit (/patients/:id). */
const { id } = defineProps<{ id?: number }>()

const router = useRouter()
const ui = useUiStore()
const vitals = useVitalsStore()

const patient = shallowRef<Patient | null>(null)
const loading = ref(false)
const notFound = ref(false)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const statusBusy = ref(false)

const today = new Date().toLocaleDateString('sv-SE') // yyyy-MM-dd in local time

interface FormState {
  patientName: string
  gender: Gender
  birthDate: string
  phone: string
  address: string
  emergencyContact: string
  emergencyPhone: string
}

const form = reactive<FormState>(emptyForm())

function emptyForm(): FormState {
  return { patientName: '', gender: 'F', birthDate: '', phone: '', address: '', emergencyContact: '', emergencyPhone: '' }
}

function fillForm(p: Patient | null) {
  Object.assign(
    form,
    p
      ? {
          patientName: p.patientName,
          gender: p.gender,
          birthDate: p.birthDate.slice(0, 10),
          phone: p.phone ?? '',
          address: p.address ?? '',
          emergencyContact: p.emergencyContact ?? '',
          emergencyPhone: p.emergencyPhone ?? '',
        }
      : emptyForm(),
  )
}

const isNew = computed(() => id === undefined)

// The same component instance is reused between /patients/new and /patients/:id, so react to id changes.
let seq = 0
watch(
  () => id,
  async (patientId) => {
    const mySeq = ++seq
    saveError.value = ''
    notFound.value = false
    loadError.value = ''
    if (patientId === undefined) {
      patient.value = null
      fillForm(null)
      vitals.reset()
      return
    }
    if (patient.value?.patientId === patientId) return // just created: already have the data
    loading.value = true
    try {
      const p = await api.getPatient(patientId)
      if (mySeq !== seq) return
      patient.value = p
      fillForm(p)
      vitals.open(patientId)
    } catch (e) {
      if (mySeq !== seq) return
      patient.value = null
      if (e instanceof ApiError && e.status === 404) notFound.value = true
      else loadError.value = e instanceof Error ? e.message : '載入失敗'
    } finally {
      if (mySeq === seq) loading.value = false
    }
  },
  { immediate: true },
)

function blankToNull(s: string): string | null {
  const t = s.trim()
  return t === '' ? null : t
}

async function save() {
  saveError.value = ''
  const input: PatientInput = {
    patientName: form.patientName.trim(),
    gender: form.gender,
    birthDate: form.birthDate,
    phone: blankToNull(form.phone),
    address: blankToNull(form.address),
    emergencyContact: blankToNull(form.emergencyContact),
    emergencyPhone: blankToNull(form.emergencyPhone),
  }
  saving.value = true
  try {
    if (patient.value) {
      const updated = await api.updatePatient(patient.value.patientId, { ...input, rowVersion: patient.value.rowVersion })
      patient.value = updated
      fillForm(updated)
      ui.showToast('已儲存病人資料')
    } else {
      const created = await api.createPatient(input)
      patient.value = created
      fillForm(created)
      vitals.open(created.patientId)
      ui.showToast(`已新增病人，病歷號 ${created.chartNo}`)
      router.replace({ name: 'patient-detail', params: { id: created.patientId } })
    }
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : '儲存失敗'
  } finally {
    saving.value = false
  }
}

async function toggleStatus() {
  const p = patient.value
  if (!p || statusBusy.value) return
  const activate = !p.isActive
  const ok = await ui.confirm(
    activate
      ? { title: '啟用病人', message: `確定重新啟用病歷號 ${p.chartNo}？`, confirmText: '啟用' }
      : {
          title: '停用病人',
          message: `確定停用病歷號 ${p.chartNo}？停用後量測紀錄只能查看，之後可以重新啟用。`,
          confirmText: '停用',
          danger: true,
        },
  )
  if (!ok) return
  statusBusy.value = true
  try {
    const updated = await api.setPatientStatus(p.patientId, activate)
    patient.value = updated
    ui.showToast(activate ? '已啟用病人' : '已停用病人')
  } catch (e) {
    ui.showToast(e instanceof Error ? e.message : '操作失敗', 'error')
  } finally {
    statusBusy.value = false
  }
}


</script>

<template>
  <PageHeader :description="isNew ? '病歷號在儲存後由系統自動產生。' : undefined">
    <template #breadcrumb>
      <nav aria-label="導覽路徑" class="mb-1 text-sm">
        <ol class="flex items-center gap-2 text-slate-500">
          <li><RouterLink to="/patients" class="link-action">病人</RouterLink></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{{ isNew ? '新增病人' : (patient?.patientName ?? '病人資料') }}</li>
        </ol>
      </nav>
    </template>
    <template #title>
      <template v-if="isNew">新增病人</template>
      <template v-else-if="patient">
        {{ patient.patientName }}
        <span class="font-mono text-base font-normal text-slate-500">{{ patient.chartNo }}</span>
        <StatusBadge :active="patient.isActive" />
      </template>
      <template v-else>病人資料</template>
    </template>
    <template v-if="patient" #actions>
      <button
        type="button"
        :aria-disabled="statusBusy"
        class="btn"
        :class="patient.isActive ? 'btn-danger-outline' : 'btn-secondary'"
        @click="toggleStatus"
      >
        {{ patient.isActive ? '停用病人' : '啟用病人' }}
      </button>
    </template>
  </PageHeader>

  <section v-if="notFound" class="card empty-state">
    <p class="empty-state-title">找不到這位病人</p>
    <p>病人可能不存在，請回到清單重新查詢。</p>
    <RouterLink to="/patients" class="btn btn-secondary btn-sm mt-2">回病人清單</RouterLink>
  </section>

  <section v-else-if="loadError" class="card card-body">
    <p class="alert-error" role="alert">{{ loadError }}</p>
  </section>

  <p v-else-if="loading" class="card empty-state" role="status">載入中…</p>

  <div v-else class="space-y-4">
    <form class="card" aria-labelledby="patient-form-title" @submit.prevent="save">
      <div class="card-header">
        <h2 id="patient-form-title" class="card-title">基本資料</h2>
      </div>

      <div class="card-body grid gap-4 sm:grid-cols-2">
        <div>
          <label for="p-name" class="form-label">姓名<span class="required-mark" aria-hidden="true">*</span><span class="sr-only">（必填）</span></label>
          <input id="p-name" v-model="form.patientName" required maxlength="50" autocomplete="off" class="form-control" />
        </div>
        <fieldset>
          <legend class="form-label">性別<span class="required-mark" aria-hidden="true">*</span><span class="sr-only">（必填）</span></legend>
          <div class="flex h-9 items-center gap-6 text-sm text-slate-700">
            <label class="flex items-center gap-2"><input v-model="form.gender" type="radio" value="F" class="size-4 accent-sky-700" />女</label>
            <label class="flex items-center gap-2"><input v-model="form.gender" type="radio" value="M" class="size-4 accent-sky-700" />男</label>
          </div>
        </fieldset>
        <div>
          <label for="p-birth" class="form-label">生日<span class="required-mark" aria-hidden="true">*</span><span class="sr-only">（必填）</span></label>
          <input id="p-birth" v-model="form.birthDate" type="date" required min="1900-01-01" :max="today" class="form-control" />
        </div>
        <div>
          <label for="p-phone" class="form-label">電話</label>
          <input id="p-phone" v-model="form.phone" type="tel" maxlength="20" autocomplete="off" aria-describedby="p-phone-hint" class="form-control" />
          <p id="p-phone-hint" class="form-hint">數字、-、+ 與空白，最多 20 字</p>
        </div>
        <div class="sm:col-span-2">
          <label for="p-address" class="form-label">地址</label>
          <input id="p-address" v-model="form.address" maxlength="200" autocomplete="off" class="form-control" />
        </div>
        <div>
          <label for="p-ec" class="form-label">緊急聯絡人</label>
          <input id="p-ec" v-model="form.emergencyContact" maxlength="50" autocomplete="off" class="form-control" />
        </div>
        <div>
          <label for="p-ep" class="form-label">緊急聯絡電話</label>
          <input id="p-ep" v-model="form.emergencyPhone" type="tel" maxlength="20" autocomplete="off" class="form-control" />
        </div>

        <p v-if="saveError" class="alert-error sm:col-span-2" role="alert">{{ saveError }}</p>
      </div>

      <div class="card-footer flex justify-end gap-2">
        <RouterLink v-if="isNew" to="/patients" class="btn btn-secondary">取消</RouterLink>
        <button type="submit" :disabled="saving" class="btn btn-primary">
          {{ saving ? '儲存中…' : isNew ? '新增病人' : '儲存變更' }}
        </button>
      </div>
    </form>

    <section v-if="patient" class="card flex flex-col" aria-labelledby="vitals-title">
      <div class="card-header">
        <h2 id="vitals-title" class="card-title">生命徵象</h2>
      </div>
      <VitalsSection :read-only="!patient.isActive" />
    </section>
  </div>
</template>
