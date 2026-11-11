<script setup lang="ts">
import { useClinicStore } from '@/stores/clinic'

const store = useClinicStore()

const dayOptions = [7, 14, 30, 90]

function fmtTime(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ')
}

function show(v: number | null): string {
  return v === null ? '—' : String(v)
}
</script>

<template>
  <section class="rounded-xl bg-white p-4 shadow-sm">
    <p v-if="!store.selected" class="py-6 text-center text-slate-400">點選左側病人查看生命徵象</p>

    <template v-else>
      <header class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-semibold">
          {{ store.selected.patientName }}
          <span class="ml-1 font-mono text-sm text-slate-500">{{ store.selected.chartNo }}</span>
        </h2>
        <label class="text-sm text-slate-600">
          最近
          <select v-model.number="store.days" class="rounded border px-1 py-0.5" @change="store.loadVitals">
            <option v-for="d in dayOptions" :key="d" :value="d">{{ d }}</option>
          </select>
          天
        </label>
      </header>

      <p v-if="store.vitalsError" class="mb-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ store.vitalsError }}
      </p>
      <p v-else-if="store.vitalsLoading" class="py-6 text-center text-slate-400">載入中…</p>
      <p v-else-if="store.vitals.length === 0" class="py-6 text-center text-slate-400">
        這段期間沒有量測紀錄
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b text-slate-500">
            <tr>
              <th class="py-2 pr-3">量測時間</th>
              <th class="py-2 pr-3">血壓</th>
              <th class="py-2 pr-3">心跳</th>
              <th class="py-2 pr-3">血糖</th>
              <th class="py-2 pr-3">體重</th>
              <th class="py-2">備註</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in store.vitals" :key="v.vitalId" class="border-b last:border-0">
              <td class="py-2 pr-3 whitespace-nowrap">{{ fmtTime(v.measuredAt) }}</td>
              <td class="py-2 pr-3">{{ show(v.systolicBP) }}/{{ show(v.diastolicBP) }}</td>
              <td class="py-2 pr-3">{{ show(v.heartRate) }}</td>
              <td class="py-2 pr-3">{{ show(v.bloodSugar) }}</td>
              <td class="py-2 pr-3">{{ show(v.bodyWeight) }}</td>
              <td class="py-2 text-slate-500">{{ v.note ?? '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
