<script setup lang="ts">
import { ref, watch } from 'vue'
import type { VitalSign, VitalSignInput } from '@api-types/clinic-api'
import PaginationBar from '@/components/PaginationBar.vue'
import VitalForm from '@/components/VitalForm.vue'
import { useUiStore } from '@/stores/ui'
import { useVitalsStore } from '@/stores/vitals'

/** Vital signs list + create / edit / delete for the patient opened in the vitals store. */
const { readOnly = false } = defineProps<{
  /** Inactive patients: records can be viewed but not changed. */
  readOnly?: boolean
}>()

const store = useVitalsStore()
const ui = useUiStore()

const dayOptions = [7, 14, 30, 90, 365]

/** null = form closed, 'new' = creating, VitalSign = editing that record. */
const editing = ref<'new' | VitalSign | null>(null)

watch(
  () => store.patientId,
  () => (editing.value = null),
)

function openForm(target: 'new' | VitalSign) {
  store.saveError = ''
  editing.value = target
}

async function save(input: VitalSignInput) {
  const target = editing.value
  const ok = await store.save(input, target && target !== 'new' ? target.vitalId : undefined)
  if (ok) {
    editing.value = null
    ui.showToast('已儲存量測紀錄')
  }
}

async function remove(v: VitalSign) {
  const ok = await ui.confirm({
    title: '刪除量測紀錄',
    message: `確定刪除 ${fmtTime(v.measuredAt)} 的量測紀錄？刪除後無法復原。`,
    confirmText: '刪除',
    danger: true,
  })
  if (!ok) return
  if (editing.value !== 'new' && editing.value?.vitalId === v.vitalId) editing.value = null
  if (await store.remove(v.vitalId)) ui.showToast('已刪除量測紀錄')
}

function fmtTime(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ')
}

function show(v: number | null): string {
  return v === null ? '—' : String(v)
}
</script>

<template>
  <!-- flex-1 + mt-auto on the footer: pagination stays at the bottom of the card when the card is stretched. -->
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="toolbar items-center">
      <label class="flex items-center gap-2 text-sm text-slate-700">
        期間
        <select
          :value="store.days"
          class="form-control h-8 w-auto pr-8"
          @change="store.setDays(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="d in dayOptions" :key="d" :value="d">最近 {{ d }} 天</option>
        </select>
      </label>
      <button
        v-if="!readOnly && editing === null"
        type="button"
        class="btn btn-primary btn-sm"
        @click="openForm('new')"
      >
        新增量測
      </button>
    </div>

    <div v-if="readOnly" class="px-4 pt-4">
      <p class="alert-info">此病人已停用，量測紀錄只能查看。重新啟用後才能新增、編輯或刪除。</p>
    </div>

    <VitalForm
      v-if="editing !== null"
      :key="editing === 'new' ? 'new' : editing.vitalId"
      :initial="editing === 'new' ? null : editing"
      :saving="store.saving"
      :error="store.saveError"
      @submit="save"
      @cancel="editing = null"
    />

    <div v-if="store.error" class="px-4 pt-4">
      <p class="alert-error" role="alert">{{ store.error }}</p>
    </div>

    <p v-if="store.loading && store.items.length === 0" class="empty-state" role="status">載入中…</p>

    <div v-else-if="store.items.length === 0 && !store.error" class="empty-state">
      <p class="empty-state-title">這段期間沒有量測紀錄</p>
      <p v-if="!readOnly">可以改選較長的期間，或新增一筆量測。</p>
      <button
        v-if="!readOnly && editing === null"
        type="button"
        class="btn btn-secondary btn-sm mt-2"
        @click="openForm('new')"
      >
        新增量測
      </button>
    </div>

    <div v-else-if="store.items.length > 0" class="overflow-x-auto" :class="{ 'opacity-60': store.loading }">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">量測時間</th>
            <th scope="col" class="num">血壓<span class="unit">mmHg</span></th>
            <th scope="col" class="num">心跳<span class="unit">次/分</span></th>
            <th scope="col" class="num">血糖<span class="unit">mg/dL</span></th>
            <th scope="col" class="num">體重<span class="unit">kg</span></th>
            <th scope="col">備註</th>
            <th v-if="!readOnly" scope="col" class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in store.items" :key="v.vitalId">
            <td class="tabular-nums">{{ fmtTime(v.measuredAt) }}</td>
            <td class="num">{{ show(v.systolicBP) }}/{{ show(v.diastolicBP) }}</td>
            <td class="num">{{ show(v.heartRate) }}</td>
            <td class="num">{{ show(v.bloodSugar) }}</td>
            <td class="num">{{ show(v.bodyWeight) }}</td>
            <td class="max-w-64 min-w-32 whitespace-normal text-slate-600">{{ v.note ?? '' }}</td>
            <td v-if="!readOnly" class="col-actions">
              <div class="inline-flex gap-3">
                <button type="button" class="link-action" @click="openForm(v)">編輯</button>
                <button
                  type="button"
                  :disabled="store.deletingId === v.vitalId"
                  class="link-action-danger"
                  @click="remove(v)"
                >
                  刪除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar
      class="card-footer mt-auto"
      :page="store.page"
      :page-size="store.pageSize"
      :total-count="store.totalCount"
      @update:page="store.setPage"
      @update:page-size="store.setPageSize"
    />
  </div>
</template>
