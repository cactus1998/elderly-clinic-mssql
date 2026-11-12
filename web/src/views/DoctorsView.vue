<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { Doctor } from '@api-types/clinic-api'
import { api } from '@/api/client'
import AppDialog from '@/components/AppDialog.vue'
import PageHeader from '@/components/PageHeader.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { queryBool, queryInt } from '@/composables/routeQuery'
import { useListRoute } from '@/composables/useListRoute'
import { useDepartmentsStore, useDoctorsStore } from '@/stores/masterData'
import { useUiStore } from '@/stores/ui'

const store = useDoctorsStore()
const departments = useDepartmentsStore()
const ui = useUiStore()

const optionsError = ref('')
onMounted(async () => {
  if (departments.options.length > 0) return
  try {
    await departments.loadOptions()
  } catch (e) {
    optionsError.value = e instanceof Error ? e.message : '科別載入失敗'
  }
})

const { apply } = useListRoute(store, {
  readFilters: (q) => {
    store.deptId = queryInt(q, 'deptId', null)
    store.includeInactive = queryBool(q, 'includeInactive')
  },
  writeFilters: () => ({ deptId: store.deptId, includeInactive: store.includeInactive }),
})

function changeDept(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  store.deptId = v ? Number(v) : null
  apply({ page: 1 })
}

function toggleInactive(e: Event) {
  store.includeInactive = (e.target as HTMLInputElement).checked
  apply({ page: 1 })
}

const filterDeptName = computed(() => departments.options.find((d) => d.deptId === store.deptId)?.deptName)

// ---- Create / edit dialog ----
const dialogOpen = ref(false)
const editing = ref<Doctor | null>(null)
const form = reactive({ deptId: null as number | null, doctorName: '', title: '主治醫師' })
const saving = ref(false)
const saveError = ref('')

// New doctors can only join active departments; when editing, keep the current department selectable.
const deptChoices = computed(() =>
  departments.options.filter((d) => d.isActive || d.deptId === editing.value?.deptId),
)

function openDialog(d: Doctor | null) {
  editing.value = d
  form.deptId = d?.deptId ?? store.deptId ?? null
  if (!d && form.deptId !== null && !departments.options.find((x) => x.deptId === form.deptId)?.isActive) {
    form.deptId = null
  }
  form.doctorName = d?.doctorName ?? ''
  form.title = d?.title ?? '主治醫師'
  saveError.value = ''
  dialogOpen.value = true
}

async function save() {
  if (form.deptId === null) {
    saveError.value = '請選擇科別。'
    return
  }
  saveError.value = ''
  saving.value = true
  const input = { deptId: form.deptId, doctorName: form.doctorName.trim(), title: form.title.trim() }
  try {
    if (editing.value) {
      await api.updateDoctor(editing.value.doctorId, { ...input, rowVersion: editing.value.rowVersion })
      ui.showToast('已儲存醫師')
    } else {
      await api.createDoctor(input)
      ui.showToast('已新增醫師')
    }
    dialogOpen.value = false
    await store.load()
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : '儲存失敗'
  } finally {
    saving.value = false
  }
}

// ---- Status ----
const busyId = ref<number | null>(null)

