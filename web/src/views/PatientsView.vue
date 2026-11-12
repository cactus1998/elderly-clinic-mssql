<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import type { Gender } from '@api-types/clinic-api'
import PageHeader from '@/components/PageHeader.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { queryBool } from '@/composables/routeQuery'
import { useListRoute } from '@/composables/useListRoute'
import { usePatientsStore } from '@/stores/masterData'

const store = usePatientsStore()

const { apply } = useListRoute(store, {
  readFilters: (q) => (store.includeInactive = queryBool(q, 'includeInactive')),
  writeFilters: () => ({ includeInactive: store.includeInactive }),
})

// Keyword lives only in the store (personal data must not go into the URL).
// Search 300 ms after the user stops typing, from page 1.
const keywordInput = ref(store.keyword)
let timer: ReturnType<typeof setTimeout> | undefined
function onKeyword() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    store.keyword = keywordInput.value
    apply({ page: 1 })
  }, 300)
}
onBeforeUnmount(() => clearTimeout(timer))

function toggleInactive(e: Event) {
  store.includeInactive = (e.target as HTMLInputElement).checked
  apply({ page: 1 })
}

const genderLabel: Record<Gender, string> = { M: '男', F: '女' }

function age(birthDate: string): number {
  const [y, m, d] = birthDate.slice(0, 10).split('-').map(Number) as [number, number, number]
  const now = new Date()
  const hadBirthday = now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d)
  return now.getFullYear() - y - (hadBirthday ? 0 : 1)
}
</script>

<template>
  <PageHeader title="病人" description="以病歷號或姓名查詢病人，點選後可編輯資料與管理生命徵象。">
    <template #actions>
      <RouterLink to="/patients/new" class="btn btn-primary">新增病人</RouterLink>
    </template>
  </PageHeader>

  <section class="card flex flex-col" aria-label="病人清單">
    <div class="toolbar justify-start">
      <div class="w-64 max-w-full">
        <label for="patient-keyword" class="form-label">搜尋</label>
        <input
          id="patient-keyword"
          v-model="keywordInput"
          type="search"
          maxlength="50"
          placeholder="病歷號開頭或姓名"
          autocomplete="off"
          class="form-control"
          @input="onKeyword"
        />
      </div>
      <label class="flex h-9 items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" class="size-4 accent-sky-700" :checked="store.includeInactive" @change="toggleInactive" />
        包含停用
      </label>
    </div>

    <div v-if="store.error" class="px-4 pt-4">
      <p class="alert-error flex flex-wrap items-center justify-between gap-2" role="alert">
        {{ store.error }}
        <button type="button" class="link-action-danger" @click="store.load()">重試</button>
      </p>
    </div>

    <p v-if="store.loading && !store.loaded" class="empty-state" role="status">載入中…</p>

    <div v-else-if="store.loaded && store.totalCount === 0 && !store.error" class="empty-state">
      <template v-if="store.keyword.trim()">
        <p class="empty-state-title">找不到符合「{{ store.keyword.trim() }}」的病人</p>
        <p>請確認病歷號或姓名，或新增這位病人。</p>
      </template>
      <template v-else>
        <p class="empty-state-title">還沒有病人資料</p>
        <p>新增第一位病人後就會顯示在這裡。</p>
      </template>
      <RouterLink to="/patients/new" class="btn btn-secondary btn-sm mt-2">新增病人</RouterLink>
    </div>

    <div v-else-if="store.items.length > 0" class="overflow-x-auto" :class="{ 'opacity-60': store.loading }">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">病歷號</th>
            <th scope="col">姓名</th>
            <th scope="col">性別</th>
            <th scope="col" class="num">年齡</th>
            <th scope="col">電話</th>
            <th scope="col">狀態</th>
            <th scope="col" class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in store.items" :key="p.patientId">
            <td class="font-mono text-slate-600">{{ p.chartNo }}</td>
            <td>
              <RouterLink :to="`/patients/${p.patientId}`" class="link-action">{{ p.patientName }}</RouterLink>
            </td>
            <td>{{ genderLabel[p.gender] }}</td>
            <td class="num">{{ age(p.birthDate) }}</td>
            <td class="tabular-nums text-slate-600">{{ p.phone ?? '—' }}</td>
            <td><StatusBadge :active="p.isActive" /></td>
            <td class="col-actions">
              <RouterLink :to="`/patients/${p.patientId}`" class="link-action">查看</RouterLink>
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
      @update:page="(p) => apply({ page: p })"
      @update:page-size="(s) => apply({ pageSize: s })"
    />
  </section>
</template>
