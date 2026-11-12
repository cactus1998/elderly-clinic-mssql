<script setup lang="ts">
import { nextTick, onMounted } from 'vue'
import type { AppointmentStatus, ClinicListItem, Session } from '@api-types/clinic-api'
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
  BOOKED: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  CHECKED_IN: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  DONE: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  CANCELLED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

const isSelected = (appointmentId: number) => store.selected?.appointmentId === appointmentId

/**
 * After a successful check-in the 報到 button disappears. Move focus to the patient name in the
 * same row so keyboard users do not lose their place.
 */
async function checkIn(row: ClinicListItem, e: Event) {
  const tr = (e.currentTarget as HTMLElement).closest('tr')
  await store.checkIn(row)
  if (row.status === 'BOOKED') return
  await nextTick()
  tr?.querySelector<HTMLElement>('button[aria-pressed]')?.focus()
}

// Keep the previous query when coming back from another page; load only the first time.
onMounted(() => {
  if (!store.loaded) store.loadList()
})
</script>

<template>
  <section class="card flex min-w-0 flex-col" aria-label="門診清單">
    <form class="toolbar justify-start" @submit.prevent="store.loadList">
      <div>
        <label for="clinic-date" class="form-label">看診日期</label>
        <input id="clinic-date" v-model="store.date" type="date" required class="form-control w-44" />
      </div>
      <div>
        <label for="clinic-dept" class="form-label">科別</label>
        <select id="clinic-dept" v-model="store.deptName" class="form-control w-36">
          <option value="">全部科別</option>
          <option v-for="d in store.deptNames" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <button type="submit" :disabled="store.loading" class="btn btn-primary">
        {{ store.loading ? '查詢中…' : '查詢' }}
      </button>
    </form>

    <div v-if="store.error" class="px-4 pt-4">
      <p class="alert-error" role="alert">{{ store.error }}</p>
    </div>

    <p v-if="store.loading && store.list.length === 0" class="empty-state" role="status">載入中…</p>

    <div
      v-else-if="store.loaded && !store.loading && !store.error && store.filtered.length === 0"
      class="empty-state"
    >
      <p class="empty-state-title">這一天沒有門診</p>
      <p>可以改選其他日期，或到病人頁查詢病人、新增生命徵象。</p>
      <RouterLink to="/patients" class="btn btn-secondary btn-sm mt-2">前往病人</RouterLink>
    </div>

    <div v-else-if="store.filtered.length > 0" class="overflow-x-auto" :class="{ 'opacity-60': store.loading }">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">科別</th>
            <th scope="col">醫師</th>
            <th scope="col">診別</th>
            <th scope="col" class="num">號碼</th>
            <th scope="col">病歷號</th>
            <th scope="col">姓名</th>
            <th scope="col">狀態</th>
            <th scope="col" class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in store.filtered"
            :key="row.appointmentId"
            class="cursor-pointer"
            :class="{ 'bg-sky-50 shadow-[inset_3px_0_0_var(--color-sky-600)] hover:bg-sky-50': isSelected(row.appointmentId) }"
            @click="store.selectPatient(row)"
          >
            <td>{{ row.deptName }}</td>
            <td>{{ row.doctorName }}</td>
            <td>{{ sessionLabel[row.session] }}</td>
            <td class="num">{{ row.seqNo }}</td>
            <td class="font-mono text-slate-600">{{ row.chartNo }}</td>
            <td>
              <!-- Real button so the row can be selected with the keyboard. -->
              <button
                type="button"
                class="link-action"
                :aria-pressed="isSelected(row.appointmentId)"
                @click.stop="store.selectPatient(row)"
              >
                {{ row.patientName }}
              </button>
            </td>
            <td>
              <span class="badge" :class="statusClass[row.status]">{{ statusLabel[row.status] }}</span>
            </td>
            <td class="col-actions">
              <button
                v-if="row.status === 'BOOKED'"
                type="button"
                :aria-disabled="store.checkingIn === row.appointmentId"
                class="link-action"
                @click.stop="checkIn(row, $event)"
              >
                報到
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="store.filtered.length > 0" class="card-footer mt-auto text-sm text-slate-600 tabular-nums">
      共 {{ store.filtered.length }} 筆
    </p>
  </section>
</template>
