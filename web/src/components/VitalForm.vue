<script setup lang="ts">
import { reactive } from 'vue'
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

const inputClass = 'mt-1 w-full rounded border px-2 py-1'
</script>

<template>
  <form class="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3" @submit.prevent="submit">
    <h3 class="mb-2 text-sm font-semibold text-slate-700">{{ initial ? '編輯量測' : '新增量測' }}</h3>

    <div class="grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-3">
      <label class="col-span-2 sm:col-span-3">
        量測時間
        <input v-model="form.measuredAt" type="datetime-local" required :class="inputClass" />
      </label>
      <label>
        收縮壓（50–260）
        <input v-model="form.systolicBP" type="number" min="50" max="260" :class="inputClass" />
      </label>
      <label>
        舒張壓（30–160）
        <input v-model="form.diastolicBP" type="number" min="30" max="160" :class="inputClass" />
      </label>
      <label>
        心跳（20–250）
        <input v-model="form.heartRate" type="number" min="20" max="250" :class="inputClass" />
      </label>
      <label>
        血糖（20–800）
        <input v-model="form.bloodSugar" type="number" min="20" max="800" :class="inputClass" />
      </label>
      <label>
        體重 kg（10–300）
        <input v-model="form.bodyWeight" type="number" min="10" max="300" step="0.1" :class="inputClass" />
      </label>
      <label class="col-span-2 sm:col-span-3">
        備註
        <input v-model="form.note" maxlength="200" :class="inputClass" />
      </label>
    </div>

    <p v-if="error" class="mt-2 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{{ error }}</p>

    <div class="mt-3 flex gap-2">
      <button
        type="submit"
        :disabled="saving"
        class="rounded bg-sky-600 px-4 py-1 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {{ saving ? '儲存中…' : '儲存' }}
      </button>
      <button type="button" class="rounded border px-4 py-1 text-sm hover:bg-white" @click="emit('cancel')">
        取消
      </button>
    </div>
  </form>
</template>
