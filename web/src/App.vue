<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div v-if="auth.checking" class="flex min-h-screen items-center justify-center text-sm text-slate-500" role="status">
    確認登入狀態…
  </div>
  <RouterView v-else />
</template>
