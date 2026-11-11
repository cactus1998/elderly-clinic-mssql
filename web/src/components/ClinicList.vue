<script setup lang="ts">
import { onMounted } from 'vue'
import type { AppointmentStatus, Session } from '@api-types/clinic-api'
import { useClinicStore } from '@/stores/clinic'

const store = useClinicStore()

const sessionLabel: Record<Session, string> = { M: '早診', A: '午診', E: '晚診' }

const statusLabel: Record<AppointmentStatus, string> = {
  BOOKED: '已掛號',
  CHECKED_IN: '已報到',
  DONE: '已看診',
  CANCELLED: '已取消',
}

const statusClass: Record<AppointmentStatus, string> = {
  BOOKED: 'bg-amber-100 text-amber-800',
  CHECKED_IN: 'bg-emerald-100 text-emerald-800',
  DONE: 'bg-slate-200 text-slate-700',
  CANCELLED: 'bg-rose-100 text-rose-800',
}

onMounted(store.loadList)
</script>

<template>
  <section class="rounded-xl bg-white p-4 shadow-sm">
    <form class="mb-4 flex flex-wrap items-end gap-3" @submit.prevent="store.loadList">
      <label class="flex flex-col text-sm text-slate-600">
        看診日期
        <input v-model="store.date" type="date" required class="mt-1 rounded border px-2 py-1" />
      </label>
      <label class="flex flex-col text-sm text-slate-600">
        科別
        <select v-model="store.deptName" class="mt-1 rounded border px-2 py-1">
          <option value="">全部</option>
          <option v-for="d in store.deptNames" :key="d" :value="d">{{ d }}</option>
        </select>
      </label>
      <button
        type="submit"
        :disabled="store.loading"
        class="rounded bg-sky-600 px-4 py-1.5 text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {{ store.loading ? '查詢中…' : '查詢' }}
      </button>
    </form>

    <p v-if="store.error" class="mb-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ store.error }}
    </p>

    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b text-slate-500">
          <tr>
            <th class="py-2 pr-3">科別</th>
            <th class="py-2 pr-3">醫師</th>
            <th class="py-2 pr-3">診別</th>
            <th class="py-2 pr-3">號碼</th>
            <th class="py-2 pr-3">病歷號</th>
            <th class="py-2 pr-3">姓名</th>
            <th class="py-2 pr-3">狀態</th>
            <th class="py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in store.filtered"
            :key="row.appointmentId"
            class="cursor-pointer border-b last:border-0 hover:bg-slate-50"
            :class="{ 'bg-sky-50': store.selected?.appointmentId === row.appointmentId }"
            @click="store.selectPatient(row)"
          >
            <td class="py-2 pr-3">{{ row.deptName }}</td>
            <td class="py-2 pr-3">{{ row.doctorName }}</td>
            <td class="py-2 pr-3">{{ sessionLabel[row.session] }}</td>
            <td class="py-2 pr-3">{{ row.seqNo }}</td>
            <td class="py-2 pr-3 font-mono">{{ row.chartNo }}</td>
            <td class="py-2 pr-3">{{ row.patientName }}</td>
            <td class="py-2 pr-3">
              <span class="rounded px-2 py-0.5 text-xs" :class="statusClass[row.status]">
                {{ statusLabel[row.status] }}
              </span>
            </td>
            <td class="py-2 text-right">
              <button
                v-if="row.status === 'BOOKED'"
                :disabled="store.checkingIn === row.appointmentId"
                class="rounded border border-emerald-600 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                @click.stop="store.checkIn(row)"
              >
                報到
              </button>
            </td>
          </tr>
          <tr v-if="!store.loading && store.filtered.length === 0">
            <td colspan="8" class="py-6 text-center text-slate-400">沒有門診資料</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
