<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { Department } from '@api-types/clinic-api'
import { api } from '@/api/client'
import AppDialog from '@/components/AppDialog.vue'
import PageHeader from '@/components/PageHeader.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { queryBool } from '@/composables/routeQuery'
import { useListRoute } from '@/composables/useListRoute'
import { useDepartmentsStore } from '@/stores/masterData'
import { useUiStore } from '@/stores/ui'

const store = useDepartmentsStore()
const ui = useUiStore()

const { apply } = useListRoute(store, {
  readFilters: (q) => (store.includeInactive = queryBool(q, 'includeInactive')),
  writeFilters: () => ({ includeInactive: store.includeInactive }),
})

function toggleInactive(e: Event) {
  store.includeInactive = (e.target as HTMLInputElement).checked
  apply({ page: 1 })
}

// ---- Create / edit dialog ----
const dialogOpen = ref(false)
const editing = ref<Department | null>(null)
const form = reactive({ deptCode: '', deptName: '' })
const saving = ref(false)
const saveError = ref('')

function openDialog(d: Department | null) {
  editing.value = d
  form.deptCode = d?.deptCode ?? ''
  form.deptName = d?.deptName ?? ''
  saveError.value = ''
  dialogOpen.value = true
}

async function save() {
  saveError.value = ''
  saving.value = true
  const input = { deptCode: form.deptCode.trim().toUpperCase(), deptName: form.deptName.trim() }
  try {
    if (editing.value) {
      await api.updateDepartment(editing.value.deptId, { ...input, rowVersion: editing.value.rowVersion })
      ui.showToast('已儲存科別')
    } else {
      await api.createDepartment(input)
      ui.showToast('已新增科別')
    }
    dialogOpen.value = false
    store.departmentsChanged()
    await store.load()
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : '儲存失敗'
  } finally {
    saving.value = false
  }
}

// ---- Status ----
const busyId = ref<number | null>(null)

async function toggleStatus(d: Department) {
  const activate = !d.isActive
  const ok = await ui.confirm(
    activate
      ? { title: '啟用科別', message: `確定重新啟用「${d.deptName}」？`, confirmText: '啟用' }
      : {
          title: '停用科別',
          message: `確定停用「${d.deptName}」？科內還有啟用中的醫師時無法停用。`,
          confirmText: '停用',
          danger: true,
        },
  )
  if (!ok) return
  busyId.value = d.deptId
  try {
    await api.setDepartmentStatus(d.deptId, activate)
    ui.showToast(activate ? '已啟用科別' : '已停用科別')
    store.departmentsChanged()
    await store.load()
  } catch (e) {
    ui.showToast(e instanceof Error ? e.message : '操作失敗', 'error')
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <PageHeader title="科別" description="維護科別代碼與名稱。科內還有啟用中的醫師時不能停用。">
    <template #actions>
      <button type="button" class="btn btn-primary" @click="openDialog(null)">新增科別</button>
    </template>
  </PageHeader>

  <section class="card flex flex-col" aria-label="科別清單">
    <div class="toolbar justify-start">
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
      <p class="empty-state-title">還沒有科別資料</p>
      <p>新增科別後才能新增醫師。</p>
      <button type="button" class="btn btn-secondary btn-sm mt-2" @click="openDialog(null)">新增科別</button>
    </div>

    <div v-else-if="store.items.length > 0" class="overflow-x-auto" :class="{ 'opacity-60': store.loading }">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">代碼</th>
            <th scope="col">名稱</th>
            <th scope="col">狀態</th>
            <th scope="col" class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in store.items" :key="d.deptId">
            <td class="font-mono text-slate-600">{{ d.deptCode }}</td>
            <td>{{ d.deptName }}</td>
            <td><StatusBadge :active="d.isActive" /></td>
            <td class="col-actions">
              <div class="inline-flex gap-3">
                <button type="button" class="link-action" @click="openDialog(d)">編輯</button>
                <button
                  type="button"
                  :disabled="busyId === d.deptId"
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

  <AppDialog :open="dialogOpen" :title="editing ? '編輯科別' : '新增科別'" @close="dialogOpen = false">
    <form class="space-y-4" @submit.prevent="save">
      <div>
        <label for="dept-code" class="form-label">代碼<span class="required-mark" aria-hidden="true">*</span><span class="sr-only">（必填）</span></label>
        <input
          id="dept-code"
          v-model="form.deptCode"
          required
          minlength="2"
          maxlength="10"
          pattern="[A-Za-z0-9]{2,10}"
          title="2 到 10 個英文字母或數字"
          autocomplete="off"
          aria-describedby="dept-code-hint"
          class="form-control font-mono uppercase"
        />
        <p id="dept-code-hint" class="form-hint">2 到 10 個英文字母或數字，儲存時轉成大寫。</p>
      </div>
      <div>
        <label for="dept-name" class="form-label">名稱<span class="required-mark" aria-hidden="true">*</span><span class="sr-only">（必填）</span></label>
        <input id="dept-name" v-model="form.deptName" required maxlength="50" autocomplete="off" class="form-control" />
      </div>
      <p v-if="saveError" class="alert-error" role="alert">{{ saveError }}</p>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" class="btn btn-secondary" @click="dialogOpen = false">取消</button>
        <button type="submit" :disabled="saving" class="btn btn-primary">{{ saving ? '儲存中…' : '儲存' }}</button>
      </div>
    </form>
  </AppDialog>
</template>
