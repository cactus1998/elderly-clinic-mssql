<script setup lang="ts">
import { ref, watch } from 'vue'
import type { VitalSign, VitalSignInput } from '@api-types/clinic-api'
import VitalForm from '@/components/VitalForm.vue'
import { useClinicStore } from '@/stores/clinic'

const store = useClinicStore()

const dayOptions = [7, 14, 30, 90]

/** null = form closed, 'new' = creating, VitalSign = editing that record. */
const editing = ref<'new' | VitalSign | null>(null)

// Close the form when switching patient.
watch(
  () => store.selected?.patientId,
  () => {
    editing.value = null
    store.saveError = ''
  },
)

function openForm(target: 'new' | VitalSign) {
  store.saveError = ''
  editing.value = target
}

async function save(input: VitalSignInput) {
  const target = editing.value
  const ok = await store.saveVital(input, target && target !== 'new' ? target.vitalId : undefined)
  if (ok) editing.value = null
}

function remove(v: VitalSign) {
  if (!confirm(`確定刪除 ${fmtTime(v.measuredAt)} 的量測紀錄？刪除後無法復原。`)) return
  if (editing.value !== 'new' && editing.value?.vitalId === v.vitalId) editing.value = null
  store.deleteVital(v.vitalId)
}

function fmtTime(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ')
}

function show(v: number | null): string {
  return v === null ? '—' : String(v)
}
</script>

<template>
  <section class="rounded-xl bg-white p-4 shadow-sm">
    <p v-if="!store.selected" class="py-6 text-center text-slate-400">點選門診清單中的病人，查看生命徵象</p>

    <template v-else>
      <header class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-semibold">
          {{ store.selected.patientName }}
          <span class="ml-1 font-mono text-sm text-slate-500">{{ store.selected.chartNo }}</span>
        </h2>
        <div class="flex items-center gap-3">
          <label class="text-sm text-slate-600">
            最近
            <select v-model.number="store.days" class="rounded border px-1 py-0.5" @change="store.loadVitals">
              <option v-for="d in dayOptions" :key="d" :value="d">{{ d }}</option>
            </select>
            天
          </label>
          <button
            v-if="editing === null"
            class="rounded bg-sky-600 px-3 py-1 text-sm text-white hover:bg-sky-700"
            @click="openForm('new')"
          >
            新增量測
          </button>
        </div>
      </header>

      <VitalForm
        v-if="editing !== null"
        :key="editing === 'new' ? 'new' : editing.vitalId"
        :initial="editing === 'new' ? null : editing"
        :saving="store.saving"
        :error="store.saveError"
        @submit="save"
        @cancel="editing = null"
      />

      <p v-if="store.vitalsError" class="mb-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
        {{ store.vitalsError }}
      </p>
      <p v-if="store.vitalsLoading" class="py-6 text-center text-slate-400">載入中…</p>
      <p v-else-if="store.vitals.length === 0 && !store.vitalsError" class="py-6 text-center text-slate-400">
        這段期間沒有量測紀錄
      </p>

      <div v-else-if="store.vitals.length > 0" class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b text-slate-500">
            <tr>
              <th class="py-2 pr-3">量測時間</th>
              <th class="py-2 pr-3">血壓</th>
              <th class="py-2 pr-3">心跳</th>
              <th class="py-2 pr-3">血糖</th>
              <th class="py-2 pr-3">體重</th>
              <th class="py-2 pr-3">備註</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in store.vitals" :key="v.vitalId" class="border-b last:border-0">
              <td class="py-2 pr-3 whitespace-nowrap">{{ fmtTime(v.measuredAt) }}</td>
              <td class="py-2 pr-3">{{ show(v.systolicBP) }}/{{ show(v.diastolicBP) }}</td>
              <td class="py-2 pr-3">{{ show(v.heartRate) }}</td>
              <td class="py-2 pr-3">{{ show(v.bloodSugar) }}</td>
              <td class="py-2 pr-3">{{ show(v.bodyWeight) }}</td>
              <td class="py-2 pr-3 text-slate-500">{{ v.note ?? '' }}</td>
              <td class="py-2 whitespace-nowrap text-right">
                <button
                  class="mr-1 rounded border border-sky-600 px-2 py-0.5 text-xs text-sky-700 hover:bg-sky-50"
                  @click="openForm(v)"
                >
                  編輯
                </button>
                <button
                  :disabled="store.deletingId === v.vitalId"
                  class="rounded border border-rose-600 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  @click="remove(v)"
                >
                  刪除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
