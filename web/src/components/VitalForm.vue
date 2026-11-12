<script setup lang="ts">
import { reactive, useId } from 'vue'
import type { VitalSign, VitalSignInput } from '@api-types/clinic-api'

const { initial = null, saving = false, error = '' } = defineProps<{
  /** Record to edit; null = create a new one. */
  initial?: VitalSign | null
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  submit: [input: VitalSignInput]
  cancel: []
}>()

/** Current local time as "yyyy-MM-ddTHH:mm" for <input type="datetime-local">. */
function nowLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const toText = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))

// Inputs are kept as strings so an empty box means "not measured" (null), not 0.
const form = reactive({
  measuredAt: initial ? initial.measuredAt.slice(0, 16) : nowLocal(),
  systolicBP: toText(initial?.systolicBP),
  diastolicBP: toText(initial?.diastolicBP),
  heartRate: toText(initial?.heartRate),
  bloodSugar: toText(initial?.bloodSugar),
  bodyWeight: toText(initial?.bodyWeight),
  note: initial?.note ?? '',
})

// v-model on <input type="number"> yields a number once the user types, '' when cleared.
const toNumber = (v: string | number) => (String(v).trim() === '' ? null : Number(v))

function submit() {
  emit('submit', {
    // Local time without time zone, matching how the API stores MeasuredAt.
    measuredAt: `${form.measuredAt}:00`,
    systolicBP: toNumber(form.systolicBP),
    diastolicBP: toNumber(form.diastolicBP),
    heartRate: toNumber(form.heartRate),
    bloodSugar: toNumber(form.bloodSugar),
    bodyWeight: toNumber(form.bodyWeight),
    note: form.note.trim() === '' ? null : form.note.trim(),
  })
}

const uid = useId()

type NumberKey = 'systolicBP' | 'diastolicBP' | 'heartRate' | 'bloodSugar' | 'bodyWeight'
const numberFields: { key: NumberKey; label: string; unit: string; min: number; max: number; step?: number }[] = [
  { key: 'systolicBP', label: '收縮壓', unit: 'mmHg', min: 50, max: 260 },
  { key: 'diastolicBP', label: '舒張壓', unit: 'mmHg', min: 30, max: 160 },
  { key: 'heartRate', label: '心跳', unit: '次/分', min: 20, max: 250 },
  { key: 'bloodSugar', label: '血糖', unit: 'mg/dL', min: 20, max: 800 },
  { key: 'bodyWeight', label: '體重', unit: 'kg', min: 10, max: 300, step: 0.1 },
]
</script>

<template>
  <form class="border-b border-slate-200 bg-slate-50 px-4 py-4" @submit.prevent="submit">
    <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ initial ? '編輯量測' : '新增量測' }}</h3>

    <div class="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
      <div class="col-span-2 sm:col-span-3">
        <label :for="`${uid}-at`" class="form-label">量測時間<span class="required-mark" aria-hidden="true">*</span><span class="sr-only">（必填）</span></label>
        <input :id="`${uid}-at`" v-model="form.measuredAt" type="datetime-local" required class="form-control sm:w-64" />
      </div>
      <div v-for="f in numberFields" :key="f.key">
        <label :for="`${uid}-${f.key}`" class="form-label">
          {{ f.label }} <span class="font-normal text-slate-500">{{ f.unit }}</span>
        </label>
        <input
          :id="`${uid}-${f.key}`"
          v-model="form[f.key]"
          type="number"
          inputmode="decimal"
          :min="f.min"
          :max="f.max"
          :step="f.step ?? 1"
          :aria-describedby="`${uid}-${f.key}-hint`"
          class="form-control"
        />
        <p :id="`${uid}-${f.key}-hint`" class="form-hint">{{ f.min }}–{{ f.max }}</p>
      </div>
      <div class="col-span-2 sm:col-span-3">
        <label :for="`${uid}-note`" class="form-label">備註</label>
        <input :id="`${uid}-note`" v-model="form.note" maxlength="200" class="form-control" />
      </div>
    </div>
    <p class="form-hint mt-3">至少填一項數值；收縮壓與舒張壓要一起填，收縮壓要大於舒張壓。</p>

    <p v-if="error" class="alert-error mt-3" role="alert">{{ error }}</p>

    <div class="mt-4 flex justify-end gap-2">
      <button type="button" class="btn btn-secondary" @click="emit('cancel')">取消</button>
      <button type="submit" :disabled="saving" class="btn btn-primary">{{ saving ? '儲存中…' : '儲存' }}</button>
    </div>
  </form>
</template>