async function toggleStatus(d: Doctor) {
  const activate = !d.isActive
  const ok = await ui.confirm(
    activate
      ? { title: '啟用醫師', message: `確定重新啟用 ${d.doctorName} 醫師？`, confirmText: '啟用' }
      : {
          title: '停用醫師',
          message: `確定停用 ${d.doctorName} 醫師？今天以後還有預約掛號時無法停用。`,
          confirmText: '停用',
          danger: true,
        },
  )
  if (!ok) return
  busyId.value = d.doctorId
  try {
    await api.setDoctorStatus(d.doctorId, activate)
    ui.showToast(activate ? '已啟用醫師' : '已停用醫師')
    await store.load()
  } catch (e) {
    ui.showToast(e instanceof Error ? e.message : '操作失敗', 'error')
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <PageHeader title="醫師" description="維護醫師資料。今天以後還有預約掛號的醫師不能停用。">
    <template #actions>
      <button type="button" class="btn btn-primary" @click="openDialog(null)">新增醫師</button>
    </template>
  </PageHeader>

  <section class="card flex flex-col" aria-label="醫師清單">
    <div class="toolbar justify-start">
      <div>
        <label for="doctor-dept" class="form-label">科別</label>
        <select id="doctor-dept" :value="store.deptId ?? ''" class="form-control w-44" @change="changeDept">
          <option value="">全部科別</option>
          <option v-for="d in departments.options" :key="d.deptId" :value="d.deptId">
            {{ d.deptName }}{{ d.isActive ? '' : '（停用）' }}
          </option>
        </select>
      </div>
      <label class="flex h-9 items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" class="size-4 accent-sky-700" :checked="store.includeInactive" @change="toggleInactive" />
        包含停用
      </label>
    </div>

    <div v-if="optionsError" class="px-4 pt-4">
      <p class="alert-error" role="alert">{{ optionsError }}</p>
    </div>
    <div v-if="store.error" class="px-4 pt-4">
      <p class="alert-error flex flex-wrap items-center justify-between gap-2" role="alert">
        {{ store.error }}
        <button type="button" class="link-action-danger" @click="store.load()">重試</button>
      </p>
    </div>

    <p v-if="store.loading && !store.loaded" class="empty-state" role="status">載入中…</p>

    <div v-else-if="store.loaded && store.totalCount === 0 && !store.error" class="empty-state">
      <template v-if="filterDeptName">
        <p class="empty-state-title">「{{ filterDeptName }}」目前沒有醫師</p>
        <p>可以改選其他科別，或新增醫師。</p>
      </template>
      <template v-else>
        <p class="empty-state-title">還沒有醫師資料</p>
        <p>新增醫師後就會顯示在這裡。</p>
      </template>
      <button type="button" class="btn btn-secondary btn-sm mt-2" @click="openDialog(null)">新增醫師</button>
    </div>

    <div v-else-if="store.items.length > 0" class="overflow-x-auto" :class="{ 'opacity-60': store.loading }">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">姓名</th>
            <th scope="col">職稱</th>
            <th scope="col">科別</th>
            <th scope="col">狀態</th>
            <th scope="col" class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in store.items" :key="d.doctorId">
            <td>{{ d.doctorName }}</td>
            <td>{{ d.title }}</td>
            <td>{{ d.deptName }}</td>
            <td><StatusBadge :active="d.isActive" /></td>
            <td class="col-actions">
              <div class="inline-flex gap-3">
                <button type="button" class="link-action" @click="openDialog(d)">編輯</button>
                <button
                  type="button"
                  :disabled="busyId === d.doctorId"
                  :class="d.isActive ? 'link-action-danger' : 'link-action'"
                  @click="toggleStatus(d)"
                >
                  {{ d.isActive ? '停用' : '啟用' }}
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
      @update:page="(p) => apply({ page: p })"
      @update:page-size="(s) => apply({ pageSize: s })"
    />
  </section>

  <AppDialog :open="dialogOpen" :title="editing ? '編輯醫師' : '新增醫師'" @close="dialogOpen = false">
    <form class="space-y-4" @submit.prevent="save">
      <div>
        <label for="doc-dept" class="form-label">科別<span class="required-mark" aria-hidden="true">*</span><span class="sr-only">（必填）</span></label>
        <select id="doc-dept" v-model="form.deptId" required class="form-control">
          <option :value="null" disabled>請選擇科別</option>
          <option v-for="d in deptChoices" :key="d.deptId" :value="d.deptId">
            {{ d.deptName }}{{ d.isActive ? '' : '（停用）' }}
          </option>
        </select>
        <p class="form-hint">只能選擇啟用中的科別。</p>
      </div>
      <div>
        <label for="doc-name" class="form-label">姓名<span class="required-mark" aria-hidden="true">*</span><span class="sr-only">（必填）</span></label>
        <input id="doc-name" v-model="form.doctorName" required maxlength="50" autocomplete="off" class="form-control" />
      </div>
      <div>
        <label for="doc-title" class="form-label">職稱<span class="required-mark" aria-hidden="true">*</span><span class="sr-only">（必填）</span></label>
        <input id="doc-title" v-model="form.title" required maxlength="20" autocomplete="off" class="form-control" />
      </div>
      <p v-if="saveError" class="alert-error" role="alert">{{ saveError }}</p>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" class="btn btn-secondary" @click="dialogOpen = false">取消</button>
        <button type="submit" :disabled="saving" class="btn btn-primary">{{ saving ? '儲存中…' : '儲存' }}</button>
      </div>
    </form>
  </AppDialog>
</template>
