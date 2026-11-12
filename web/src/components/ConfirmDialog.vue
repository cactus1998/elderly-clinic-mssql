<script setup lang="ts">
import { computed } from 'vue'
import AppDialog from '@/components/AppDialog.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const state = computed(() => ui.confirmState)
</script>

<template>
  <AppDialog :open="state !== null" :title="state?.title ?? ''" @close="ui.closeConfirm(false)">
    <template v-if="state">
      <p class="text-sm text-slate-600">{{ state.message }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <!-- autofocus: Enter on open cancels instead of confirming a destructive action -->
        <button type="button" autofocus class="btn btn-secondary" @click="ui.closeConfirm(false)">取消</button>
        <button
          type="button"
          class="btn"
          :class="state.danger ? 'btn-danger' : 'btn-primary'"
          @click="ui.closeConfirm(true)"
        >
          {{ state.confirmText ?? '確定' }}
        </button>
      </div>
    </template>
  </AppDialog>
</template>
