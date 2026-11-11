<script setup lang="ts">
import { onMounted } from 'vue'
import ClinicList from '@/components/ClinicList.vue'
import LoginForm from '@/components/LoginForm.vue'
import VitalsPanel from '@/components/VitalsPanel.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

onMounted(auth.restore)
</script>

<template>
  <div v-if="auth.checking" class="flex min-h-screen items-center justify-center bg-slate-100 text-slate-400">
    確認登入狀態…
  </div>

  <LoginForm v-else-if="!auth.isLoggedIn" />

  <div v-else class="min-h-screen bg-slate-100 text-slate-800">
    <header class="flex items-center justify-between bg-sky-700 px-6 py-3 text-white">
      <h1 class="text-lg font-semibold">樂齡門診掛號與健康追蹤</h1>
      <div class="flex items-center gap-3 text-sm">
        <span>{{ auth.user?.displayName }}</span>
        <button class="rounded border border-white/60 px-3 py-1 hover:bg-white/10" @click="auth.logout">
          登出
        </button>
      </div>
    </header>
    <main class="grid gap-4 p-4 lg:grid-cols-[3fr_2fr]">
      <ClinicList />
      <VitalsPanel />
    </main>
  </div>
</template>
