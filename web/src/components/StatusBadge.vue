<script setup lang="ts">
const { active } = defineProps<{ active: boolean }>()
</script>

<template>
  <span class="badge" :class="active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-600 ring-slate-500/20'">
    {{ active ? '啟用' : '停用' }}
  </span>
</template>
