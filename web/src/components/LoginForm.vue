<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const username = ref('')
const password = ref('')

async function submit() {
  await auth.login(username.value.trim(), password.value)
  // Never keep the password in memory longer than needed.
  password.value = ''
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4">
    <form class="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm" @submit.prevent="submit">
      <h1 class="mb-1 text-lg font-semibold text-slate-800">樂齡門診掛號與健康追蹤</h1>
      <p class="mb-5 text-sm text-slate-500">請登入後使用</p>

      <label class="mb-3 flex flex-col text-sm text-slate-600">
        帳號
        <input
          v-model="username"
          autocomplete="username"
          required
          maxlength="50"
          class="mt-1 rounded border px-2 py-1.5"
        />
      </label>
      <label class="mb-4 flex flex-col text-sm text-slate-600">
        密碼
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          maxlength="100"
          class="mt-1 rounded border px-2 py-1.5"
        />
      </label>

      <p v-if="auth.error" class="mb-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
        {{ auth.error }}
      </p>

      <button
        type="submit"
        :disabled="auth.loggingIn"
        class="w-full rounded bg-sky-600 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {{ auth.loggingIn ? '登入中…' : '登入' }}
      </button>
    </form>
  </div>
</template>
